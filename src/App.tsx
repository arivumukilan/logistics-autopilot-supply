/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Supplier,
  PurchaseOrder,
  StepLog,
  EmailRecord,
  PolicyConfig,
  SystemStats,
  DamageInspectionResult,
} from './types/logistics.ts';
import { Sidebar, NavScreen } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { OrdersView } from './components/OrdersView.tsx';
import { NewRequisitionView } from './components/NewRequisitionView.tsx';
import { ReceivingDockView } from './components/ReceivingDockView.tsx';
import { ManagerTab } from './components/ManagerTab.tsx';
import { SupplierTab } from './components/SupplierTab.tsx';
import { CopilotChat } from './components/CopilotChat.tsx';
import { OrderTrackerModal } from './components/OrderTrackerModal.tsx';
import { Zap } from 'lucide-react';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<NavScreen>('dashboard');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [policy, setPolicy] = useState<PolicyConfig>({
    autoApprovalValueLimit: 2500,
    minimumSupplierScore: 7.0,
    chaseIntervalHours: 24,
    maxChasesBeforeEscalation: 2,
    requireDualDocForClosure: true,
  });
  const [stats, setStats] = useState<SystemStats>({
    fastestCycleMinutes: 4.2,
    averageCycleHours: 18.5,
    autoApprovalRate: 78.4,
    activeAutonomousAgents: 8,
    selfHealedOrdersCount: 14,
    totalOrdersProcessed: 128,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<PurchaseOrder | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const loadSystemState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
        setOrders(data.purchaseOrders || []);
        setStepLogs(data.stepLogs || []);
        setEmails(data.emails || []);
        if (data.policy) setPolicy(data.policy);
        if (data.stats) setStats(data.stats);

        // Keep tracked order in sync if currently open
        if (trackedOrder) {
          const updated = (data.purchaseOrders || []).find((p: PurchaseOrder) => p.id === trackedOrder.id);
          if (updated) setTrackedOrder(updated);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch state from backend:', err);
    }
  }, [trackedOrder]);

  useEffect(() => {
    loadSystemState();
  }, [loadSystemState]);

  // Actions
  const handleSubmitIntake = async (rawText: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, handlerName: 'Ravi (Logistics Staff)' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed intake');
      await loadSystemState();
      showToast(`Requisition Processed: ${data.purchaseOrder.id} status is now ${data.purchaseOrder.status}`);
      setTrackedOrder(data.purchaseOrder);
    } catch (err: any) {
      showToast(`Intake error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprovalAction = async (poId: string, action: 'APPROVE' | 'REJECT', notes?: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/approval/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poId, action, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadSystemState();
      showToast(`Manager Meena ${action.toLowerCase()}d ${poId}.`);
    } catch (err: any) {
      showToast(`Approval error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSupplierAction = async (params: {
    poId: string;
    action: 'CONFIRM' | 'SHIP' | 'UPLOAD_INVOICE' | 'REJECT';
    trackingNumber?: string;
    promisedDate?: string;
    invoiceAmount?: number;
    invoiceRef?: string;
    notes?: string;
  }) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/supplier/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadSystemState();
      showToast(`Supplier update recorded for ${params.poId}`);
    } catch (err: any) {
      showToast(`Supplier action error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceiveCargo = async (poId: string, receiptRef?: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/delivery/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poId, receiptRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadSystemState();
      showToast(`Goods Receipt Note verified for ${poId}`);
    } catch (err: any) {
      showToast(`Receive error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInspectDamage = async (params: {
    poId: string;
    damagedBagsCount: number;
    damageNotes?: string;
    imageBase64?: string;
  }): Promise<DamageInspectionResult | null> => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/delivery/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadSystemState();
      showToast(`Quality Inspection: ${data.inspectionResult.analysisSummary}`);
      return data.inspectionResult;
    } catch (err: any) {
      showToast(`Inspection error: ${err.message}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseOrder = async (poId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/po/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadSystemState();
      showToast(`Order ${poId} verified and CLOSED in ledger.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRerouteOrder = async (poId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/po/reroute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadSystemState();
      showToast(`Order ${poId} rerouted to ${data.purchaseOrder.supplierName}!`);
      if (trackedOrder && trackedOrder.id === poId) {
        setTrackedOrder(data.purchaseOrder);
      }
    } catch (err: any) {
      showToast(`Reroute error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerScheduler = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/scheduler/tick', { method: 'POST' });
      const data = await res.json();
      await loadSystemState();
      showToast(`Automated Scan: Tracker checked orders, Chaser sent ${data.chaser.chasedCount} reminder(s).`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePolicy = async (newPolicy: Partial<PolicyConfig>) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/policy/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPolicy),
      });
      const data = await res.json();
      if (data.policy) setPolicy(data.policy);
      await loadSystemState();
      showToast('Policy parameters saved successfully.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFetchInsights = async (): Promise<string> => {
    const res = await fetch('/api/insights');
    const data = await res.json();
    return data.summary || 'Summary unavailable';
  };

  const handleSendCopilotMessage = async (message: string): Promise<string> => {
    const res = await fetch('/api/copilot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    return data.reply;
  };

  const handleResetSeed = async () => {
    setIsProcessing(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
      await loadSystemState();
      showToast('System database reset to standard default state.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Search PO handler
  const handleSearchOrder = (poQuery: string) => {
    const found = orders.find(
      (o) => o.id.toUpperCase() === poQuery.toUpperCase() || o.id.toUpperCase().includes(poQuery.toUpperCase())
    );
    if (found) {
      setTrackedOrder(found);
    } else {
      showToast(`Order "${poQuery}" was not found in the ledger.`);
    }
  };

  const pendingApprovalsCount = orders.filter((o) => o.status === 'PENDING_MANAGER').length;
  const activeOrdersCount = orders.filter((o) => o.status !== 'CLOSED' && o.status !== 'REJECTED').length;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        pendingApprovalsCount={pendingApprovalsCount}
        activeOrdersCount={activeOrdersCount}
        onResetSeed={handleResetSeed}
        isProcessing={isProcessing}
      />

      {/* 2. Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header with Breadcrumbs & Search */}
        <TopBar
          activeScreen={activeScreen}
          onNewRequisition={() => setActiveScreen('intake')}
          onSearchOrder={handleSearchOrder}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {activeScreen === 'dashboard' && (
              <DashboardView
                orders={orders}
                suppliers={suppliers}
                stepLogs={stepLogs}
                onSelectOrder={(ord) => setTrackedOrder(ord)}
                onNavigateToScreen={(scr) => setActiveScreen(scr)}
                onApproveException={(id) => handleApprovalAction(id, 'APPROVE')}
                onRejectException={(id) => handleApprovalAction(id, 'REJECT')}
                onSupplierAction={handleSupplierAction}
                onReceiveCargo={(id) => handleReceiveCargo(id)}
                onCloseOrder={(id) => handleCloseOrder(id)}
                onRerouteOrder={handleRerouteOrder}
                isProcessing={isProcessing}
              />
            )}

            {activeScreen === 'orders' && (
              <OrdersView
                orders={orders}
                onSelectOrder={(ord) => setTrackedOrder(ord)}
                onReceiveCargo={(id) => handleReceiveCargo(id)}
                onCloseOrder={(id) => handleCloseOrder(id)}
                onSupplierAction={handleSupplierAction}
                onRerouteOrder={handleRerouteOrder}
              />
            )}

            {activeScreen === 'intake' && (
              <NewRequisitionView
                onSubmitIntake={handleSubmitIntake}
                isProcessing={isProcessing}
                onViewOrders={() => setActiveScreen('orders')}
              />
            )}

            {activeScreen === 'receiving' && (
              <ReceivingDockView
                orders={orders}
                isProcessing={isProcessing}
                onReceiveCargo={handleReceiveCargo}
                onInspectDamage={handleInspectDamage}
                onCloseOrder={handleCloseOrder}
                onSelectOrder={(ord) => setTrackedOrder(ord)}
              />
            )}

            {activeScreen === 'approvals' && (
              <ManagerTab
                orders={orders}
                suppliers={suppliers}
                policy={policy}
                isProcessing={isProcessing}
                onApprovalAction={handleApprovalAction}
                onUpdatePolicy={handleUpdatePolicy}
                onFetchInsights={handleFetchInsights}
              />
            )}

            {activeScreen === 'suppliers' && (
              <ManagerTab
                orders={orders}
                suppliers={suppliers}
                policy={policy}
                isProcessing={isProcessing}
                onApprovalAction={handleApprovalAction}
                onUpdatePolicy={handleUpdatePolicy}
                onFetchInsights={handleFetchInsights}
              />
            )}

            {activeScreen === 'supplier_portal' && (
              <SupplierTab
                orders={orders}
                suppliers={suppliers}
                emails={emails}
                isProcessing={isProcessing}
                onSupplierAction={handleSupplierAction}
                onTriggerChaserTick={handleTriggerScheduler}
              />
            )}

            {activeScreen === 'copilot' && (
              <CopilotChat
                onSendMessage={handleSendCopilotMessage}
                isProcessing={isProcessing}
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Interactive Order Tracker Modal */}
      <OrderTrackerModal
        order={trackedOrder}
        stepLogs={stepLogs}
        onClose={() => setTrackedOrder(null)}
        onReceiveCargo={handleReceiveCargo}
        onCloseOrder={handleCloseOrder}
        onInspectDamageDock={(id) => {
          setTrackedOrder(null);
          setActiveScreen('receiving');
        }}
        onSupplierAction={handleSupplierAction}
        onRerouteOrder={handleRerouteOrder}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 max-w-md animate-fade-in">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1 leading-normal">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
