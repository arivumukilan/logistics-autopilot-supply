import React, { useState } from 'react';
import { PurchaseOrder, StepLog, POStatus } from '../types/logistics.ts';
import {
  X,
  CheckCircle2,
  Clock,
  Truck,
  FileText,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  Package,
  Building2,
  FileUp,
  AlertTriangle,
} from 'lucide-react';

interface OrderTrackerModalProps {
  order: PurchaseOrder | null;
  stepLogs: StepLog[];
  onClose: () => void;
  onReceiveCargo?: (poId: string) => void;
  onCloseOrder?: (poId: string) => void;
  onInspectDamageDock?: (poId: string) => void;
  onSupplierAction?: (params: {
    poId: string;
    action: 'CONFIRM' | 'SHIP' | 'UPLOAD_INVOICE' | 'REJECT';
    trackingNumber?: string;
    promisedDate?: string;
    invoiceAmount?: number;
    invoiceRef?: string;
    notes?: string;
  }) => Promise<void>;
  onRerouteOrder?: (poId: string) => Promise<void>;
}

const FLOW_STEPS: { step: POStatus; label: string; desc: string }[] = [
  { step: 'REQUESTED', label: 'Requested', desc: 'Requisition submitted' },
  { step: 'APPROVED', label: 'Approved', desc: 'Policy verified' },
  { step: 'ORDERED', label: 'Ordered', desc: 'Dispatched to supplier' },
  { step: 'CONFIRMED', label: 'Confirmed', desc: 'Supplier acknowledged' },
  { step: 'SHIPPED', label: 'Shipped', desc: 'In transit to warehouse' },
  { step: 'RECEIVED', label: 'Received', desc: 'Arrived at dock' },
  { step: 'DOCS_COMPLETE', label: 'Docs Complete', desc: 'Receipt & Invoice matched' },
  { step: 'CLOSED', label: 'Closed', desc: 'Finalized & archived' },
];

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  order,
  stepLogs,
  onClose,
  onReceiveCargo,
  onCloseOrder,
  onInspectDamageDock,
  onSupplierAction,
  onRerouteOrder,
}) => {
  const [isActionPending, setIsActionPending] = useState(false);

  if (!order) return null;

  const currentStepIndex = FLOW_STEPS.findIndex((s) => s.step === order.status);
  const relevantLogs = stepLogs.filter((l) => l.poId === order.id);

  // Helper for invoice status display
  const getInvoiceStatusDisplay = () => {
    if (order.documents.invoiceUploaded) {
      return (
        <span className="text-emerald-700 font-semibold flex items-center gap-1 font-mono text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Verified: {order.documents.invoiceRef} (${order.documents.invoiceAmount?.toLocaleString()})
        </span>
      );
    }
    if (order.status === 'RECEIVED') {
      return (
        <span className="text-amber-700 font-semibold flex items-center gap-1 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5" />
          Missing (Cargo arrived; supplier invoice required to close)
        </span>
      );
    }
    return (
      <span className="text-slate-500 font-medium text-[11px]">
        Pending Delivery (Due when goods arrive at dock)
      </span>
    );
  };

  const handleSupplierConfirm = async () => {
    if (!onSupplierAction) return;
    setIsActionPending(true);
    try {
      await onSupplierAction({
        poId: order.id,
        action: 'CONFIRM',
        promisedDate: 'In 2 business days',
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleSupplierReject = async () => {
    if (!onSupplierAction) return;
    setIsActionPending(true);
    try {
      await onSupplierAction({
        poId: order.id,
        action: 'REJECT',
        notes: `${order.supplierName || 'Supplier'} capacity constraint / temporary inventory outage`,
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleSupplierShip = async () => {
    if (!onSupplierAction) return;
    setIsActionPending(true);
    try {
      await onSupplierAction({
        poId: order.id,
        action: 'SHIP',
        trackingNumber: `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleSupplierUploadInvoice = async () => {
    if (!onSupplierAction) return;
    setIsActionPending(true);
    try {
      await onSupplierAction({
        poId: order.id,
        action: 'UPLOAD_INVOICE',
        invoiceAmount: order.estimatedValue,
        invoiceRef: `INV-${order.id.replace('PO-', '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold font-mono text-slate-900">
                {order.id}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                order.status === 'CLOSED' && order.finalResolution === 'FULFILLED_WITH_DAMAGE_CLAIM'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : order.status === 'CLOSED'
                  ? 'bg-slate-100 text-slate-800'
                  : order.status === 'ORDERED' || order.status === 'SHIPPED'
                  ? 'bg-blue-50 text-blue-700'
                  : order.status === 'CONFIRMED'
                  ? 'bg-indigo-50 text-indigo-700'
                  : order.status === 'RECEIVED' && order.damagedQty && order.damagedQty > 0
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : order.status === 'RECEIVED'
                  ? 'bg-amber-50 text-amber-700'
                  : order.status === 'PENDING_MANAGER'
                  ? 'bg-purple-50 text-purple-700'
                  : order.status === 'REJECTED'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {order.status === 'CLOSED' && order.finalResolution === 'FULFILLED_WITH_DAMAGE_CLAIM'
                  ? 'CLOSED · CLAIM SETTLED'
                  : order.status === 'CLOSED' && order.finalResolution === 'FULFILLED_PERFECT'
                  ? 'CLOSED · PERFECT'
                  : order.status === 'REJECTED' && order.finalResolution === 'REJECTED_BY_SUPPLIER'
                  ? 'REJECTED · BY SUPPLIER'
                  : order.status === 'REJECTED' && order.finalResolution === 'REJECTED_BY_MANAGER'
                  ? 'REJECTED · BY MANAGER'
                  : order.status === 'RECEIVED' && order.damagedQty && order.damagedQty > 0
                  ? `RECEIVED (⚠️ ${order.damagedQty} DEFECTS)`
                  : order.status}
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-800 mt-1">
              {order.item}
            </h3>
            <div className="text-xs text-slate-500 mt-0.5">
              Requisition {order.requestId} · Handled by {order.handlerName}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Stepper Progression */}
        <div className="my-6">
          <div className="text-xs font-semibold text-slate-700 mb-3 flex items-center justify-between">
            <span>Fulfillment Pipeline Status</span>
            <span className="font-mono text-emerald-700 text-[11px] font-bold">
              Current Step: {order.status}
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {FLOW_STEPS.map((s, idx) => {
              const isPast = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={s.step} className="text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-xs font-bold transition-all ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className={`text-[11px] font-semibold mt-1.5 truncate ${
                    isCurrent ? 'text-slate-900 font-bold' : isPast ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Context Guidance Box: What to do at this step? */}
        <div className="mb-4 p-3 rounded-lg border text-xs bg-slate-50 border-slate-200 text-slate-700 leading-relaxed">
          {order.status === 'ORDERED' && (
            <div className="flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-semibold">What happens at ORDERED?</strong>
                The purchase order was dispatched to <strong>{order.supplierName}</strong>. The supplier must now accept the terms and <strong>Confirm Acceptance</strong> before shipping. (The commercial invoice is not due until delivery).
              </div>
            </div>
          )}
          {order.status === 'CONFIRMED' && (
            <div className="flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-semibold">What happens at CONFIRMED?</strong>
                {order.supplierName} acknowledged the order. Next step: the supplier marks the cargo as <strong>Shipped</strong> and provides shipment tracking info.
              </div>
            </div>
          )}
          {order.status === 'SHIPPED' && (
            <div className="flex items-start gap-2.5">
              <Package className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-semibold">What happens at SHIPPED?</strong>
                The shipment is en route (Tracking: <code className="font-mono text-slate-900">{order.trackingNumber || 'Pending'}</code>). When the truck arrives at FreshMart dock #4, Ravi confirms cargo receipt and signs the Goods Receipt Note (GRN).
              </div>
            </div>
          )}
          {order.status === 'RECEIVED' && (
            <div className="flex items-start gap-2.5">
              <FileUp className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-semibold">Why is the invoice needed now?</strong>
                Goods have arrived at the dock (GRN verified). Under corporate audit controls, an order cannot be settled or closed until {order.supplierName} provides their <strong>Commercial Invoice</strong> matching the GRN. Once uploaded, the order completes!
              </div>
            </div>
          )}
          {order.status === 'DOCS_COMPLETE' && (
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-semibold">All documentation verified!</strong>
                Both physical Goods Receipt (GRN) and Commercial Invoice have been verified. The order is ready to be finalized and closed in the ledger.
              </div>
            </div>
          )}
          {order.status === 'CLOSED' && (
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-semibold">Order Finalized</strong>
                This transaction has been successfully fulfilled, matched, and archived in the enterprise ledger.
              </div>
            </div>
          )}
        </div>

        {/* Specifications & Document Verification Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div className="space-y-2">
            <div>
              <span className="text-slate-400 block text-[11px]">Commodity / Quantity</span>
              <strong className="text-slate-900 text-sm">{order.quantity} {order.unit}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Estimated Contract Value</span>
              <strong className="text-slate-900 font-mono text-sm tabular-nums">
                ${order.estimatedValue.toLocaleString()} USD
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Delivery SLA Target</span>
              <strong className="text-slate-900">{order.neededBy}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Assigned Supplier</span>
              <strong className="text-slate-900">{order.supplierName || 'Pending Assignment'}</strong>
            </div>
          </div>

          <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-4 pt-2 sm:pt-0">
            <div>
              <span className="text-slate-400 block text-[11px]">Approval Source</span>
              <span className="text-slate-800">
                {order.approvedBy ? `${order.approvedBy.replace('_', ' ')}` : 'Pending'}
                {order.approvalReason && ` (${order.approvalReason})`}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Goods Receipt Note (GRN)</span>
              {order.documents.receiptUploaded ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1 font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified: {order.documents.receiptRef}
                </span>
              ) : (
                <span className="text-slate-500 font-medium text-[11px]">
                  Pending Cargo Arrival at Dock
                </span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Commercial Invoice</span>
              {getInvoiceStatusDisplay()}
            </div>

            {order.isFlaggedIdle && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
                <strong>Attention:</strong> {order.idleReason}
              </div>
            )}
          </div>
        </div>

        {/* Cargo Quality & Multimodal Inspection Box (if damage logged) */}
        {order.damagedQty && order.damagedQty > 0 ? (
          <div className="mt-4 p-4 bg-amber-50/90 border border-amber-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 flex items-center gap-1.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Multimodal Cargo Defect & Inspection Report
              </span>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-amber-200 text-amber-900 border border-amber-300">
                {order.damageProofImage || 'GEMINI VISION VERIFIED'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700 pt-1">
              <div>
                <span className="text-[11px] text-amber-900/80 block font-semibold">Compromised Units:</span>
                <span className="font-bold text-slate-900 text-sm">{order.damagedQty} {order.unit || 'units'}</span>
              </div>
              <div>
                <span className="text-[11px] text-amber-900/80 block font-semibold">Defect Observations:</span>
                <span className="text-slate-800">{order.damageNotes || 'Packaging punctured; torn bag seams observed.'}</span>
              </div>
              <div>
                <span className="text-[11px] text-amber-900/80 block font-semibold">Accounting Settlement:</span>
                <span className="text-amber-900 font-semibold">
                  {order.status === 'CLOSED' ? 'Debit memo deducted from invoice total' : 'Automated claim issued to supplier'}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Rejection Alert Box */}
        {order.status === 'REJECTED' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-red-950 block">
                  Order Rejected ({order.finalResolution === 'REJECTED_BY_SUPPLIER' ? 'By Supplier' : 'By Manager'}):
                </strong>
                <p className="mt-0.5 text-red-800">{order.rejectionReason || order.approvalReason}</p>
              </div>
            </div>
            {onRerouteOrder && (
              <button
                onClick={() => onRerouteOrder(order.id)}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
              >
                ⚡ Auto-Reroute Alternate Supplier
              </button>
            )}
          </div>
        )}

        {/* Step Activity Log */}
        <div className="mt-5">
          <div className="text-xs font-semibold text-slate-700 mb-2">
            Audit Activity Log for {order.id}
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {relevantLogs.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No events logged yet.</div>
            ) : (
              relevantLogs.map((log) => (
                <div key={log.id} className="p-2 bg-white border border-slate-100 rounded text-xs flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-800 mr-2">{log.actor}:</span>
                    <span className="text-slate-600">{log.message}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Direct Action Advancer Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {order.status === 'CLOSED'
              ? 'Order is finalized and archived.'
              : order.status === 'REJECTED'
              ? 'Order was rejected.'
              : 'Advance order to next lifecycle milestone:'}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* If REJECTED -> Reroute */}
            {order.status === 'REJECTED' && onRerouteOrder && (
              <button
                onClick={() => onRerouteOrder(order.id)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                ⚡ Reroute Supplier
              </button>
            )}

            {/* If ORDERED -> Supplier can Confirm or Reject */}
            {order.status === 'ORDERED' && (
              <>
                <button
                  onClick={handleSupplierConfirm}
                  disabled={isActionPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Supplier Action: Confirm Acceptance</span>
                </button>
                <button
                  onClick={handleSupplierReject}
                  disabled={isActionPending}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  ✕ Supplier: Reject PO
                </button>
              </>
            )}

            {/* If CONFIRMED -> Supplier can Ship */}
            {order.status === 'CONFIRMED' && (
              <button
                onClick={handleSupplierShip}
                disabled={isActionPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Supplier Action: Dispatch & Ship</span>
              </button>
            )}

            {/* If SHIPPED -> Dock can Receive */}
            {order.status === 'SHIPPED' && onReceiveCargo && (
              <button
                onClick={() => onReceiveCargo(order.id)}
                disabled={isActionPending}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Dock Action: Confirm Goods Received</span>
              </button>
            )}

            {/* If RECEIVED -> Option to inspect damage or upload invoice */}
            {order.status === 'RECEIVED' && onInspectDamageDock && (
              <button
                onClick={() => onInspectDamageDock(order.id)}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Dock: Inspect Damage (Camera/AI)</span>
              </button>
            )}

            {/* If RECEIVED -> Supplier uploads invoice */}
            {order.status === 'RECEIVED' && !order.documents.invoiceUploaded && (
              <button
                onClick={handleSupplierUploadInvoice}
                disabled={isActionPending}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Supplier Action: Upload Commercial Invoice</span>
              </button>
            )}

            {/* If DOCS_COMPLETE -> Close Order */}
            {order.status === 'DOCS_COMPLETE' && onCloseOrder && (
              <button
                onClick={() => onCloseOrder(order.id)}
                disabled={isActionPending}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Finalize & Close Order</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
