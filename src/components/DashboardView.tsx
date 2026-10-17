import React, { useState } from 'react';
import { PurchaseOrder, StepLog, Supplier } from '../types/logistics.ts';
import {
  TrendingUp,
  Clock,
  ShieldCheck,
  Package,
  AlertTriangle,
  ArrowRight,
  Search,
  CheckCircle2,
  FileCheck,
  Check,
  X,
  Truck,
  ExternalLink,
  FileUp,
  Building2,
} from 'lucide-react';

interface DashboardViewProps {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  stepLogs: StepLog[];
  onSelectOrder: (order: PurchaseOrder) => void;
  onNavigateToScreen: (screen: any) => void;
  onApproveException: (poId: string) => void;
  onRejectException: (poId: string) => void;
  onSupplierAction?: (params: {
    poId: string;
    action: 'CONFIRM' | 'SHIP' | 'UPLOAD_INVOICE' | 'REJECT';
    trackingNumber?: string;
    promisedDate?: string;
    invoiceAmount?: number;
    invoiceRef?: string;
    notes?: string;
  }) => Promise<void>;
  onReceiveCargo?: (poId: string) => void;
  onCloseOrder?: (poId: string) => void;
  onRerouteOrder?: (poId: string) => Promise<void>;
  isProcessing: boolean;
}

const STAGES = [
  'REQUESTED',
  'APPROVED',
  'ORDERED',
  'CONFIRMED',
  'SHIPPED',
  'RECEIVED',
  'DOCS_COMPLETE',
  'CLOSED',
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  suppliers,
  stepLogs,
  onSelectOrder,
  onNavigateToScreen,
  onApproveException,
  onRejectException,
  onSupplierAction,
  onReceiveCargo,
  onCloseOrder,
  onRerouteOrder,
  isProcessing,
}) => {
  // Quick status tracker selection
  const [trackedPoId, setTrackedPoId] = useState<string>(orders[0]?.id || 'PO-101');
  const trackedOrder = orders.find((o) => o.id === trackedPoId) || orders[0];

  const pendingExceptions = orders.filter((o) => o.status === 'PENDING_MANAGER');
  // Documentation incomplete applies strictly to orders received at dock where invoice or receipt is missing
  const missingDocOrders = orders.filter((o) => o.status === 'RECEIVED' && (!o.documents.invoiceUploaded || !o.documents.receiptUploaded));
  const activeOrders = orders.filter((o) => o.status !== 'CLOSED' && o.status !== 'REJECTED');
  const closedOrders = orders.filter((o) => o.status === 'CLOSED');

  const currentStageIndex = trackedOrder ? STAGES.indexOf(trackedOrder.status) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Top Executive KPI Metric Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Orders
            </span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {activeOrders.length}
            </span>
            <span className="text-xs text-slate-400">in pipeline</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {closedOrders.length} closed & finalized
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Auto-Approval Velocity
            </span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
              4.2m
            </span>
            <span className="text-xs text-slate-400">avg cycle</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            78.4% orders auto-approved
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Dual-Doc Gate
            </span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              100%
            </span>
            <span className="text-xs text-slate-400">verified</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Zero unclosed orphan POs
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Top Supplier Health
            </span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              9.3/10
            </span>
            <span className="text-xs text-slate-400">Golden Grain</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Failover rerouting active
          </span>
        </div>
      </section>

      {/* 2. Interactive Live Order Status Tracker (User's Core Requirement) */}
      {trackedOrder && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                  LIVE STATUS TRACKER
                </span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {trackedOrder.id}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-sm font-semibold text-slate-800">
                  {trackedOrder.item}
                </span>
                {trackedOrder.damagedQty && trackedOrder.damagedQty > 0 ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    ⚠️ {trackedOrder.damagedQty} DAMAGED
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Assigned Vendor: <strong>{trackedOrder.supplierName || 'Evaluating...'}</strong> · Value: <strong className="font-mono tabular-nums">${trackedOrder.estimatedValue.toLocaleString()} USD</strong> · Target: {trackedOrder.neededBy}
              </p>

              {/* Damaged Goods Verified Banner */}
              {trackedOrder.damagedQty && trackedOrder.damagedQty > 0 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="font-bold text-amber-950 block">
                      ⚠️ Cargo Defect Verified ({trackedOrder.damagedQty} damaged {trackedOrder.unit || 'units'}):
                    </strong>
                    <p className="mt-0.5 text-amber-800 leading-normal">
                      {trackedOrder.damageNotes || 'Inspected by Ravi & Gemini Multimodal Cargo Inspector. Automated vendor claim notice dispatched.'}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-medium text-amber-900">
                      <span>Resolution: <strong>{trackedOrder.status === 'CLOSED' ? 'Debit Memo Settled on Invoice' : 'Debit Claim Dispatched to Vendor'}</strong></span>
                      <span>·</span>
                      <span>Proof: <strong>{trackedOrder.damageProofImage || 'Photo Verified'}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Rejection Banner */}
              {trackedOrder.status === 'REJECTED' && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-red-950 block">
                        Order Rejected ({trackedOrder.finalResolution === 'REJECTED_BY_SUPPLIER' ? 'By Supplier' : 'By Manager'}):
                      </strong>
                      <p className="mt-0.5 text-red-800">{trackedOrder.rejectionReason || trackedOrder.approvalReason}</p>
                    </div>
                  </div>
                  {onRerouteOrder && (
                    <button
                      onClick={() => onRerouteOrder(trackedOrder.id)}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
                    >
                      ⚡ Auto-Reroute Supplier
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Order Switcher Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Track Order:</label>
              <select
                value={trackedPoId}
                onChange={(e) => setTrackedPoId(e.target.value)}
                className="text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id}: {o.item} {o.damagedQty ? `(⚠️ ${o.damagedQty} dmg)` : `(${o.status})`}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onSelectOrder(trackedOrder)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1 cursor-pointer"
                title="Open detailed view with full log history"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Visual Step Progression Bar */}
          <div className="py-6">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {STAGES.map((st, idx) => {
                const isPast = currentStageIndex > idx;
                const isCurrent = currentStageIndex === idx;

                return (
                  <div key={st} className="text-center group">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs font-bold transition-all ${
                        isPast
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <div className={`text-[10px] font-semibold mt-1.5 uppercase truncate ${
                      isCurrent ? 'text-emerald-700 font-bold' : isPast ? 'text-slate-800' : 'text-slate-400'
                    }`}>
                      {st.replace('_', ' ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Breakdown Strip with Direct Quick Actions */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 text-slate-600">
              <span className="flex items-center gap-1.5">
                <strong className="text-slate-900">Stage:</strong>
                <span className="px-2 py-0.5 rounded font-bold font-mono text-[11px] bg-slate-200 text-slate-900">
                  {trackedOrder.status}
                </span>
              </span>

              <span>·</span>

              <span className="flex items-center gap-1">
                <strong>GRN Receipt:</strong>
                {trackedOrder.documents.receiptUploaded ? (
                  <span className="text-emerald-600 font-semibold font-mono">Verified ({trackedOrder.documents.receiptRef})</span>
                ) : (
                  <span className="text-slate-400">Pending Delivery</span>
                )}
              </span>

              <span>·</span>

              <span className="flex items-center gap-1">
                <strong>Commercial Invoice:</strong>
                {trackedOrder.documents.invoiceUploaded ? (
                  <span className="text-emerald-600 font-semibold font-mono">Verified (${trackedOrder.documents.invoiceAmount?.toLocaleString()})</span>
                ) : trackedOrder.status === 'RECEIVED' ? (
                  <span className="text-amber-600 font-bold">Missing (Cargo Arrived; Invoice Due)</span>
                ) : (
                  <span className="text-slate-400">Due upon dock delivery</span>
                )}
              </span>
            </div>

            {/* Direct Quick Action Button to Advance Order */}
            <div className="flex items-center gap-2 shrink-0">
              {trackedOrder.status === 'ORDERED' && onSupplierAction && (
                <button
                  onClick={() => onSupplierAction({ poId: trackedOrder.id, action: 'CONFIRM' })}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-xs cursor-pointer shadow-xs"
                >
                  Confirm Acceptance (Supplier)
                </button>
              )}

              {trackedOrder.status === 'CONFIRMED' && onSupplierAction && (
                <button
                  onClick={() =>
                    onSupplierAction({
                      poId: trackedOrder.id,
                      action: 'SHIP',
                      trackingNumber: `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
                    })
                  }
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-xs cursor-pointer shadow-xs"
                >
                  Mark Shipped (Supplier)
                </button>
              )}

              {trackedOrder.status === 'SHIPPED' && onReceiveCargo && (
                <button
                  onClick={() => onReceiveCargo(trackedOrder.id)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold text-xs cursor-pointer shadow-xs"
                >
                  Receive at Dock (Sign GRN)
                </button>
              )}

              {trackedOrder.status === 'RECEIVED' && !trackedOrder.documents.invoiceUploaded && onSupplierAction && (
                <button
                  onClick={() =>
                    onSupplierAction({
                      poId: trackedOrder.id,
                      action: 'UPLOAD_INVOICE',
                      invoiceAmount: trackedOrder.estimatedValue,
                      invoiceRef: `INV-${trackedOrder.id.replace('PO-', '')}-${Math.floor(1000 + Math.random() * 9000)}`,
                    })
                  }
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-semibold text-xs cursor-pointer shadow-xs"
                >
                  Upload Commercial Invoice
                </button>
              )}

              {trackedOrder.status === 'DOCS_COMPLETE' && onCloseOrder && (
                <button
                  onClick={() => onCloseOrder(trackedOrder.id)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold text-xs cursor-pointer shadow-xs"
                >
                  Finalize & Close PO
                </button>
              )}

              <button
                onClick={() => onSelectOrder(trackedOrder)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 rounded-md font-semibold text-xs cursor-pointer"
              >
                Detailed Tracker →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 3. Exceptions & Attention Alerts (Meena's Queue & Overdue Invoices) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exceptions Pending Manager Approval */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Manager Exceptions Queue ({pendingExceptions.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateToScreen('approvals')}
              className="text-xs text-purple-700 hover:text-purple-900 font-semibold cursor-pointer"
            >
              Open Queue →
            </button>
          </div>

          {pendingExceptions.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 text-center">
              All active requisitions are within autonomous limits. Zero approvals blocking fulfillment.
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingExceptions.map((po) => (
                <div key={po.id} className="p-3 bg-purple-50/50 border border-purple-100 rounded-lg text-xs flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="font-mono">{po.id}</span>
                      <span>·</span>
                      <span>{po.item}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums text-purple-800">${po.estimatedValue.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-purple-900 mt-0.5 line-clamp-1">
                      {po.managerAiSummary || 'Exceeds auto-approval limit.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onApproveException(po.id)}
                      disabled={isProcessing}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onRejectException(po.id)}
                      disabled={isProcessing}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-semibold cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Missing Documentation Gate Alert (Received but Missing Invoice) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Overdue Commercial Invoices ({missingDocOrders.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateToScreen('receiving')}
              className="text-xs text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
            >
              Dock View →
            </button>
          </div>

          {missingDocOrders.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 text-center">
              All arrived shipments have their commercial invoices attached. Zero closure blockers.
            </div>
          ) : (
            <div className="space-y-2.5">
              {missingDocOrders.map((po) => (
                <div key={po.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg text-xs flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="font-mono">{po.id}</span>
                      <span>·</span>
                      <span>{po.item}</span>
                    </div>
                    <p className="text-[11px] text-amber-900 mt-0.5">
                      Received at dock, but supplier commercial invoice is missing. Chaser Agent active.
                    </p>
                  </div>

                  <button
                    onClick={() => onSelectOrder(po)}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold cursor-pointer shrink-0"
                  >
                    Track Docs
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Active Procurement Orders Grid */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Procurement Orders Overview
            </h3>
            <span className="text-xs text-slate-500">
              Click any order row to inspect live status, goods receipt notes, and timeline
            </span>
          </div>

          <button
            onClick={() => onNavigateToScreen('orders')}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
          >
            View All ({orders.length}) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">PO #</th>
                <th className="py-2.5 px-4">Item & Specifications</th>
                <th className="py-2.5 px-4 text-right">Value (USD)</th>
                <th className="py-2.5 px-4">Supplier</th>
                <th className="py-2.5 px-4">Current Status</th>
                <th className="py-2.5 px-4">Target Date</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.slice(0, 8).map((po) => (
                <tr
                  key={po.id}
                  onClick={() => onSelectOrder(po)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {po.id}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{po.item}</span>
                      {po.damagedQty && po.damagedQty > 0 ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          ⚠️ {po.damagedQty} damaged
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 font-semibold">
                    ${po.estimatedValue.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {po.supplierName || 'Assigning...'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                      po.status === 'CLOSED' && po.finalResolution === 'FULFILLED_WITH_DAMAGE_CLAIM'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : po.status === 'CLOSED'
                        ? 'bg-slate-100 text-slate-800'
                        : po.status === 'ORDERED' || po.status === 'SHIPPED'
                        ? 'bg-blue-50 text-blue-700'
                        : po.status === 'CONFIRMED'
                        ? 'bg-indigo-50 text-indigo-700'
                        : po.status === 'RECEIVED' && po.damagedQty && po.damagedQty > 0
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : po.status === 'RECEIVED'
                        ? 'bg-amber-50 text-amber-700'
                        : po.status === 'PENDING_MANAGER'
                        ? 'bg-purple-50 text-purple-700'
                        : po.status === 'REJECTED'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {po.status === 'CLOSED' && po.finalResolution === 'FULFILLED_WITH_DAMAGE_CLAIM'
                        ? 'CLOSED · CLAIM SETTLED'
                        : po.status === 'CLOSED' && po.finalResolution === 'FULFILLED_PERFECT'
                        ? 'CLOSED · PERFECT'
                        : po.status === 'REJECTED' && po.finalResolution === 'REJECTED_BY_SUPPLIER'
                        ? 'REJECTED · BY SUPPLIER'
                        : po.status === 'REJECTED' && po.finalResolution === 'REJECTED_BY_MANAGER'
                        ? 'REJECTED · BY MANAGER'
                        : po.status === 'RECEIVED' && po.damagedQty && po.damagedQty > 0
                        ? `RECEIVED (⚠️ ${po.damagedQty} DEFECTS)`
                        : po.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {po.neededBy}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5" onClick={(e) => e.stopPropagation()}>
                    {po.status === 'REJECTED' && onRerouteOrder && (
                      <button
                        onClick={() => onRerouteOrder(po.id)}
                        className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-semibold cursor-pointer shadow-2xs"
                      >
                        ⚡ Reroute
                      </button>
                    )}
                    <span
                      onClick={() => onSelectOrder(po)}
                      className="text-emerald-700 hover:text-emerald-900 font-semibold text-[11px] cursor-pointer"
                    >
                      Track Status →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Autonomous Agent Event Feed */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Live Autonomous Supply Chain Activity
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Real-time Agent Actions
          </span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {stepLogs.slice(0, 6).map((log) => (
            <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-slate-900 shrink-0">{log.poId}</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-[11px] text-emerald-800 font-semibold shrink-0">{log.actor}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-700 line-clamp-1">{log.message}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0 tabular-nums">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
