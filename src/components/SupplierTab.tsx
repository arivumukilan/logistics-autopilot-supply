import React, { useState } from 'react';
import { PurchaseOrder, EmailRecord, Supplier } from '../types/logistics.ts';
import { Check, Truck, FileUp, Mail, Send, AlertCircle, Building2 } from 'lucide-react';

interface SupplierTabProps {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  emails: EmailRecord[];
  isProcessing: boolean;
  onSupplierAction: (params: {
    poId: string;
    action: 'CONFIRM' | 'SHIP' | 'UPLOAD_INVOICE' | 'REJECT';
    trackingNumber?: string;
    promisedDate?: string;
    invoiceAmount?: number;
    invoiceRef?: string;
    notes?: string;
  }) => Promise<void>;
  onTriggerChaserTick: () => Promise<void>;
}

export const SupplierTab: React.FC<SupplierTabProps> = ({
  orders,
  suppliers,
  emails,
  isProcessing,
  onSupplierAction,
  onTriggerChaserTick,
}) => {
  const [activeSupplierId, setActiveSupplierId] = useState<string>('sup-1'); // Default Sunrise Rice Co.
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [customTracking, setCustomTracking] = useState<string>('SUN-EXP-7741');
  const [invoiceAmountInput, setInvoiceAmountInput] = useState<string>('1750');
  const [showEmailModal, setShowEmailModal] = useState<EmailRecord | null>(null);

  const activeSupplier = suppliers.find((s) => s.id === activeSupplierId) || suppliers[0];

  // Filter orders relevant to this supplier
  const supplierOrders = orders.filter((p) => p.supplierId === activeSupplierId);

  return (
    <div className="space-y-8">
      {/* 1. Supplier Switcher & Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  External Supplier Fulfillment Portal
                </h2>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-medium">
                  Outside Vendor View
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulating third-party fulfillment for FreshMart's automated supply chain orders.
              </p>
            </div>
          </div>

          {/* Supplier Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Simulate As:</label>
            <select
              value={activeSupplierId}
              onChange={(e) => setActiveSupplierId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-800"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.itemCategory}) - Score {s.score}/10
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Vendor Status Banner */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <span>Official Email: <strong>{activeSupplier.email}</strong></span>
            <span>·</span>
            <span>Performance Rating: <strong>{activeSupplier.score.toFixed(1)}/10</strong></span>
            <span>·</span>
            <span>Lead Time: <strong>{activeSupplier.leadDays} day(s)</strong></span>
          </div>

          <button
            onClick={onTriggerChaserTick}
            disabled={isProcessing}
            title="Simulate 24h delay with no reply, causing the Chaser Agent to dispatch progressive reminder emails"
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-xs font-medium transition-colors cursor-pointer self-start sm:self-auto"
          >
            Simulate Silence & Test Chaser
          </button>
        </div>
      </section>

      {/* 2. Dispatched Orders Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Incoming Purchase Orders for {activeSupplier.name}
            </h3>
            <span className="text-xs text-slate-500">
              Orders automatically dispatched by FreshMart's Dispatch Agent
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {supplierOrders.length} Order(s)
          </span>
        </div>

        {supplierOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No active purchase orders currently assigned to {activeSupplier.name}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">PO Code</th>
                  <th className="py-3 px-4">Commodity / Item</th>
                  <th className="py-3 px-4 text-right">Contract Value</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Required SLA</th>
                  <th className="py-3 px-4 text-center">Invoice Status</th>
                  <th className="py-3 px-4 text-center">Chase Count</th>
                  <th className="py-3 px-4 text-right">Vendor Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supplierOrders.map((po) => {
                  return (
                    <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {po.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {po.item}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        ${po.estimatedValue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          po.status === 'REJECTED'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : po.status === 'CLOSED' && po.finalResolution === 'FULFILLED_WITH_DAMAGE_CLAIM'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : po.status === 'CLOSED'
                            ? 'bg-slate-100 text-slate-800'
                            : po.status === 'ORDERED'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {po.status === 'CLOSED' && po.finalResolution === 'FULFILLED_WITH_DAMAGE_CLAIM'
                            ? 'CLOSED (CLAIM)'
                            : po.status === 'REJECTED'
                            ? 'REJECTED (DECLINED)'
                            : po.status}
                        </span>
                        {po.damagedQty && po.damagedQty > 0 ? (
                          <span className="block text-[10px] text-amber-700 font-bold mt-0.5">
                            ⚠️ {po.damagedQty} units damaged
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {po.neededBy}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {po.documents.invoiceUploaded ? (
                          <span className="text-emerald-600 font-mono font-semibold text-[11px]">Uploaded</span>
                        ) : (
                          <span className="text-amber-600 font-mono text-[11px]">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums">
                        {po.chaseCount > 0 ? (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-bold rounded">
                            {po.chaseCount} chase(s)
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        {po.status === 'ORDERED' && (
                          <>
                            <button
                              onClick={() => onSupplierAction({ poId: po.id, action: 'CONFIRM' })}
                              disabled={isProcessing}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                            >
                              1. Confirm Order
                            </button>
                            <button
                              onClick={() =>
                                onSupplierAction({
                                  poId: po.id,
                                  action: 'REJECT',
                                  notes: `${activeSupplier.name} capacity constraint / stock shortage`,
                                } as any)
                              }
                              disabled={isProcessing}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold cursor-pointer"
                            >
                              ✕ Reject PO
                            </button>
                          </>
                        )}

                        {po.status === 'CONFIRMED' && (
                          <button
                            onClick={() =>
                              onSupplierAction({
                                poId: po.id,
                                action: 'SHIP',
                                trackingNumber: `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
                              })
                            }
                            disabled={isProcessing}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                          >
                            2. Mark Shipped
                          </button>
                        )}

                        {!po.documents.invoiceUploaded && (po.status === 'SHIPPED' || po.status === 'RECEIVED' || po.status === 'CONFIRMED') && (
                          <button
                            onClick={() =>
                              onSupplierAction({
                                poId: po.id,
                                action: 'UPLOAD_INVOICE',
                                invoiceAmount: po.estimatedValue,
                                invoiceRef: `INV-${activeSupplier.name.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                              })
                            }
                            disabled={isProcessing}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-semibold cursor-pointer"
                          >
                            3. Upload Invoice
                          </button>
                        )}

                        {po.status === 'REJECTED' && (
                          <span className="text-[11px] font-semibold text-rose-600 italic">
                            Order Declined
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. Automated Email Log (Outbox & Inbound) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-slate-100 text-slate-700">
                <Mail className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Autonomous Communication Log (Outbox & Reminders)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time audit of Dispatch Agent POs and Chaser Agent follow-up notifications.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {emails.length} Dispatched Messages
          </span>
        </div>

        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {emails.map((em) => (
            <div
              key={em.id}
              onClick={() => setShowEmailModal(em)}
              className="py-3 px-2 hover:bg-slate-50 rounded flex items-center justify-between text-xs cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  em.type === 'DISPATCH_PO'
                    ? 'bg-blue-50 text-blue-700'
                    : em.type === 'CHASER_REMINDER'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {em.type}
                </span>
                <div>
                  <div className="font-semibold text-slate-800">{em.subject}</div>
                  <div className="text-[11px] text-slate-400">
                    To: {em.to} · {new Date(em.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <span className="text-slate-400 text-xs hover:text-slate-700">
                Read Message →
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Email Body Preview Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block">{showEmailModal.type}</span>
                <h4 className="text-sm font-bold text-slate-900">{showEmailModal.subject}</h4>
              </div>
              <button
                onClick={() => setShowEmailModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-500 mb-3 space-y-1">
              <div>From: <strong>{showEmailModal.from}</strong></div>
              <div>To: <strong>{showEmailModal.to}</strong></div>
              <div>Sent: <strong>{new Date(showEmailModal.timestamp).toLocaleString()}</strong></div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {showEmailModal.body}
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => setShowEmailModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
