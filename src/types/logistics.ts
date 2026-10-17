export type POStatus =
  | 'REQUESTED'
  | 'PENDING_MANAGER'
  | 'APPROVED'
  | 'REJECTED'
  | 'ORDERED'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'RECEIVED'
  | 'DOCS_COMPLETE'
  | 'CLOSED';

export interface Supplier {
  id: string;
  name: string;
  email: string;
  itemCategory: string;
  score: number; // 0.0 - 10.0
  onTimeRate: number; // 0.0 - 1.0 (e.g. 0.90 = 90%)
  damageRate: number; // 0.0 - 1.0 (e.g. 0.05 = 5%)
  leadDays: number;
  totalOrders: number;
  status: 'ACTIVE' | 'FLAGGED_REVIEW' | 'RESTRICTED';
  notes?: string;
}

export interface PurchaseOrder {
  id: string; // e.g. PO-101
  requestId: string;
  item: string;
  quantity: number;
  unit: string;
  estimatedValue: number;
  neededBy: string;
  handlerName: string;
  supplierId: string | null;
  supplierName?: string;
  status: POStatus;
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: 'AUTO_PILOT' | 'MEENA_MANAGER';
  approvalReason?: string;
  managerAiSummary?: string;
  orderedAt?: string;
  confirmedAt?: string;
  promisedDate?: string;
  shippedAt?: string;
  trackingNumber?: string;
  receivedAt?: string;
  damagedQty?: number;
  damageNotes?: string;
  damageProofImage?: string;
  closedAt?: string;
  finalResolution?: 'FULFILLED_PERFECT' | 'FULFILLED_WITH_DAMAGE_CLAIM' | 'REJECTED_BY_MANAGER' | 'REJECTED_BY_SUPPLIER' | 'CANCELLED_DELAY_BREACH';
  rejectionReason?: string;
  chaseCount: number;
  lastChasedAt?: string;
  isFlaggedIdle: boolean;
  idleReason?: string;
  documents: {
    receiptUploaded: boolean;
    receiptTimestamp?: string;
    receiptRef?: string;
    invoiceUploaded: boolean;
    invoiceTimestamp?: string;
    invoiceAmount?: number;
    invoiceRef?: string;
  };
}

export interface StepLog {
  id: string;
  poId: string;
  step: POStatus | 'CHASED' | 'INSPECTED' | 'POLICY_EVAL' | 'SCORE_UPDATED';
  actor: 'RAVI_HANDLER' | 'INTAKE_AGENT' | 'APPROVAL_AGENT' | 'MEENA_MANAGER' | 'DISPATCH_AGENT' | 'SUNRISE_SUPPLIER' | 'GOLDEN_GRAIN_SUPPLIER' | 'TRACKER_AGENT' | 'CHASER_AGENT' | 'OUTCOME_AGENT' | 'SELF_HEALING_AGENT';
  message: string;
  timestamp: string;
  meta?: Record<string, any>;
}

export interface EmailRecord {
  id: string;
  poId: string;
  direction: 'OUTBOUND' | 'INBOUND';
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  type: 'DISPATCH_PO' | 'CHASER_REMINDER' | 'CONFIRMATION' | 'SHIPPING_NOTICE' | 'INVOICE_SUBMISSION' | 'DAMAGE_CLAIM';
}

export interface PolicyConfig {
  autoApprovalValueLimit: number; // e.g. 2500
  minimumSupplierScore: number; // e.g. 7.0
  chaseIntervalHours: number; // e.g. 24
  maxChasesBeforeEscalation: number; // e.g. 2
  requireDualDocForClosure: boolean; // true
}

export interface SystemStats {
  fastestCycleMinutes: number;
  averageCycleHours: number;
  autoApprovalRate: number; // percentage
  activeAutonomousAgents: number;
  selfHealedOrdersCount: number;
  totalOrdersProcessed: number;
}

export interface McpToolDeclaration {
  name: string;
  category: 'INTAKE' | 'APPROVAL' | 'ROUTING' | 'TRACKING' | 'MULTIMODAL' | 'FEEDBACK_LOOP';
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; example?: any }>;
    required: string[];
  };
  returns: string;
  executionCount: number;
  lastExecutedAt?: string;
}

export interface DamageInspectionResult {
  hasDamage: boolean;
  damageLevel: 'NONE' | 'LOW' | 'MODERATE' | 'SEVERE';
  damagePercentage: number;
  detectedDamageTypes: string[];
  damagedBagsCount: number;
  confidenceScore: number;
  analysisSummary: string;
  recommendedAction: string;
  scorePenalty: number;
}
