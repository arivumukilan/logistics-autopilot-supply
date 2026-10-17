import { Supplier, PurchaseOrder, StepLog, EmailRecord, PolicyConfig, SystemStats } from '../src/types/logistics.ts';

class LogisticsDatabase {
  public suppliers: Supplier[] = [];
  public purchaseOrders: PurchaseOrder[] = [];
  public stepLogs: StepLog[] = [];
  public emails: EmailRecord[] = [];
  public policy: PolicyConfig = {
    autoApprovalValueLimit: 2500, // Orders <= $2500 auto-approve if score >= 7.0
    minimumSupplierScore: 7.0,
    chaseIntervalHours: 24,
    maxChasesBeforeEscalation: 2,
    requireDualDocForClosure: true,
  };
  public stats: SystemStats = {
    fastestCycleMinutes: 4.2,
    averageCycleHours: 18.5,
    autoApprovalRate: 78.4,
    activeAutonomousAgents: 8,
    selfHealedOrdersCount: 14,
    totalOrdersProcessed: 128,
  };

  constructor() {
    this.seed();
  }

  public seed() {
    this.suppliers = [
      {
        id: 'sup-1',
        name: 'Sunrise Rice Co.',
        email: 'dispatch@sunriserice.com',
        itemCategory: 'Rice & Grains',
        score: 8.2,
        onTimeRate: 0.85,
        damageRate: 0.05,
        leadDays: 2,
        totalOrders: 42,
        status: 'ACTIVE',
        notes: 'Incumbent supplier for standard white and parboiled rice.',
      },
      {
        id: 'sup-2',
        name: 'Golden Grain Corp',
        email: 'orders@goldengrain.io',
        itemCategory: 'Rice & Grains',
        score: 9.3,
        onTimeRate: 0.96,
        damageRate: 0.01,
        leadDays: 1,
        totalOrders: 38,
        status: 'ACTIVE',
        notes: 'High-reliability organic and premium grain supplier. Primary failover.',
      },
      {
        id: 'sup-3',
        name: 'Apex Agri Logistics',
        email: 'supply@apexagri.com',
        itemCategory: 'Wheat & Pulses',
        score: 8.7,
        onTimeRate: 0.90,
        damageRate: 0.02,
        leadDays: 3,
        totalOrders: 29,
        status: 'ACTIVE',
        notes: 'Specialist in bulk flour, lentils, and packaging pulses.',
      },
      {
        id: 'sup-4',
        name: 'Valley Dairy & Provisions',
        email: 'sales@valleydairy.org',
        itemCategory: 'Dairy & Oil',
        score: 9.1,
        onTimeRate: 0.94,
        damageRate: 0.01,
        leadDays: 1,
        totalOrders: 51,
        status: 'ACTIVE',
        notes: 'Cold chain certified, fast turnaround for fresh essentials.',
      },
      {
        id: 'sup-5',
        name: 'Metro Pack & Storage',
        email: 'fulfill@metropack.biz',
        itemCategory: 'Packaging & Bags',
        score: 6.8,
        onTimeRate: 0.72,
        damageRate: 0.08,
        leadDays: 4,
        totalOrders: 19,
        status: 'FLAGGED_REVIEW',
        notes: 'Below minimum score threshold. Requires human manager sign-off.',
      },
    ];

    const now = new Date();
    const isoHoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600000).toISOString();

    this.purchaseOrders = [
      {
        id: 'PO-101',
        requestId: 'REQ-881',
        item: '500 bags of Sona Masoori Rice',
        quantity: 500,
        unit: 'bags (25kg)',
        estimatedValue: 1750,
        neededBy: 'Friday 5:00 PM',
        handlerName: 'Ravi (FreshMart Central Warehouse)',
        supplierId: 'sup-1',
        supplierName: 'Sunrise Rice Co.',
        status: 'ORDERED',
        requestedAt: isoHoursAgo(2),
        approvedAt: isoHoursAgo(1.9),
        approvedBy: 'AUTO_PILOT',
        approvalReason: 'Order value $1,750 <= $2,500 limit and Sunrise score 8.2 >= 7.0 threshold.',
        orderedAt: isoHoursAgo(1.8),
        chaseCount: 0,
        isFlaggedIdle: false,
        documents: {
          receiptUploaded: false,
          invoiceUploaded: false,
        },
      },
      {
        id: 'PO-102',
        requestId: 'REQ-882',
        item: '2,500 bags of Premium Basmati Rice',
        quantity: 2500,
        unit: 'bags (20kg)',
        estimatedValue: 8750,
        neededBy: 'Next Monday',
        handlerName: 'Ravi (FreshMart Central Warehouse)',
        supplierId: 'sup-1',
        supplierName: 'Sunrise Rice Co.',
        status: 'PENDING_MANAGER',
        requestedAt: isoHoursAgo(3),
        managerAiSummary: 'Order total $8,750 exceeds $2,500 policy threshold. Recommended action: Approve subject to batch inspection clause. Supplier score 8.2/10.',
        chaseCount: 0,
        isFlaggedIdle: false,
        documents: {
          receiptUploaded: false,
          invoiceUploaded: false,
        },
      },
      {
        id: 'PO-103',
        requestId: 'REQ-875',
        item: '150 sacks of Whole Wheat Flour',
        quantity: 150,
        unit: 'sacks (50kg)',
        estimatedValue: 1200,
        neededBy: 'Tomorrow morning',
        handlerName: 'Ravi (FreshMart Central Warehouse)',
        supplierId: 'sup-3',
        supplierName: 'Apex Agri Logistics',
        status: 'CONFIRMED',
        requestedAt: isoHoursAgo(8),
        approvedAt: isoHoursAgo(7.9),
        approvedBy: 'AUTO_PILOT',
        approvalReason: 'Policy compliant ($1,200 <= $2,500)',
        orderedAt: isoHoursAgo(7.8),
        confirmedAt: isoHoursAgo(5.5),
        promisedDate: 'Tomorrow by 10:00 AM',
        chaseCount: 0,
        isFlaggedIdle: false,
        documents: {
          receiptUploaded: false,
          invoiceUploaded: false,
        },
      },
      {
        id: 'PO-104',
        requestId: 'REQ-870',
        item: '100 crates of Organic Farm Milk',
        quantity: 100,
        unit: 'crates',
        estimatedValue: 950,
        neededBy: 'Today 3:00 PM',
        handlerName: 'Ravi (FreshMart Central Warehouse)',
        supplierId: 'sup-4',
        supplierName: 'Valley Dairy & Provisions',
        status: 'SHIPPED',
        requestedAt: isoHoursAgo(14),
        approvedAt: isoHoursAgo(13.9),
        approvedBy: 'AUTO_PILOT',
        orderedAt: isoHoursAgo(13.8),
        confirmedAt: isoHoursAgo(12.0),
        shippedAt: isoHoursAgo(4.0),
        trackingNumber: 'VDP-EXPRESS-9921',
        chaseCount: 0,
        isFlaggedIdle: false,
        documents: {
          receiptUploaded: false,
          invoiceUploaded: true,
          invoiceTimestamp: isoHoursAgo(4),
          invoiceAmount: 950,
          invoiceRef: 'INV-VD-4412',
        },
      },
      {
        id: 'PO-105',
        requestId: 'REQ-864',
        item: '300 bags of Brown Rice',
        quantity: 300,
        unit: 'bags (25kg)',
        estimatedValue: 1500,
        neededBy: 'Yesterday',
        handlerName: 'Ravi (FreshMart Central Warehouse)',
        supplierId: 'sup-1',
        supplierName: 'Sunrise Rice Co.',
        status: 'RECEIVED',
        requestedAt: isoHoursAgo(32),
        approvedAt: isoHoursAgo(31.8),
        approvedBy: 'AUTO_PILOT',
        orderedAt: isoHoursAgo(31.7),
        confirmedAt: isoHoursAgo(28.0),
        shippedAt: isoHoursAgo(18.0),
        receivedAt: isoHoursAgo(6.0),
        chaseCount: 1,
        lastChasedAt: isoHoursAgo(2.0),
        isFlaggedIdle: true,
        idleReason: 'Missing Invoice document. Cannot transition to DOCS_COMPLETE or CLOSED.',
        documents: {
          receiptUploaded: true,
          receiptTimestamp: isoHoursAgo(6),
          receiptRef: 'GRN-FM-8821',
          invoiceUploaded: false, // Incomplete!
        },
      },
      {
        id: 'PO-106',
        requestId: 'REQ-850',
        item: '400 bags of Premium Jasmine Rice',
        quantity: 400,
        unit: 'bags (20kg)',
        estimatedValue: 2400,
        neededBy: '3 days ago',
        handlerName: 'Ravi (FreshMart Central Warehouse)',
        supplierId: 'sup-2',
        supplierName: 'Golden Grain Corp',
        status: 'CLOSED',
        requestedAt: isoHoursAgo(72),
        approvedAt: isoHoursAgo(71.9),
        approvedBy: 'AUTO_PILOT',
        orderedAt: isoHoursAgo(71.8),
        confirmedAt: isoHoursAgo(68.0),
        shippedAt: isoHoursAgo(52.0),
        receivedAt: isoHoursAgo(30.0),
        closedAt: isoHoursAgo(24.0),
        finalResolution: 'FULFILLED_PERFECT',
        chaseCount: 0,
        isFlaggedIdle: false,
        documents: {
          receiptUploaded: true,
          receiptTimestamp: isoHoursAgo(30),
          receiptRef: 'GRN-FM-7711',
          invoiceUploaded: true,
          invoiceTimestamp: isoHoursAgo(26),
          invoiceAmount: 2400,
          invoiceRef: 'INV-GG-9102',
        },
      },
      {
        id: 'PO-107',
        requestId: 'REQ-842',
        item: '600 bags of Organic Parboiled Rice',
        quantity: 600,
        unit: 'bags (25kg)',
        estimatedValue: 2100,
        neededBy: '4 days ago',
        handlerName: 'Ravi (FreshMart Central Warehouse)',
        supplierId: 'sup-1',
        supplierName: 'Sunrise Rice Co.',
        status: 'CLOSED',
        finalResolution: 'FULFILLED_WITH_DAMAGE_CLAIM',
        damagedQty: 25,
        damageNotes: 'Multimodal AI vision verified 25 torn burlap sacks with grain spillage. Claim notice filed with Sunrise Rice Co. (-1.2 rating penalty). $87.50 credit memo deducted from invoice.',
        damageProofImage: 'PHOTO_VERIFIED',
        requestedAt: isoHoursAgo(96),
        approvedAt: isoHoursAgo(95.9),
        approvedBy: 'AUTO_PILOT',
        orderedAt: isoHoursAgo(95.8),
        confirmedAt: isoHoursAgo(90.0),
        shippedAt: isoHoursAgo(70.0),
        receivedAt: isoHoursAgo(48.0),
        closedAt: isoHoursAgo(40.0),
        chaseCount: 0,
        isFlaggedIdle: false,
        documents: {
          receiptUploaded: true,
          receiptTimestamp: isoHoursAgo(48),
          receiptRef: 'GRN-DMG-4421',
          invoiceUploaded: true,
          invoiceTimestamp: isoHoursAgo(42),
          invoiceAmount: 2012.5,
          invoiceRef: 'INV-SUN-CREDIT-884',
        },
      },
      {
        id: 'PO-108',
        requestId: 'REQ-830',
        item: '800 bags of Premium Idli Rice',
        quantity: 800,
        unit: 'bags (25kg)',
        estimatedValue: 2800,
        neededBy: '5 days ago',
        handlerName: 'Ravi (FreshMart Central Warehouse)',
        supplierId: 'sup-1',
        supplierName: 'Sunrise Rice Co.',
        status: 'REJECTED',
        finalResolution: 'REJECTED_BY_SUPPLIER',
        rejectionReason: 'Supplier capacity constraint / temporary milling machinery maintenance.',
        requestedAt: isoHoursAgo(120),
        approvedAt: isoHoursAgo(119.8),
        approvedBy: 'AUTO_PILOT',
        orderedAt: isoHoursAgo(119.5),
        chaseCount: 0,
        isFlaggedIdle: false,
        documents: {
          receiptUploaded: false,
          invoiceUploaded: false,
        },
      },
    ];

    this.stepLogs = [
      {
        id: 'log-1',
        poId: 'PO-101',
        step: 'REQUESTED',
        actor: 'RAVI_HANDLER',
        message: 'Intake created from natural language prompt: "Need 500 bags of rice by Friday"',
        timestamp: isoHoursAgo(2),
      },
      {
        id: 'log-2',
        poId: 'PO-101',
        step: 'POLICY_EVAL',
        actor: 'APPROVAL_AGENT',
        message: 'Autonomous Policy Evaluation: Value $1,750 <= Limit $2,500. Supplier Sunrise score 8.2 >= 7.0. PASS.',
        timestamp: isoHoursAgo(1.9),
      },
      {
        id: 'log-3',
        poId: 'PO-101',
        step: 'APPROVED',
        actor: 'APPROVAL_AGENT',
        message: 'Order auto-approved autonomously without blocking manager.',
        timestamp: isoHoursAgo(1.9),
      },
      {
        id: 'log-4',
        poId: 'PO-101',
        step: 'ORDERED',
        actor: 'DISPATCH_AGENT',
        message: 'Dispatched Purchase Order PO-101 to Sunrise Rice Co. (dispatch@sunriserice.com)',
        timestamp: isoHoursAgo(1.8),
      },
      {
        id: 'log-5',
        poId: 'PO-102',
        step: 'REQUESTED',
        actor: 'RAVI_HANDLER',
        message: 'Bulk procurement request logged: 2,500 bags of Premium Basmati ($8,750).',
        timestamp: isoHoursAgo(3),
      },
      {
        id: 'log-6',
        poId: 'PO-102',
        step: 'POLICY_EVAL',
        actor: 'APPROVAL_AGENT',
        message: 'Escalation triggered: $8,750 exceeds $2,500 limit. Task routed to Meena with 1-line AI executive summary.',
        timestamp: isoHoursAgo(2.9),
      },
      {
        id: 'log-7',
        poId: 'PO-105',
        step: 'CHASED',
        actor: 'CHASER_AGENT',
        message: 'Automated Chaser Agent dispatched missing invoice request to Sunrise Rice Co.',
        timestamp: isoHoursAgo(2),
      },
    ];

    this.emails = [
      {
        id: 'em-1',
        poId: 'PO-101',
        direction: 'OUTBOUND',
        from: 'autopilot@freshmart.com',
        to: 'dispatch@sunriserice.com',
        subject: 'PURCHASE ORDER: PO-101 [FreshMart Central Hub]',
        body: 'Dear Sunrise Rice Co.,\n\nPlease find attached Purchase Order PO-101 for 500 bags of Sona Masoori Rice (estimated value: $1,750). Required delivery: Friday 5:00 PM.\n\nPlease confirm receipt and shipment schedule within 24 hours.\n\nAutomated by FreshMart Order-to-Delivery Autopilot.',
        timestamp: isoHoursAgo(1.8),
        type: 'DISPATCH_PO',
      },
      {
        id: 'em-2',
        poId: 'PO-105',
        direction: 'OUTBOUND',
        from: 'autopilot@freshmart.com',
        to: 'dispatch@sunriserice.com',
        subject: 'ACTION REQUIRED: Missing Invoice for PO-105 [Delivered Yesterday]',
        body: 'Dear Sunrise Rice Co.,\n\nGoods for PO-105 (300 bags of Brown Rice) were received at the FreshMart central dock (GRN-FM-8821). However, the corresponding commercial invoice is missing from our system.\n\nPlease upload or email the invoice immediately so we can finalize docs and release payment.\n\nFreshMart Autonomous Tracker & Chaser Agent',
        timestamp: isoHoursAgo(2),
        type: 'CHASER_REMINDER',
      },
    ];
  }

  public recalculateSupplierScore(supplierId: string, outcome: { onTime: boolean; damagePct: number }): { oldScore: number; newScore: number } {
    const supplier = this.suppliers.find((s) => s.id === supplierId);
    if (!supplier) throw new Error('Supplier not found');

    const oldScore = supplier.score;
    // Rolling update: weighted average with new delivery
    const N = Math.min(supplier.totalOrders, 20); // rolling window
    const newOnTimeRate = ((supplier.onTimeRate * N) + (outcome.onTime ? 1 : 0)) / (N + 1);
    const newDamageRate = ((supplier.damageRate * N) + outcome.damagePct) / (N + 1);

    // Formula: score = 10 * (0.6 * onTimeRate + 0.4 * (1 - damageRate))
    const rawScore = 10 * (0.6 * newOnTimeRate + 0.4 * (1 - newDamageRate));
    const newScore = Math.max(1.0, Math.min(10.0, Math.round(rawScore * 10) / 10));

    supplier.onTimeRate = Math.round(newOnTimeRate * 100) / 100;
    supplier.damageRate = Math.round(newDamageRate * 100) / 100;
    supplier.score = newScore;
    supplier.totalOrders += 1;

    if (newScore < this.policy.minimumSupplierScore) {
      supplier.status = 'FLAGGED_REVIEW';
      supplier.notes = `Auto-downgraded by Outcome Agent due to quality/SLA infractions (Score: ${newScore}). Future auto-orders rerouted!`;
    }

    return { oldScore, newScore };
  }
}

export const db = new LogisticsDatabase();
