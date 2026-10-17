import React, { useState } from 'react';
import { PurchaseOrder, DamageInspectionResult } from '../types/logistics.ts';
import { SAMPLE_SHIPMENTS, SampleCargo } from '../utils/sampleShipments.ts';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileText,
  ArrowRight,
  Upload,
  Camera,
  Check,
  X,
  Mail,
  Send,
  Building2,
} from 'lucide-react';

interface ReceivingDockViewProps {
  orders: PurchaseOrder[];
  isProcessing: boolean;
  onReceiveCargo: (poId: string, receiptRef?: string) => Promise<void>;
  onInspectDamage: (params: {
    poId: string;
    damagedBagsCount: number;
    damageNotes?: string;
    imageBase64?: string;
  }) => Promise<DamageInspectionResult | null>;
  onCloseOrder: (poId: string) => Promise<void>;
  onSelectOrder: (order: PurchaseOrder) => void;
}

export const ReceivingDockView: React.FC<ReceivingDockViewProps> = ({
  orders,
  isProcessing,
  onReceiveCargo,
  onInspectDamage,
  onCloseOrder,
  onSelectOrder,
}) => {
  const [selectedPoId, setSelectedPoId] = useState<string>(
    orders.find((p) => p.status === 'RECEIVED' || p.status === 'SHIPPED')?.id || orders[0]?.id || ''
  );

  // Condition Choice: 'PENDING' | 'GOOD' | 'DAMAGED'
  const [conditionChoice, setConditionChoice] = useState<'GOOD' | 'DAMAGED'>('GOOD');

  // Photo & damage state
  const [customPhotoDataUrl, setCustomPhotoDataUrl] = useState<string | null>(null);
  const [selectedPresetSample, setSelectedPresetSample] = useState<SampleCargo>(SAMPLE_SHIPMENTS[0]);
  const [useCustomPhoto, setUseCustomPhoto] = useState(false);
  const [customBagsDamaged, setCustomBagsDamaged] = useState<number>(20);
  const [inspectorNotes, setInspectorNotes] = useState<string>('Torn burlap seams with grain spillage on pallet');

  const [inspectionResult, setInspectionResult] = useState<DamageInspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimSentNotice, setClaimSentNotice] = useState<string | null>(null);
  const [closureError, setClosureError] = useState<string | null>(null);

  const selectedPo = orders.find((p) => p.id === selectedPoId);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCustomPhotoDataUrl(result);
      setUseCustomPhoto(true);
      setInspectionResult(null);
    };
    reader.readAsDataURL(file);
  };

  // Active photo for inspection
  const activeImageDataUrl = useCustomPhoto && customPhotoDataUrl
    ? customPhotoDataUrl
    : selectedPresetSample.dataUrl;

  // Run multimodal inspection
  const handleRunAiInspection = async () => {
    if (!selectedPoId) return;
    setIsInspecting(true);
    setClosureError(null);
    try {
      const res = await onInspectDamage({
        poId: selectedPoId,
        damagedBagsCount: customBagsDamaged,
        damageNotes: inspectorNotes,
        imageBase64: activeImageDataUrl,
      });
      setInspectionResult(res);
    } finally {
      setIsInspecting(false);
    }
  };

  // Finalize damaged delivery: sign GRN with damage flags and emit supplier notice
  const handleConfirmDamagedReceipt = async () => {
    if (!selectedPo) return;
    setIsSubmittingClaim(true);
    try {
      // 1. Issue Goods Receipt Note
      await onReceiveCargo(selectedPo.id, `GRN-DMG-${Math.floor(1000 + Math.random() * 9000)}`);

      // 2. Run inspection if not run yet
      if (!inspectionResult) {
        await onInspectDamage({
          poId: selectedPo.id,
          damagedBagsCount: customBagsDamaged,
          damageNotes: inspectorNotes,
          imageBase64: activeImageDataUrl,
        });
      }

      setClaimSentNotice(
        `Damage claim verified and dispatched to ${selectedPo.supplierName}. Goods Receipt Note issued with ${customBagsDamaged} damaged units flagged.`
      );
      setTimeout(() => setClaimSentNotice(null), 8000);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Finalize clean delivery: sign GRN with zero defects
  const handleConfirmCleanReceipt = async () => {
    if (!selectedPo) return;
    setIsSubmittingClaim(true);
    try {
      await onReceiveCargo(selectedPo.id, `GRN-CLEAN-${Math.floor(1000 + Math.random() * 9000)}`);
      setClaimSentNotice(`Clean delivery confirmed! Goods Receipt Note issued with 0 defects.`);
      setTimeout(() => setClaimSentNotice(null), 6000);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleCloseAttempt = async (poId: string) => {
    setClosureError(null);
    try {
      await onCloseOrder(poId);
    } catch (err: any) {
      setClosureError(err.message || 'Complete flow check failed');
    }
  };

  const dockOrders = orders.filter(
    (o) => o.status === 'SHIPPED' || o.status === 'RECEIVED' || o.status === 'DOCS_COMPLETE' || o.status === 'CONFIRMED'
  );

  return (
    <div className="space-y-6">
      {/* 1. Header & Active Cargo Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-amber-50 text-amber-700">
                <Truck className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Warehouse Receiving Dock #4 (Ravi's Terminal)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Physical receiving inspection: choose cargo condition. If damaged, upload inspection photos for Gemini Multimodal AI verification and automatic supplier claim notice.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Select Shipment:</label>
            <select
              value={selectedPoId}
              onChange={(e) => {
                setSelectedPoId(e.target.value);
                setInspectionResult(null);
                setClaimSentNotice(null);
              }}
              className="text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
            >
              {dockOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id}: {o.item} ({o.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notices */}
        {claimSentNotice && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{claimSentNotice}</span>
          </div>
        )}

        {closureError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
            <span><strong>Documentation Requirement:</strong> {closureError}</span>
          </div>
        )}

        {/* Selected Shipment Summary */}
        {selectedPo && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 text-sm">{selectedPo.id}</span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-800">{selectedPo.item}</span>
                <span className="text-slate-400">·</span>
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-200 text-slate-900 text-[11px]">
                  {selectedPo.status}
                </span>
              </div>
              <div className="text-slate-500">
                Supplier: <strong>{selectedPo.supplierName}</strong> · Contract Value: <strong className="font-mono tabular-nums">${selectedPo.estimatedValue.toLocaleString()} USD</strong> · Target: {selectedPo.neededBy}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedPo.status === 'DOCS_COMPLETE' && (
                <button
                  onClick={() => handleCloseAttempt(selectedPo.id)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold cursor-pointer shadow-xs"
                >
                  Verify & Close Order
                </button>
              )}

              <button
                onClick={() => onSelectOrder(selectedPo)}
                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Track Lifecycle →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Step 1: Physical Condition Assessment (Good vs Damaged) */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Step 1: Receiver Physical Condition Assessment
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ravi inspects the physical cargo upon truck unloading at dock #4. Is the shipment in good condition, or were defects observed?
          </p>
        </div>

        {/* Condition Cards Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option A: Good Condition */}
          <button
            type="button"
            onClick={() => {
              setConditionChoice('GOOD');
              setInspectionResult(null);
            }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              conditionChoice === 'GOOD'
                ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-200 shadow-xs'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              conditionChoice === 'GOOD' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Pristine Delivery (Zero Defects)
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                All bags and cartons intact. Seals unbroken, zero transit tears, no grain leaks or moisture. Ready for clean GRN sign-off without photo evidence.
              </p>
            </div>
          </button>

          {/* Option B: Damaged Goods */}
          <button
            type="button"
            onClick={() => setConditionChoice('DAMAGED')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              conditionChoice === 'DAMAGED'
                ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-200 shadow-xs'
                : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              conditionChoice === 'DAMAGED' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">
                Damaged / Compromised Goods Detected
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Torn burlap sacks, punctured packaging, grain leaks, or crushed cartons. Requires photo upload for Gemini Multimodal AI verification and automatic supplier claim notice.
              </p>
            </div>
          </button>
        </div>

        {/* If Condition is GOOD -> Simple 1-Click Clean GRN Signoff */}
        {conditionChoice === 'GOOD' && (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-950 block">
                Ready to Sign Clean Goods Receipt Note (GRN)
              </span>
              <p className="text-emerald-800">
                Zero damage detected. No cargo photo upload is required.
              </p>
            </div>

            <button
              onClick={handleConfirmCleanReceipt}
              disabled={isSubmittingClaim || isProcessing}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Clean Receipt & Sign GRN</span>
            </button>
          </div>
        )}
      </section>

      {/* 3. Step 2: Photo Upload & Multimodal Verification (ONLY SHOWN IF DAMAGED) */}
      {conditionChoice === 'DAMAGED' && (
        <section className="bg-white border border-amber-200 rounded-xl p-5 shadow-2xs space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-purple-50 text-purple-700">
                <Camera className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Step 2: Upload Cargo Evidence for Gemini Multimodal AI Verification
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload a real cargo photo or select a warehouse camera preset. Gemini Vision analyzes the defect, recalculates vendor reliability ratings, and drafts a formal claim email to {selectedPo?.supplierName}.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Visual Cargo Frame & Upload */}
            <div className="lg:col-span-5 space-y-4">
              {/* Photo Source Selector: Upload File vs Presets */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setUseCustomPhoto(false)}
                  className={`flex-1 py-1.5 rounded-md font-semibold transition-colors cursor-pointer text-center ${
                    !useCustomPhoto ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Dock Camera Presets
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomPhoto(true)}
                  className={`flex-1 py-1.5 rounded-md font-semibold transition-colors cursor-pointer text-center ${
                    useCustomPhoto ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Upload Custom Photo
                </button>
              </div>

              {/* Preset Selector */}
              {!useCustomPhoto ? (
                <div className="grid grid-cols-2 gap-2">
                  {SAMPLE_SHIPMENTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedPresetSample(s);
                        setCustomBagsDamaged(s.estimatedDamageCount || 20);
                        setInspectionResult(null);
                      }}
                      className={`p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        selectedPresetSample.id === s.id
                          ? 'border-amber-600 bg-amber-50/50 font-semibold text-slate-900'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="truncate font-medium">{s.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {s.estimatedDamageCount} damaged units
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">
                      Choose Photo from Device / Camera
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      JPG, PNG, WebP up to 10MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {customPhotoDataUrl && (
                    <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Custom image loaded successfully
                    </div>
                  )}
                </div>
              )}

              {/* Visual Cargo Frame */}
              <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-4/3 flex items-center justify-center">
                <img
                  src={activeImageDataUrl}
                  alt="Delivered cargo evidence"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded">
                  EVIDENCE CAM · {selectedPo?.id || 'PO-105'}
                </div>
              </div>

              {/* Damaged Unit & Notes Inputs */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700 shrink-0">
                    Damaged Units:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={customBagsDamaged}
                    onChange={(e) => setCustomBagsDamaged(Number(e.target.value))}
                    className="w-24 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 tabular-nums"
                  />
                  <span className="text-xs text-slate-400">units / sacks</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inspector Observation Notes:
                  </label>
                  <input
                    type="text"
                    value={inspectorNotes}
                    onChange={(e) => setInspectorNotes(e.target.value)}
                    placeholder="e.g. Torn burlap seams with grain spillage on dock..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: AI Analysis & Automated Claim Notice */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Multimodal AI Defect Verification
                  </span>
                  <button
                    onClick={handleRunAiInspection}
                    disabled={isInspecting || isProcessing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isInspecting ? 'Verifying with Gemini...' : 'Verify Damage with Gemini AI'}</span>
                  </button>
                </div>

                {inspectionResult ? (
                  <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-purple-700" />
                        AI Verified: {inspectionResult.damageLevel} DAMAGE
                      </span>
                      <span className="font-mono text-purple-700 font-bold tabular-nums">
                        Confidence: {(inspectionResult.confidenceScore * 100).toFixed(0)}%
                      </span>
                    </div>

                    <p className="text-xs text-purple-950 leading-relaxed font-sans">
                      {inspectionResult.analysisSummary}
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-purple-200">
                      <div>
                        <span className="text-purple-600 block text-[11px]">Damaged Quantity</span>
                        <strong className="text-purple-950 font-mono text-sm tabular-nums">
                          {inspectionResult.damagedBagsCount} units ({inspectionResult.damagePercentage.toFixed(1)}%)
                        </strong>
                      </div>
                      <div>
                        <span className="text-purple-600 block text-[11px]">Supplier Score Impact</span>
                        <strong className="text-red-600 font-mono text-sm tabular-nums">
                          -{inspectionResult.scorePenalty.toFixed(1)} Rating Pts
                        </strong>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-purple-200 text-xs space-y-1.5 text-purple-950">
                      <div className="font-bold flex items-center gap-1 text-purple-900">
                        <Mail className="w-3.5 h-3.5 text-purple-600" />
                        <span>Automated Damage Claim Ready for Dispatch</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Clicking the button below will sign the Goods Receipt Note (GRN) with {customBagsDamaged} damaged units flagged and <strong>automatically send a formal defect claim notice email to {selectedPo?.supplierName} ({selectedPo?.supplierId ? 'dispatch' : 'vendor'})</strong> requesting an amended invoice.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    Click <strong>"Verify Damage with Gemini AI"</strong> to run computer vision analysis on the uploaded photo.
                  </div>
                )}
              </div>

              {/* Action: Sign Damaged GRN & Send Claim to Supplier */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 block">
                    Submit Damaged Receipt & Issue Supplier Claim
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Updates GRN, re-scores vendor, and notifies {selectedPo?.supplierName}
                  </span>
                </div>

                <button
                  onClick={handleConfirmDamagedReceipt}
                  disabled={isSubmittingClaim || isProcessing}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmittingClaim ? 'Submitting...' : 'Issue GRN & Send Claim to Supplier'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Complete Flow Dual-Doc Checklist */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Step 3: Dual-Document Verification Status ({selectedPo?.id})
            </h3>
            <span className="text-xs text-slate-500">
              Complete flow invariant: Order cannot close without both Goods Receipt Note (GRN) and Commercial Invoice.
            </span>
          </div>

          <span className="text-[11px] font-mono font-bold text-slate-500">
            {selectedPo?.status === 'DOCS_COMPLETE'
              ? 'Ready for Settlement'
              : selectedPo?.status === 'CLOSED'
              ? 'Archived'
              : 'Awaiting Matching'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm">Goods Receipt Note (GRN)</div>
              <div className="text-slate-500 font-mono mt-0.5">
                {selectedPo?.documents.receiptRef || 'Not issued yet (Pending dock arrival)'}
              </div>
            </div>
            {selectedPo?.documents.receiptUploaded ? (
              <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            ) : (
              <span className="text-slate-400 text-xs font-mono font-semibold">Pending</span>
            )}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm">Commercial Invoice</div>
              <div className="text-slate-500 font-mono mt-0.5">
                {selectedPo?.documents.invoiceRef
                  ? `${selectedPo.documents.invoiceRef} ($${selectedPo.documents.invoiceAmount?.toLocaleString()})`
                  : 'Pending supplier upload'}
              </div>
            </div>
            {selectedPo?.documents.invoiceUploaded ? (
              <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            ) : (
              <span className="text-amber-700 font-semibold font-mono text-xs">
                {selectedPo?.status === 'RECEIVED' ? 'Missing (Due)' : 'Pending Delivery'}
              </span>
            )}
          </div>
        </div>

        {selectedPo?.status === 'DOCS_COMPLETE' && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => handleCloseAttempt(selectedPo.id)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalize & Close Order in Enterprise Ledger</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
