import React, { useState } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Shield,
  Sparkles,
  ArrowUpRight,
  DollarSign,
  PieChart as PieChartIcon,
  CheckCircle2,
  ChevronRight,
  FileText,
  Copy,
  Check,
  Zap,
  Layers,
  Coins,
  Building2,
  Briefcase,
  ArrowDownRight,
  ShieldCheck,
  Scale,
} from "lucide-react";
import {
  Client,
  PriorityClientItem,
  Holding,
  CreditFacility,
  PlannedCashNeed,
  Commitment,
} from "../types";
import { ClientRiskGauge, LombardLtvMeter } from "./RiskMeter";
import { AllocationComparison } from "./AllocationComparison";

interface ClientOverviewProps {
  client: Client;
  priorityItem?: PriorityClientItem;
  holdings: Holding[];
  facilities: CreditFacility[];
  cashNeeds: PlannedCashNeed[];
  commitments: Commitment[];
  onNavigateTab: (tabId: "portfolio" | "credit" | "briefing" | "stress" | "notes") => void;
}

export const ClientOverview: React.FC<ClientOverviewProps> = ({
  client,
  priorityItem,
  holdings,
  facilities,
  cashNeeds,
  commitments,
  onNavigateTab,
}) => {
  const [copiedPitchId, setCopiedPitchId] = useState<string | null>(null);
  const [showAllocationDrift, setShowAllocationDrift] = useState<boolean>(false);

  // 1. Calculate Visual AUM metrics
  const totalAum = client.total_aum_usd ?? 0;
  const facility = facilities[0];
  const currentLtv = facility ? (facility["ltv_pct_2026-08-26"] ?? 0) : 0;
  const marginCallLtv = facility ? (facility.margin_call_ltv_pct ?? 70) : 70;
  const headroom = facility ? (facility["headroom_2026-08-26"] ?? 0) : 0;

  // Asset class breakdown
  const assetClassMap = new Map<string, number>();
  let totalHoldingsVal = 0;
  for (const h of holdings) {
    const val = h.market_value_usd ?? 0;
    assetClassMap.set(h.asset_class, (assetClassMap.get(h.asset_class) || 0) + val);
    totalHoldingsVal += val;
  }
  const assetClasses = Array.from(assetClassMap.entries())
    .map(([name, val]) => ({
      name,
      value: val,
      pct: totalHoldingsVal > 0 ? (val / totalHoldingsVal) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Cash and liquid assets
  const cashVal = assetClassMap.get("Cash & Liquidity") || assetClassMap.get("Cash") || totalAum * 0.08;
  const cashPct = totalAum > 0 ? (cashVal / totalAum) * 100 : 8;

  // Currency breakdown estimate
  const currencySplit = [
    { code: "USD", pct: 58, color: "bg-[#1A1A1A]" },
    { code: "EUR", pct: 18, color: "bg-[#C5A059]" },
    { code: "SGD", pct: 14, color: "bg-[#70706B]" },
    { code: "CHF", pct: 6, color: "bg-[#8C6D23]" },
    { code: "HKD", pct: 4, color: "bg-[#D1D1CC]" },
  ];

  // Colors for asset classes
  const assetColors: Record<string, string> = {
    Equities: "bg-[#1A1A1A]",
    "Fixed Income": "bg-[#C5A059]",
    "Alternatives & Private Markets": "bg-[#8C6D23]",
    Alternatives: "bg-[#8C6D23]",
    "Cash & Liquidity": "bg-[#2D8A39]",
    Cash: "bg-[#2D8A39]",
    "Structured Products": "bg-[#4A5568]",
    Commodities: "bg-[#D97706]",
  };

  // 2. Identify Actions Needed
  interface ActionItem {
    id: string;
    title: string;
    severity: "critical" | "warning" | "advisory";
    category: "Lombard Credit" | "Mandate ESG" | "Asset Allocation" | "Tax & Domicile" | "Liquidity";
    description: string;
    actionLabel: string;
    targetTab: "portfolio" | "credit" | "briefing" | "stress" | "notes";
  }

  const actionsNeeded: ActionItem[] = [];

  // Margin Check
  if (priorityItem?.keyRisks.marginRisk && priorityItem.keyRisks.marginRisk.status !== "healthy") {
    const marginRisk = priorityItem.keyRisks.marginRisk;
    const ltvVal = marginRisk.currentLtv != null ? marginRisk.currentLtv.toFixed(1) : currentLtv.toFixed(1);
    const threshVal = marginRisk.threshold ?? marginCallLtv ?? 70;
    actionsNeeded.push({
      id: "margin-action",
      title: `Lombard Margin Warning: LTV at ${ltvVal}%`,
      severity: marginRisk.status === "critical" ? "critical" : "warning",
      category: "Lombard Credit",
      description: `LTV of ${ltvVal}% is approaching margin call threshold (${threshVal}%). Shortfall or negative headroom requires immediate client notification to pledge collateral or pay down debt.`,
      actionLabel: "Simulate Collateral Paydown",
      targetTab: "credit",
    });
  }

  // Sustainability Check
  if (priorityItem?.keyRisks.sustainabilityBreaches && priorityItem.keyRisks.sustainabilityBreaches.length > 0) {
    actionsNeeded.push({
      id: "esg-action",
      title: `Mandate ESG Exclusion Breach: ${priorityItem.keyRisks.sustainabilityBreaches[0]}`,
      severity: "warning",
      category: "Mandate ESG",
      description: `Holdings violate client's sustainability exclusion policy. Recommend divesting non-compliant positions and rotating proceeds into Julius Baer certified ESG equivalents.`,
      actionLabel: "Divest & Rebalance Position",
      targetTab: "portfolio",
    });
  }

  // SAA Drift Check
  if (priorityItem?.keyRisks.mandateDrifts && priorityItem.keyRisks.mandateDrifts.length > 0) {
    const driftDescription = priorityItem.keyRisks.mandateDrifts[0];
    actionsNeeded.push({
      id: "saa-drift-action",
      title: `Strategic Asset Allocation Drift Alert`,
      severity: "advisory",
      category: "Asset Allocation",
      description: `${driftDescription}. Portfolio rebalancing is recommended to bring allocations back within Julius Baer mandate limits.`,
      actionLabel: "Open SAA Rebalancing",
      targetTab: "portfolio",
    });
  }

  // Tax Mismatch Check
  if (client.tax_domicile !== client.country_of_residence) {
    actionsNeeded.push({
      id: "tax-action",
      title: `Cross-Border Domicile Review: ${client.tax_domicile} vs ${client.country_of_residence}`,
      severity: "advisory",
      category: "Tax & Domicile",
      description: `Client is tax domiciled in ${client.tax_domicile} while residing in ${client.country_of_residence}. Cross-border withholding treaty status and CRS reporting compliance require annual review.`,
      actionLabel: "Review Cross-Border Status",
      targetTab: "notes",
    });
  }

  // Upcoming planned cash needs or capital call
  if (cashNeeds.length > 0) {
    const nextNeed = cashNeeds[0];
    const amountVal = nextNeed.amount_usd ?? 0;
    actionsNeeded.push({
      id: "cash-need-action",
      title: `Upcoming Planned Cash Outflow: USD ${(amountVal / 1e6).toFixed(2)}M`,
      severity: "advisory",
      category: "Liquidity",
      description: `Planned withdrawal of USD ${(amountVal / 1e6).toFixed(2)}M scheduled for ${nextNeed.planned_date} for ${nextNeed.purpose}. Ensure sufficient cash buffer or credit facility headroom is reserved.`,
      actionLabel: "Inspect Cash Runway",
      targetTab: "notes",
    });
  }

  // 3. Upselling Opportunities
  interface UpsellOpportunity {
    id: string;
    title: string;
    productCategory: string;
    rationale: string;
    potentialImpact: string;
    pitchScript: string;
    actionLabel: string;
    targetTab: "portfolio" | "credit" | "briefing" | "stress" | "notes";
  }

  const upsellingOpportunities: UpsellOpportunity[] = [
    {
      id: "upsell-cash",
      title: "Cash Yield Optimization & Treasury Arbitrage",
      productCategory: "Liquidity & Fixed Income",
      rationale: `Client holds approximately USD ${(cashVal / 1e6).toFixed(1)}M (${cashPct.toFixed(1)}%) in unallocated cash deposits. Deploying into Julius Baer Ultra-Short Duration Treasury paper captures attractive risk-free yield without sacrificing T+1 daily liquidity.`,
      potentialImpact: `+$${Math.round((cashVal * 0.0125) / 1000) * 1000} estimated incremental annual net income (+125 bps net pickup)`,
      pitchScript: `"Given your current liquid cash reserves of ${(cashVal / 1e6).toFixed(1)}M, we can transition this into our Julius Baer Ultra-Short Liquidity Strategy yielding 5.15% with daily liquidity, capturing an extra $${Math.round((cashVal * 0.0125) / 1000)}k in annual yield."`,
      actionLabel: "Pitch Cash Yield Solution",
      targetTab: "briefing",
    },
    {
      id: "upsell-dpm",
      title: "Discretionary Portfolio Management (DPM) Mandate Conversion",
      productCategory: "CIO Mandates",
      rationale: `Transition client from self-directed Advisory to Julius Baer Global Dynamic DPM. Eliminates trade execution delays, enforces automated risk rebalancing, and accesses institutional wholesale pricing on global asset classes.`,
      potentialImpact: `Reduces portfolio tracking error by 1.8%; converts account into 1.15% recurring management fee`,
      pitchScript: `"To free you from day-to-day transaction approvals and ensure institutional rebalancing during fast-moving market dislocations, our CIO Discretionary Mandate would manage tactical tilts automatically while strictly adhering to your risk tolerance score of ${client.risk_tolerance_score}."`,
      actionLabel: "Generate DPM Mandate Proposal",
      targetTab: "briefing",
    },
    {
      id: "upsell-lombard",
      title: "Lombard Facility Expansion & Tactical Liquidity Line",
      productCategory: "Lombard Credit Solutions",
      rationale: facility
        ? `Client currently utilizes Lombard credit with headroom of USD ${(headroom / 1e6).toFixed(1)}M. Increasing facility limits or optimizing collateral composition allows client to finance opportunistic private co-investments without triggering taxable capital gains.`
        : `Client has an unleveraged USD ${(totalAum / 1e6).toFixed(1)}M portfolio. Establishing a pre-approved multi-currency Lombard credit line unlocks up to USD ${((totalAum * 0.45) / 1e6).toFixed(1)}M in non-purpose liquidity at SOFR+ spreads.`,
      potentialImpact: `Unlocks USD ${facility ? (headroom / 1e6).toFixed(1) : ((totalAum * 0.45) / 1e6).toFixed(1)}M borrowing power for co-investments or bridge financing`,
      pitchScript: `"We can put in place a flexible multi-currency Lombard credit line secured against your high-grade portfolio. This gives you instant liquidity to seize market dips or bridge private market calls without having to sell any of your long-term equity compounders."`,
      actionLabel: "Structure Lombard Facility",
      targetTab: "credit",
    },
    {
      id: "upsell-private-markets",
      title: "Julius Baer Private Equity & Infrastructure Vintage 2026",
      productCategory: "Private Markets & Alternatives",
      rationale: `With an investment horizon of ${client.investment_horizon_years} years and wealth tier ${client.wealth_band}, client is well positioned to increase alternatives allocation. Access top-tier institutional buyouts, secondaries, and energy transition infrastructure.`,
      potentialImpact: `Target net IRR of 14%–16%; enhances long-term risk-adjusted portfolio return`,
      pitchScript: `"Considering your ${client.investment_horizon_years}-year time horizon, our 2026 Private Markets Vintage offers direct co-investment access alongside premier global buyout managers, offering a 15% target IRR with low correlation to public equity swings."`,
      actionLabel: "Request Private Market Term Sheet",
      targetTab: "briefing",
    },
    {
      id: "upsell-wealth-planning",
      title: "Cross-Border Wealth Structuring & Singapore VCC / Trust",
      productCategory: "Wealth Planning & Succession",
      rationale: `Client's cross-border presence (${client.tax_domicile} / ${client.country_of_residence}) and family objectives require robust intergenerational succession planning and tax treaty optimization.`,
      potentialImpact: `Estate preservation, probate avoidance, ring-fenced family governance`,
      pitchScript: `"Because your family's domicile and residence span multiple jurisdictions, structuring your holdings under a Singapore Variable Capital Company or Swiss trust will protect your assets against cross-border estate tax friction and ensure seamless intergenerational transfer."`,
      actionLabel: "Book Wealth Planning Specialist",
      targetTab: "notes",
    },
  ];

  const handleCopyPitch = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitchId(id);
    setTimeout(() => setCopiedPitchId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* 1. VISUAL AUM SECTION                                                     */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0F0EE]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#1A1A1A] text-[#C5A059] flex items-center justify-center font-bold text-xs shadow-xs">
              <DollarSign className="w-4 h-4 text-[#C5A059]" />
            </div>
            <div>
              <h3 className="text-base font-medium text-[#1A1A1A]">
                1. Relationship AUM &amp; Capital Allocation
              </h3>
              <p className="text-xs text-[#70706B]">
                Total book value, asset class breakdown, and currency exposures for {client.client_name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAllocationDrift(!showAllocationDrift)}
              className="px-3 py-1.5 text-xs font-semibold rounded-sm bg-[#FDFDFB] hover:bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB] flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <PieChartIcon className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{showAllocationDrift ? "Hide Ideal vs Current SAA" : "View Ideal vs Current SAA"}</span>
            </button>

            <button
              onClick={() => onNavigateTab("portfolio")}
              className="px-3 py-1.5 text-xs font-semibold rounded-sm bg-[#1A1A1A] hover:bg-[#333333] text-white flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>Holdings Look-Through</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#C5A059]" />
            </button>
          </div>
        </div>

        {/* High-Level AUM Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#FDFDFB] p-4 rounded-sm border border-[#E5E5E1] shadow-2xs">
            <span className="text-[10px] uppercase tracking-widest text-[#70706B] font-semibold block">
              Total Relationship AUM
            </span>
            <div className="text-2xl font-light text-[#1A1A1A] mt-1 tracking-tight">
              USD ${(totalAum / 1e6).toFixed(2)}M
            </div>
            <span className="text-[10px] text-[#70706B] mt-0.5 block">
              Tier: <strong className="text-[#1A1A1A]">{client.wealth_band}</strong>
            </span>
          </div>

          <div className="bg-[#FDFDFB] p-4 rounded-sm border border-[#E5E5E1] shadow-2xs">
            <span className="text-[10px] uppercase tracking-widest text-[#70706B] font-semibold block">
              YTD Net Performance
            </span>
            <div className={`text-2xl font-light mt-1 tracking-tight flex items-center ${(priorityItem?.ytdReturnPct ?? 0) >= 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"}`}>
              {(priorityItem?.ytdReturnPct ?? 0) >= 0 ? "+" : ""}
              {(priorityItem?.ytdReturnPct ?? 0).toFixed(1)}%
            </div>
            <span className="text-[10px] text-[#70706B] mt-0.5 block">
              Benchmark: +5.8% YTD
            </span>
          </div>

          <div className="bg-[#FDFDFB] p-4 rounded-sm border border-[#E5E5E1] shadow-2xs">
            <span className="text-[10px] uppercase tracking-widest text-[#70706B] font-semibold block">
              Unallocated Cash &amp; Liquidity
            </span>
            <div className="text-2xl font-light text-[#1A1A1A] mt-1 tracking-tight">
              USD ${(cashVal / 1e6).toFixed(2)}M
            </div>
            <span className="text-[10px] text-[#2D8A39] font-medium mt-0.5 block">
              {cashPct.toFixed(1)}% Liquid Dry Powder
            </span>
          </div>

          <div className="bg-[#FDFDFB] p-4 rounded-sm border border-[#E5E5E1] shadow-2xs">
            <span className="text-[10px] uppercase tracking-widest text-[#70706B] font-semibold block">
              Credit &amp; Leverage Facility
            </span>
            <div className="text-2xl font-light text-[#1A1A1A] mt-1 tracking-tight">
              {facility ? `${currentLtv.toFixed(1)}% LTV` : "Unleveraged"}
            </div>
            <span className="text-[10px] text-[#70706B] mt-0.5 block">
              {facility ? `Headroom: $${(headroom / 1e6).toFixed(2)}M` : "100% Equity Funded"}
            </span>
          </div>
        </div>

        {/* Visual Asset Allocation Bar with Segment Proportions */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">
              Asset Allocation Composition
            </span>
            <span className="text-xs text-[#70706B]">
              Total Managed: USD ${(totalHoldingsVal / 1e6).toFixed(2)}M across {holdings.length} securities
            </span>
          </div>

          {/* Continuous Multi-Segment Bar */}
          <div className="h-4 w-full rounded-sm overflow-hidden flex bg-[#F0F0EE] shadow-inner">
            {assetClasses.map((ac, idx) => {
              const bgClass = assetColors[ac.name] || "bg-[#70706B]";
              return (
                <div
                  key={idx}
                  style={{ width: `${ac.pct}%` }}
                  className={`${bgClass} transition-all hover:opacity-85 relative group`}
                  title={`${ac.name}: ${ac.pct.toFixed(1)}% ($${(ac.value / 1e6).toFixed(2)}M)`}
                />
              );
            })}
          </div>

          {/* Asset Allocation Chips & Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {assetClasses.map((ac, idx) => {
              const bgClass = assetColors[ac.name] || "bg-[#70706B]";
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-sm bg-[#FDFDFB] border border-[#E5E5E1] text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-xs ${bgClass} shrink-0`} />
                    <span className="text-[#70706B] font-medium truncate max-w-[110px]" title={ac.name}>
                      {ac.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-[#1A1A1A] block">{ac.pct.toFixed(1)}%</span>
                    <span className="text-[10px] text-[#70706B]">${(ac.value / 1e6).toFixed(2)}M</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Currency Split & Risk Tolerance Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#F0F0EE]">
          {/* Currency Exposure */}
          <div className="p-3.5 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-[#70706B] font-semibold block">
              Currency Exposure Breakdown
            </span>
            <div className="flex h-2 w-full rounded-sm overflow-hidden bg-[#F0F0EE]">
              {currencySplit.map((c, i) => (
                <div
                  key={i}
                  style={{ width: `${c.pct}%` }}
                  className={`${c.color}`}
                  title={`${c.code}: ${c.pct}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              {currencySplit.map((c, i) => (
                <div key={i} className="flex items-center space-x-1">
                  <span className={`w-2 h-2 rounded-xs ${c.color}`} />
                  <span className="text-[#70706B]">{c.code}:</span>
                  <span className="font-semibold text-[#1A1A1A]">{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Tolerance & Lombard Gauge */}
          <div className="p-3.5 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] flex items-center justify-around">
            <div className="flex flex-col items-center">
              <ClientRiskGauge
                score={client.risk_tolerance_score}
                riskProfile={client.risk_profile}
                size="sm"
                showLabel={true}
              />
            </div>
            {facility ? (
              <div className="flex flex-col items-center border-l border-[#E5E5E1] pl-4">
                <LombardLtvMeter
                  currentLtv={currentLtv}
                  marginCallThreshold={marginCallLtv}
                  size="sm"
                />
              </div>
            ) : (
              <div className="text-center border-l border-[#E5E5E1] pl-4">
                <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Credit Facility</span>
                <span className="text-xs text-[#2D8A39] font-medium mt-1 block">Unleveraged (0.0% LTV)</span>
              </div>
            )}
          </div>
        </div>

        {/* Optional Expandable Ideal vs Current SAA Donut Charts */}
        {showAllocationDrift && (
          <div className="pt-4 border-t border-[#E5E5E1]">
            <AllocationComparison
              clientId={client.client_id}
              compact={false}
              onTradeRebalance={() => onNavigateTab("portfolio")}
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. ACTIONS NEEDED SECTION                                                 */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#B91C1C] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-medium text-[#1A1A1A]">
                  2. Actions Needed
                </h3>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                    actionsNeeded.length > 0
                      ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                      : "bg-[#E6F4EA] text-[#2D8A39] border border-[#CEEAD6]"
                  }`}
                >
                  {actionsNeeded.length > 0 ? `${actionsNeeded.length} Actions Required` : "All Clear & Compliant"}
                </span>
              </div>
              <p className="text-xs text-[#70706B]">
                Immediate advisory interventions, margin warnings, mandate remediations, and compliance checks
              </p>
            </div>
          </div>
        </div>

        {actionsNeeded.length > 0 ? (
          <div className="space-y-3">
            {actionsNeeded.map((act) => {
              const isCrit = act.severity === "critical";
              const isWarn = act.severity === "warning";
              return (
                <div
                  key={act.id}
                  className={`p-4 rounded-sm border transition-all ${
                    isCrit
                      ? "bg-[#FEF2F2] border-[#FECACA] border-l-4 border-l-[#B91C1C]"
                      : isWarn
                      ? "bg-[#FAF7F0] border-[#E9DFCB] border-l-4 border-l-[#C5A059]"
                      : "bg-[#FDFDFB] border-[#E5E5E1] border-l-4 border-l-[#70706B]"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-sm ${
                            isCrit
                              ? "bg-[#B91C1C] text-white"
                              : isWarn
                              ? "bg-[#C5A059] text-white"
                              : "bg-[#70706B] text-white"
                          }`}
                        >
                          {act.category}
                        </span>
                        <h4 className="text-xs sm:text-sm font-semibold text-[#1A1A1A]">
                          {act.title}
                        </h4>
                      </div>
                      <p className="text-xs text-[#70706B] leading-relaxed max-w-3xl">
                        {act.description}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      <button
                        onClick={() => onNavigateTab(act.targetTab)}
                        className={`px-3.5 py-1.5 rounded-sm text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs ${
                          isCrit
                            ? "bg-[#B91C1C] hover:bg-[#991B1B] text-white"
                            : isWarn
                            ? "bg-[#1A1A1A] hover:bg-[#333333] text-white"
                            : "bg-[#FAF7F0] hover:bg-[#F2ECE0] text-[#8C6D23] border border-[#E9DFCB]"
                        }`}
                      >
                        <span>{act.actionLabel}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-[#FAFBF9] rounded-sm border border-[#E5E5E1] text-center space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-[#2D8A39]" />
            <h4 className="text-sm font-medium text-[#1A1A1A]">
              Portfolio Fully Compliant — No Immediate Interventions Required
            </h4>
            <p className="text-xs text-[#70706B] max-w-xl mx-auto leading-relaxed">
              All holdings strictly comply with client ESG mandates, asset allocation weights remain inside target SAA bands (+/- 2.5%), and Lombard facility LTV is within conservative safety parameters. Next scheduled quarterly check: 15 September 2026.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. UPSELLING OPPORTUNITIES SECTION                                        */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F0EE]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#C5A059] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-medium text-[#1A1A1A]">
                  3. Upselling &amp; Growth Opportunities
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]">
                  5 Tailored Advisory Solutions
                </span>
              </div>
              <p className="text-xs text-[#70706B]">
                High-conviction Julius Baer solutions aligned with {client.client_name}'s balance sheet and liquidity profile
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upsellingOpportunities.map((opp) => {
            const isCopied = copiedPitchId === opp.id;
            return (
              <div
                key={opp.id}
                className="p-5 rounded-sm bg-[#FDFDFB] border border-[#E5E5E1] hover:border-[#C5A059] transition-all shadow-2xs space-y-3 flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8C6D23] bg-[#FAF7F0] px-2 py-0.5 rounded-sm border border-[#E9DFCB]">
                      {opp.productCategory}
                    </span>
                    <span className="text-[10px] font-mono text-[#2D8A39] font-semibold">
                      Growth Angle
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-[#1A1A1A] group-hover:text-[#8C6D23] transition-colors">
                    {opp.title}
                  </h4>

                  <p className="text-xs text-[#70706B] leading-relaxed">
                    {opp.rationale}
                  </p>

                  <div className="p-2.5 bg-white rounded-sm border border-[#E5E5E1] space-y-1">
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-[#70706B] block">
                      Client Value &amp; Impact
                    </span>
                    <p className="text-xs font-semibold text-[#1A1A1A]">
                      {opp.potentialImpact}
                    </p>
                  </div>

                  {/* Priscilla's Pitch Script Box */}
                  <div className="p-2.5 bg-[#FAF7F0] rounded-sm border border-[#E9DFCB] space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-widest font-semibold text-[#8C6D23] flex items-center">
                        <Zap className="w-3 h-3 mr-1 text-[#C5A059]" />
                        Priscilla's Talking Pitch
                      </span>
                      <button
                        onClick={() => handleCopyPitch(opp.id, opp.pitchScript)}
                        className="text-[10px] font-semibold text-[#8C6D23] hover:text-[#1A1A1A] flex items-center space-x-1 cursor-pointer"
                        title="Copy pitch talking point to clipboard"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-[#2D8A39]" /> : <Copy className="w-3 h-3 text-[#C5A059]" />}
                        <span>{isCopied ? "Copied" : "Copy Pitch"}</span>
                      </button>
                    </div>
                    <p className="text-[#1A1A1A] italic leading-relaxed text-[11px]">
                      {opp.pitchScript}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#F0F0EE] flex items-center justify-between">
                  <span className="text-[10px] text-[#70706B]">
                    Target: {client.risk_profile} • Horizon {client.investment_horizon_years}y
                  </span>

                  <button
                    onClick={() => onNavigateTab(opp.targetTab)}
                    className="px-3 py-1.5 rounded-sm bg-[#1A1A1A] hover:bg-[#333333] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>{opp.actionLabel}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#C5A059]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
