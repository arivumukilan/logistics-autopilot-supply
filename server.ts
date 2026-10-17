import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './server/db.ts';
import {
  runIntakeAgent,
  runApprovalAgent,
  runDispatchAgent,
  runTrackerAgent,
  runChaserAgent,
  runMultimodalDamageInspection,
  runInsightAgent,
} from './server/agents/logisticsAgents.ts';
import { mcpRegistry } from './server/mcpRegistry.ts';
import { generateGeminiContent } from './server/gemini.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  // --- API ROUTES ---

  // 1. System state
  app.get('/api/state', (req, res) => {
    res.json({
      suppliers: db.suppliers,
      purchaseOrders: db.purchaseOrders,
      stepLogs: db.stepLogs.slice(0, 50),
      emails: db.emails.slice(0, 30),
      policy: db.policy,
      stats: db.stats,
    });
  });

  // 2. Intake Agent: Voice or raw text intake
  app.post('/api/intake', async (req, res) => {
    try {
      const { rawText, handlerName } = req.body;
      if (!rawText || typeof rawText !== 'string') {
        return res.status(400).json({ error: 'rawText is required' });
      }

      // 1. Run Intake Agent (Language model extracts item, qty, value, date)
      const po = await runIntakeAgent(rawText, handlerName || 'Ravi (Logistics Staff)');

      // 2. Run Approval Agent (Deterministic rule check)
      const evaluatedPo = await runApprovalAgent(po.id);

      db.stats.totalOrdersProcessed += 1;
      res.json({ success: true, purchaseOrder: evaluatedPo });
    } catch (err: any) {
      console.error('Error in /api/intake:', err);
      res.status(500).json({ error: err.message || 'Intake failed' });
    }
  });

  // 3. Manager Approval Action (Meena)
  app.post('/api/approval/action', async (req, res) => {
    try {
      const { poId, action, notes } = req.body;
      const po = db.purchaseOrders.find((p) => p.id === poId);
      if (!po) return res.status(404).json({ error: 'PO not found' });

      const now = new Date().toISOString();

      if (action === 'APPROVE') {
        po.status = 'APPROVED';
        po.approvedAt = now;
        po.approvedBy = 'MEENA_MANAGER';
        po.approvalReason = notes || 'Manager Meena approved exception request.';

        db.stepLogs.unshift({
          id: `log-${Date.now()}`,
          poId: po.id,
          step: 'APPROVED',
          actor: 'MEENA_MANAGER',
          message: `Manager Meena approved ${po.id}. Note: ${po.approvalReason}`,
          timestamp: now,
        });

        // Trigger automatic dispatch
        await runDispatchAgent(po.id);
      } else if (action === 'REJECT') {
        po.status = 'REJECTED';
        po.finalResolution = 'REJECTED_BY_MANAGER';
        po.rejectionReason = notes || 'Manager Meena rejected the procurement requisition.';
        po.approvalReason = po.rejectionReason;

        db.stepLogs.unshift({
          id: `log-${Date.now()}`,
          poId: po.id,
          step: 'REJECTED',
          actor: 'MEENA_MANAGER',
          message: `Manager Meena rejected ${po.id}: ${notes || 'Requisition denied.'}`,
          timestamp: now,
        });
      } else {
        return res.status(400).json({ error: 'Invalid action. Must be APPROVE or REJECT.' });
      }

      res.json({ success: true, purchaseOrder: po });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Supplier Portal Actions (Confirm, Ship, Upload Invoice, Reject)
  app.post('/api/supplier/action', async (req, res) => {
    try {
      const { poId, action, trackingNumber, promisedDate, invoiceAmount, invoiceRef, notes } = req.body;
      const po = db.purchaseOrders.find((p) => p.id === poId);
      if (!po) return res.status(404).json({ error: 'PO not found' });

      const now = new Date().toISOString();
      const supplier = db.suppliers.find((s) => s.id === po.supplierId);

      if (action === 'CONFIRM') {
        po.status = 'CONFIRMED';
        po.confirmedAt = now;
        po.promisedDate = promisedDate || 'In 2 business days';

        db.stepLogs.unshift({
          id: `log-${Date.now()}`,
          poId: po.id,
          step: 'CONFIRMED',
          actor: 'SUNRISE_SUPPLIER',
          message: `${supplier?.name || 'Supplier'} confirmed acceptance of ${po.id}. Promised: ${po.promisedDate}`,
          timestamp: now,
        });
      } else if (action === 'SHIP') {
        po.status = 'SHIPPED';
        po.shippedAt = now;
        po.trackingNumber = trackingNumber || `TRK-${Math.floor(100000 + Math.random() * 900000)}`;

        db.stepLogs.unshift({
          id: `log-${Date.now()}`,
          poId: po.id,
          step: 'SHIPPED',
          actor: 'SUNRISE_SUPPLIER',
          message: `${supplier?.name || 'Supplier'} dispatched shipment. Tracking: ${po.trackingNumber}`,
          timestamp: now,
        });
      } else if (action === 'UPLOAD_INVOICE') {
        po.documents.invoiceUploaded = true;
        po.documents.invoiceTimestamp = now;
        po.documents.invoiceAmount = invoiceAmount || po.estimatedValue;
        po.documents.invoiceRef = invoiceRef || `INV-${Math.floor(1000 + Math.random() * 9000)}`;

        db.stepLogs.unshift({
          id: `log-${Date.now()}`,
          poId: po.id,
          step: po.documents.receiptUploaded ? 'DOCS_COMPLETE' : 'INSPECTED',
          actor: 'SUNRISE_SUPPLIER',
          message: `Commercial Invoice uploaded (${po.documents.invoiceRef}, $${po.documents.invoiceAmount}).`,
          timestamp: now,
        });

        // If goods were received and receipt is present, update docs status!
        if (po.status === 'RECEIVED' && po.documents.receiptUploaded) {
          po.status = 'DOCS_COMPLETE';
          po.isFlaggedIdle = false;
          po.idleReason = undefined;
        }
      } else if (action === 'REJECT') {
        po.status = 'REJECTED';
        po.finalResolution = 'REJECTED_BY_SUPPLIER';
        po.rejectionReason = notes || req.body.message || 'Supplier capacity constraint / temporary inventory outage.';
        po.approvalReason = po.rejectionReason;

        // Inbound rejection notice email
        db.emails.unshift({
          id: `em-${Date.now()}-rej`,
          poId: po.id,
          direction: 'INBOUND',
          from: supplier?.email || 'vendor@supply.com',
          to: 'autopilot@freshmart.com',
          subject: `ORDER DECLINED: ${po.id} - ${po.rejectionReason}`,
          body: `Dear FreshMart Logistics,\n\nWe cannot accept Purchase Order ${po.id} due to ${po.rejectionReason}.\n\nPlease trigger automated failover rerouting to an alternate supplier.\n\n${supplier?.name} Dispatch Desk`,
          timestamp: now,
          type: 'CONFIRMATION',
        });

        db.stepLogs.unshift({
          id: `log-${Date.now()}`,
          poId: po.id,
          step: 'REJECTED',
          actor: 'SUNRISE_SUPPLIER',
          message: `${supplier?.name || 'Supplier'} declined order: ${po.rejectionReason}`,
          timestamp: now,
        });
      }

      res.json({ success: true, purchaseOrder: po });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4b. Autonomous Failover Reroute for Rejected Orders
  app.post('/api/po/reroute', async (req, res) => {
    try {
      const { poId } = req.body;
      const po = db.purchaseOrders.find((p) => p.id === poId);
      if (!po) return res.status(404).json({ error: 'PO not found' });

      // Find alternate supplier with score >= minimum
      const currentSupplierId = po.supplierId;
      const alternate = db.suppliers.find(
        (s) => s.id !== currentSupplierId && s.itemCategory === 'Rice & Grains' && s.score >= db.policy.minimumSupplierScore
      ) || db.suppliers.find((s) => s.id !== currentSupplierId && s.score >= db.policy.minimumSupplierScore) || db.suppliers[1];

      po.supplierId = alternate.id;
      po.supplierName = alternate.name;
      po.status = 'APPROVED';
      po.finalResolution = undefined;
      po.rejectionReason = undefined;
      po.isFlaggedIdle = false;
      po.idleReason = undefined;

      const now = new Date().toISOString();
      db.stepLogs.unshift({
        id: `log-${Date.now()}-reroute`,
        poId: po.id,
        step: 'APPROVED',
        actor: 'SELF_HEALING_AGENT',
        message: `⚡ FAILOVER REROUTED: Order ${po.id} re-assigned to alternate qualified supplier ${alternate.name} (Score: ${alternate.score}/10).`,
        timestamp: now,
      });

      // Dispatch to new supplier
      await runDispatchAgent(po.id);

      res.json({ success: true, purchaseOrder: po });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Receiving Dock & Receipt upload (Ravi)
  app.post('/api/delivery/receive', async (req, res) => {
    try {
      const { poId, receiptRef } = req.body;
      const po = db.purchaseOrders.find((p) => p.id === poId);
      if (!po) return res.status(404).json({ error: 'PO not found' });

      const now = new Date().toISOString();
      po.status = 'RECEIVED';
      po.receivedAt = now;
      po.documents.receiptUploaded = true;
      po.documents.receiptTimestamp = now;
      po.documents.receiptRef = receiptRef || `GRN-FM-${Math.floor(1000 + Math.random() * 9000)}`;

      db.stepLogs.unshift({
        id: `log-${Date.now()}`,
        poId: po.id,
        step: 'RECEIVED',
        actor: 'RAVI_HANDLER',
        message: `Ravi verified cargo arrival at Central Dock. Goods Receipt Note: ${po.documents.receiptRef}.`,
        timestamp: now,
      });

      // Check if invoice already exists
      if (po.documents.invoiceUploaded) {
        po.status = 'DOCS_COMPLETE';
      } else {
        po.isFlaggedIdle = true;
        po.idleReason = 'Missing Commercial Invoice. Order cannot be closed.';
      }

      res.json({ success: true, purchaseOrder: po });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Multimodal Inspection (Photo + Damaged Goods count)
  app.post('/api/delivery/inspect', async (req, res) => {
    try {
      const { poId, damagedBagsCount, damageNotes, imageBase64 } = req.body;
      const result = await runMultimodalDamageInspection({
        poId,
        damagedBagsCount: Number(damagedBagsCount) || 0,
        damageNotes,
        imageBase64,
      });

      const updatedPo = db.purchaseOrders.find((p) => p.id === poId);
      res.json({ success: true, inspectionResult: result, purchaseOrder: updatedPo });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Complete Flow Guarantee: Order Closure
  app.post('/api/po/close', (req, res) => {
    const { poId } = req.body;
    const po = db.purchaseOrders.find((p) => p.id === poId);
    if (!po) return res.status(404).json({ error: 'PO not found' });

    // Strict Enforcement of Complete Flow: Receipt AND Invoice must exist!
    if (!po.documents.receiptUploaded || !po.documents.invoiceUploaded) {
      return res.status(400).json({
        error: `Incomplete documentation. Closure blocked. Receipt present: ${po.documents.receiptUploaded}, Invoice present: ${po.documents.invoiceUploaded}`,
      });
    }

    const now = new Date().toISOString();
    po.status = 'CLOSED';
    po.closedAt = now;
    po.isFlaggedIdle = false;
    po.idleReason = undefined;
    po.finalResolution = (po.damagedQty && po.damagedQty > 0)
      ? 'FULFILLED_WITH_DAMAGE_CLAIM'
      : 'FULFILLED_PERFECT';

    const closureMsg = (po.damagedQty && po.damagedQty > 0)
      ? `Complete Flow Verified: PO ${po.id} finalized with debit memo adjustment (${po.damagedQty} units damaged). Receipt (${po.documents.receiptRef}) & Invoice (${po.documents.invoiceRef}) verified.`
      : `Complete Flow Verified: PO ${po.id} matched with Goods Receipt (${po.documents.receiptRef}) & Invoice (${po.documents.invoiceRef}). Order successfully closed.`;

    db.stepLogs.unshift({
      id: `log-${Date.now()}`,
      poId: po.id,
      step: 'CLOSED',
      actor: 'APPROVAL_AGENT',
      message: closureMsg,
      timestamp: now,
    });

    res.json({ success: true, purchaseOrder: po });
  });

  // 8. Scheduler Tick (runs Tracker & Chaser)
  app.post('/api/scheduler/tick', (req, res) => {
    const trackerResult = runTrackerAgent();
    const chaserResult = runChaserAgent();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      tracker: trackerResult,
      chaser: chaserResult,
    });
  });

  // 9. Policy Update (Meena)
  app.post('/api/policy/update', (req, res) => {
    const { autoApprovalValueLimit, minimumSupplierScore, chaseIntervalHours } = req.body;
    if (autoApprovalValueLimit !== undefined) db.policy.autoApprovalValueLimit = Number(autoApprovalValueLimit);
    if (minimumSupplierScore !== undefined) db.policy.minimumSupplierScore = Number(minimumSupplierScore);
    if (chaseIntervalHours !== undefined) db.policy.chaseIntervalHours = Number(chaseIntervalHours);

    db.stepLogs.unshift({
      id: `log-${Date.now()}`,
      poId: 'POLICY',
      step: 'POLICY_EVAL',
      actor: 'MEENA_MANAGER',
      message: `Policy updated: Limit $${db.policy.autoApprovalValueLimit}, Min Score ${db.policy.minimumSupplierScore}/10.`,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, policy: db.policy });
  });

  // 10. AI Insight Briefing
  app.get('/api/insights', async (req, res) => {
    try {
      const summary = await runInsightAgent();
      res.json({ success: true, summary });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. MCP Protocol Tools
  app.get('/api/mcp/tools', (req, res) => {
    res.json({
      protocolVersion: '2024-11-05',
      server: 'FreshMart-Autopilot-MCP',
      tools: mcpRegistry.getToolDeclarations(),
    });
  });

  app.post('/api/mcp/execute', async (req, res) => {
    try {
      const { name, arguments: toolArgs } = req.body;
      const result = await mcpRegistry.executeTool(name, toolArgs || {});
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 12. Conversational Voice & Text Copilot
  app.post('/api/copilot/chat', async (req, res) => {
    try {
      const { message } = req.body;
      const activeCount = db.purchaseOrders.filter((p) => p.status !== 'CLOSED' && p.status !== 'REJECTED').length;
      const stuckCount = db.purchaseOrders.filter((p) => p.isFlaggedIdle).length;

      const prompt = `You are FreshMart Autopilot, an intelligent supply chain assistant for Ravi (Logistics Handler) and Meena (Manager).
Context:
- Current active POs: ${activeCount}
- Flagged/Stalled POs: ${stuckCount}
- Top Supplier for Rice: Golden Grain Corp (Score 9.3)
- Incumbent Supplier for Rice: Sunrise Rice Co. (Score 8.2, recently flagged for damaged bags)
- Policy limit: $${db.policy.autoApprovalValueLimit}
User question: "${message}"

Provide a concise, helpful, and direct logistics response (2-3 sentences max). Suggest specific actions if relevant.`;

      const aiReply = await generateGeminiContent({ contents: prompt });
      const reply = aiReply || `I am monitoring ${activeCount} active purchase orders. Sunrise Rice Co. was recently flagged for torn packaging on PO-105, lowering their score to 8.2. Next grain orders will automatically route to Golden Grain Corp (score 9.3).`;

      res.json({ success: true, reply });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 13. Reset seed
  app.post('/api/reset', (req, res) => {
    db.seed();
    res.json({ success: true, message: 'Database reset to initial demo seed state' });
  });

  // --- VITE MIDDLEWARE (Dev) / STATIC (Prod) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Logistics Autopilot] Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
