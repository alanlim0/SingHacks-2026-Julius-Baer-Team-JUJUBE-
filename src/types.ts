export interface Client {
  client_id: string;
  client_name: string;
  age: number | null;
  gender: string | null;
  nationality: string;
  country_of_residence: string;
  tax_domicile: string;
  booking_centre: "Singapore" | "Hong Kong";
  rm_id: string;
  rm_name: string;
  rm_desk: string;
  base_currency: string;
  wealth_band: "HNW" | "UHNW";
  total_aum_usd: number;
  life_stage: string;
  source_of_wealth: string;
  risk_profile: "Conservative" | "Income" | "Balanced" | "Balanced Growth" | "Growth" | "Dynamic";
  risk_tolerance_score: number;
  investment_horizon_years: number;
  liquidity_needs: "Low" | "Medium" | "High";
  objectives: string;
  kyc_review_due: string;
}

export interface Portfolio {
  portfolio_id: string;
  client_id: string;
  portfolio_name: string;
  mandate_code: string;
  mandate_name: string;
  service_model: "Discretionary" | "Advisory" | "Custody";
  base_currency: string;
  inception_date: string;
  benchmark: string;
  "aum_2025-12-31": number;
  "aum_2026-02-27": number;
  "aum_2026-03-31": number;
  "aum_2026-06-30": number;
  "aum_2026-08-26": number;
  aum_usd_current: number;
}

export interface Holding {
  snapshot_date: string;
  portfolio_id: string;
  client_id: string;
  instrument_id: string;
  instrument_name: string;
  asset_class: string;
  sub_asset_class: string;
  sector: string;
  region: string;
  currency: string;
  quantity: number;
  price_local: number;
  instrument_ccy: string;
  market_value_local: number;
  market_value_base: number;
  market_value_usd: number;
  weight_pct: number;
  avg_cost_local: number;
  cost_basis_base: number;
  unrealised_pnl_base: number;
  unrealised_pnl_pct: number;
  lending_value_base: number;
  advance_rate_pct: number;
  liquidity_tier: "Daily" | "Weekly" | "Monthly" | "Quarterly Gate" | "Illiquid";
  valuation_date: string;
}

export interface Instrument {
  instrument_id: string;
  instrument_name: string;
  asset_class: string;
  sub_asset_class: string;
  sector: string;
  region: string;
  currency: string;
  liquidity_tier: string;
  underlying_reference?: string | null;
  sustainability_excluded?: "Y" | "N" | null;
  concentration_limit_applies?: "Y" | "N" | null;
  "price_2025-12-31": number;
  "price_2026-02-27": number;
  "price_2026-03-31": number;
  "price_2026-06-30": number;
  "price_2026-08-26": number;
}

export interface Mandate {
  mandate_code: string;
  mandate_name: string;
  asset_class: string;
  min_pct: number;
  target_pct: number;
  max_pct: number;
  max_single_position_pct: number;
  mandate_notes: string;
}

export interface Transaction {
  transaction_id: string;
  trade_date: string;
  settlement_date: string;
  portfolio_id: string;
  client_id: string;
  transaction_type: string;
  instrument_id: string;
  instrument_name: string;
  asset_class: string;
  quantity: number;
  gross_amount_base: number;
  net_amount_base: number;
  currency: string;
  notes?: string | null;
}

export interface CreditFacility {
  facility_id: string;
  client_id: string;
  collateral_portfolio_id: string;
  facility_type: string;
  facility_ccy: string;
  credit_limit: number;
  interest_rate_pct: number;
  margin_call_ltv_pct: number;
  "drawn_2025-12-31": number;
  "collateral_market_value_2025-12-31": number;
  "lending_value_2025-12-31": number;
  "ltv_pct_2025-12-31": number;
  "headroom_2025-12-31": number;
  "drawn_2026-02-27": number;
  "collateral_market_value_2026-02-27": number;
  "lending_value_2026-02-27": number;
  "ltv_pct_2026-02-27": number;
  "headroom_2026-02-27": number;
  "drawn_2026-03-31": number;
  "collateral_market_value_2026-03-31": number;
  "lending_value_2026-03-31": number;
  "ltv_pct_2026-03-31": number;
  "headroom_2026-03-31": number;
  "drawn_2026-06-30": number;
  "collateral_market_value_2026-06-30": number;
  "lending_value_2026-06-30": number;
  "ltv_pct_2026-06-30": number;
  "headroom_2026-06-30": number;
  "drawn_2026-08-26": number;
  "collateral_market_value_2026-08-26": number;
  "lending_value_2026-08-26": number;
  "ltv_pct_2026-08-26": number;
  "headroom_2026-08-26": number;
  utilisation_pct_current: number;
}

export interface Commitment {
  commitment_id: string;
  client_id: string;
  portfolio_id: string;
  fund_name: string;
  currency: string;
  committed: number;
  called_to_date: number;
  uncalled: number;
  expected_call_window: string;
}

export interface PlannedCashNeed {
  need_id: string;
  client_id: string;
  description: string;
  currency: string;
  amount: number;
  due_from: string;
  due_to: string;
  recurrence: string;
  certainty: string;
}

export interface MarketContext {
  snapshot_date: string;
  series_id: string;
  series_name: string;
  category: string;
  unit: string;
  value: number;
  snapshot_label: string;
}

export interface EventLogEntry {
  event_date: string;
  event_type: string;
  region: string;
  description: string;
  primary_transmission: string;
  severity: "Severe" | "High" | "Medium" | "Low";
}

export interface RMNote {
  note_id: string;
  client_id: string;
  note_date: string;
  rm_id: string;
  rm_name: string;
  channel: string;
  note: string;
}

// Derived Analytical Types
export type UrgencyLevel = "Critical" | "High" | "Moderate" | "Monitoring";

export interface PriorityClientItem {
  client: Client;
  portfolios: Portfolio[];
  urgencyScore: number; // 0 - 100
  urgencyLevel: UrgencyLevel;
  primaryTriggers: string[];
  recommendedAction: string;
  keyRisks: {
    marginRisk?: {
      currentLtv: number;
      threshold: number;
      headroomUsd: number;
      status: "critical" | "warning" | "healthy";
    };
    sustainabilityBreaches?: string[];
    mandateDrifts?: string[];
    concentrationAlerts?: string[];
    liquidityShortfallUsd?: number;
    taxMismatch?: boolean;
    kycDueSoon?: boolean;
  };
  ytdReturnPct: number;
  ytdAumChangeUsd: number;
}

export interface LookThroughExposure {
  instrument_id: string;
  instrument_name: string;
  reportedAssetClass: string;
  effectiveAssetClass: string;
  underlyingReference?: string | null;
  weight_pct: number;
  market_value_usd: number;
  concentrationRisk: boolean;
}

export interface MandateComplianceResult {
  mandate_code: string;
  mandate_name: string;
  portfolio_id: string;
  assetClassCompliance: {
    assetClass: string;
    actualPct: number;
    minPct: number;
    targetPct: number;
    maxPct: number;
    status: "compliant" | "overweight" | "underweight";
    driftPct: number;
  }[];
  singlePositionBreaches: {
    instrument_name: string;
    weightPct: number;
    maxAllowedPct: number;
  }[];
  sustainabilityBreaches: {
    instrument_name: string;
    sector: string;
    weightPct: number;
    reason: string;
  }[];
}

export interface ScenarioImpactResult {
  scenarioId: string;
  scenarioName: string;
  description: string;
  estimatedAumImpactPct: number;
  estimatedAumImpactUsd: number;
  facilityLtvImpact?: {
    beforeLtv: number;
    afterLtv: number;
    marginCallTriggered: boolean;
  };
  affectedSectors: { sector: string; deltaPct: number }[];
  strategicAdvice: string;
}

export interface AdvisoryMemo {
  executiveSummary: string;
  portfolioReview: string;
  keyRiskFactors: string[];
  talkingPoints: string[];
  proposedTrades: {
    action: string;
    instrumentName: string;
    weightPctChange: string;
    rationale: string;
    mandateCheck: string;
  }[];
  governanceNotes: string;
}

// -------------------------------------------------------------
// Papermark Virtual Data Room (VDR) Types
// -------------------------------------------------------------
export interface VDRDocument {
  id: string;
  folderId: string;
  title: string;
  fileName: string;
  fileType: "pdf" | "xlsx" | "docx" | "pptx";
  fileSizeBytes: number;
  pageCount: number;
  uploadedAt: string;
  uploadedBy: string;
  version: number;
  watermarkEnabled: boolean;
  downloadAllowed: boolean;
  status: "Active" | "Restricted" | "Pending Review" | "Expiring Soon" | "Expired";
  docCategory?: "NDA" | "KYC" | "Lombard" | "Mandate" | "Syndicate" | "Corporate";
  expiresAt?: string; // ISO date format YYYY-MM-DD
  summary: string;
  pages: {
    pageNumber: number;
    title: string;
    content: string;
    avgTimeSpentSeconds: number;
  }[];
  viewCount: number;
  uniqueViewers: number;
}

export interface VDRFolder {
  id: string;
  indexCode: string; // e.g. "01", "02"
  name: string;
  description: string;
  restricted: boolean;
  documentsCount: number;
}

export interface VDRLink {
  id: string;
  slug: string;
  name: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  requireEmail: boolean;
  requireNda: boolean;
  watermarkEnabled: boolean;
  allowDownload: boolean;
  passwordProtected: boolean;
  password?: string;
  viewsCount: number;
  lastViewedAt: string | null;
  active: boolean;
  targetFolderId?: string; // If restricted to specific folder
}

export interface VDRViewerEvent {
  id: string;
  viewerEmail: string;
  viewerIp: string;
  viewerLocation: string;
  viewerDevice: string;
  linkId: string;
  documentId: string;
  documentTitle: string;
  timestamp: string;
  durationSeconds: number;
  completionPct: number;
  pagesViewed: number[];
  watermarkSignature: string;
  downloaded: boolean;
  ndaSigned: boolean;
}

export interface VDRQnAItem {
  id: string;
  documentId?: string;
  documentTitle?: string;
  askedByEmail: string;
  askedAt: string;
  question: string;
  status: "Open" | "In Review" | "Answered";
  answeredBy?: string;
  answeredAt?: string;
  answer?: string;
}

export interface VDRAuditLog {
  id: string;
  timestamp: string;
  userOrEmail: string;
  action: "VIEW_PAGE" | "SIGN_NDA" | "CREATE_LINK" | "UPDATE_PERMISSIONS" | "DOWNLOAD_FILE" | "REVOKE_ACCESS" | "ASK_QNA";
  details: string;
  ipAddress: string;
  riskRating: "Low" | "Medium" | "High";
}

export interface VDRDataRoom {
  id: string;
  clientId?: string;
  clientName?: string;
  name: string;
  slug: string;
  dealType: "Private Wealth Mandate" | "M&A Due Diligence" | "Lombard Credit Facility" | "Private Equity Co-Investment";
  status: "Active" | "Archived" | "Draft";
  ndaText: string;
  totalDocuments: number;
  totalSizeMb: number;
  totalViews: number;
  avgCompletionPct: number;
  folders: VDRFolder[];
  documents: VDRDocument[];
  links: VDRLink[];
  viewers: VDRViewerEvent[];
  qnaItems: VDRQnAItem[];
  auditLogs: VDRAuditLog[];
}


