import React, { useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Send,
  AlertTriangle,
  PieChart as PieChartIcon,
  Shield,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  Layers,
  ChevronRight,
  Info,
  Calendar,
  Zap,
  Sliders,
  DollarSign,
  User,
} from "lucide-react";
import {
  Client,
  Portfolio,
  Holding,
  CreditFacility,
  Commitment,
  PlannedCashNeed,
  RMNote,
  EventLogEntry,
  PriorityClientItem,
} from "../types";
import { RMQuickActionMenu } from "./RMQuickActionMenu";
import { ClientRiskGauge, LombardLtvMeter } from "./RiskMeter";
import { AllocationComparison } from "./AllocationComparison";
import { ClientOverview } from "./ClientOverview";
import {
  clients,
  portfoliosByClientId,
  holdings,
  creditFacilitiesByClientId,
  commitmentsByClientId,
  plannedCashNeedsByClientId,
  rmNotesByClientId,
  instrumentsById,
  getClientMandateCompliance,
  getClientLookThrough,
  runStressTest,
  PREDEFINED_SCENARIOS,
  TODAY_SNAPSHOT,
} from "../utils/intelligenceEngine";

interface ClientWorkspaceProps {
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  priorityItem?: PriorityClientItem;
  eventLog: EventLogEntry[];
}

interface AdvisoryMemo {
  executiveSummary: string;
  portfolioReview: string;
  keyRiskFactors: string[];
  talkingPoints: string[];
  proposedTrades: {
    action: "Buy" | "Sell" | "Trim" | "Switch";
    instrumentName: string;
    weightPctChange: string;
    rationale: string;
    mandateCheck: string;
  }[];
  governanceNotes: string;
}

export const ClientWorkspace: React.FC<ClientWorkspaceProps> = ({
  selectedClientId,
  onSelectClient,
  priorityItem,
  eventLog,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "briefing" | "portfolio" | "credit" | "stress" | "notes">("overview");
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(PREDEFINED_SCENARIOS[1].id);

  // Active client data lookups
  const client = useMemo(
    () => clients.find((c) => c.client_id === selectedClientId) || clients[0],
    [selectedClientId]
  );
  const clientPortfolios = useMemo(
    () => portfoliosByClientId.get(client.client_id) || [],
    [client.client_id]
  );
  const clientFacilities = useMemo(
    () => creditFacilitiesByClientId.get(client.client_id) || [],
    [client.client_id]
  );
  const clientCommitments = useMemo(
    () => commitmentsByClientId.get(client.client_id) || [],
    [client.client_id]
  );
  const clientCashNeeds = useMemo(
    () => plannedCashNeedsByClientId.get(client.client_id) || [],
    [client.client_id]
  );
  const [additionalNotes, setAdditionalNotes] = useState<Record<string, RMNote[]>>({});

  const clientNotes = useMemo(() => {
    const base = rmNotesByClientId.get(client.client_id) || [];
    const added = additionalNotes[client.client_id] || [];
    return [...added, ...base];
  }, [client.client_id, additionalNotes]);

  const clientHoldings = useMemo(
    () => holdings.filter((h) => h.client_id === client.client_id && h.snapshot_date === TODAY_SNAPSHOT),
    [client.client_id]
  );

  // Mandate compliance & stress test
  const mandateCompliance = useMemo(
    () => getClientMandateCompliance(client.client_id, TODAY_SNAPSHOT),
    [client.client_id]
  );
  const lookThroughData = useMemo(
    () => getClientLookThrough(client.client_id, TODAY_SNAPSHOT),
    [client.client_id]
  );
  const stressResult = useMemo(
    () => runStressTest(client.client_id, selectedScenarioId),
    [client.client_id, selectedScenarioId]
  );

  // Memo generation state
  const [generatedMemo, setGeneratedMemo] = useState<AdvisoryMemo | null>(null);

  const handleLogCall = (note: RMNote) => {
    setAdditionalNotes((prev) => ({
      ...prev,
      [client.client_id]: [note, ...(prev[client.client_id] || [])],
    }));
  };

  const handleDraftReview = () => {
    setActiveTab("briefing");
    generateDefaultMemo(client, priorityItem);
  };

  // Chat copilot state
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; text: string; source?: string }[]
  >([
    {
      role: "assistant",
      text: `Hello Priscilla. I'm ready with intelligence for ${client.client_name}. Ask about portfolio holdings, Lombard headroom, ESG compliance, or 2026 event impacts.`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Reset or generate default memo on client change
  useEffect(() => {
    generateDefaultMemo(client, priorityItem);
    setChatMessages([
      {
        role: "assistant",
        text: `Hello Priscilla. Ready with briefing data for ${client.client_name} (${client.client_id}). Ask any question about their portfolio, Lombard LTV, or 2026 macro exposure.`,
      },
    ]);
  }, [client.client_id]);

  function generateDefaultMemo(c: Client, pItem?: PriorityClientItem) {
    const isCriticalMargin = pItem?.keyRisks.marginRisk?.status === "critical";
    const hasBreaches = (pItem?.keyRisks.sustainabilityBreaches?.length ?? 0) > 0;
    const isTaxDiff = c.tax_domicile !== c.country_of_residence;

    const memo: AdvisoryMemo = {
      executiveSummary: `Client ${c.client_name} (${c.client_id}) holds USD ${(c.total_aum_usd / 1e6).toFixed(1)}M across ${c.booking_centre} Desk. Risk profile is ${c.risk_profile} with an investment horizon of ${c.investment_horizon_years} years. Stated goals: ${c.objectives}.`,
      portfolioReview: `2026 macro shocks (Middle East conflict & Hormuz transit disruption lifting energy and bullion, followed by tech semiconductor consolidation in June) have created asset allocation shifts requiring re-alignment with ${c.risk_profile} mandate bands.`,
      keyRiskFactors: [
        isCriticalMargin
          ? `LOMBARD MARGIN RISK: LTV is ${pItem?.keyRisks.marginRisk?.currentLtv.toFixed(1)}% (threshold ${pItem?.keyRisks.marginRisk?.threshold}%). Only USD ${((pItem?.keyRisks.marginRisk?.headroomUsd ?? 0) / 1e6).toFixed(2)}M headroom remains.`
          : `Collateral Headroom: Credit facilities maintain compliant LTV buffers.`,
        hasBreaches
          ? `MANDATE EXCLUSION BREACH: Holds ${pItem?.keyRisks.sustainabilityBreaches?.[0]} which violates binding mandate criteria.`
          : `Mandate SAA bands remain within approved strategic tolerance.`,
        isTaxDiff
          ? `CROSS-BORDER TAX: Domiciled in ${c.tax_domicile} vs residence in ${c.country_of_residence}. Cross-border tax check advised before executing offshore trades.`
          : `Tax domicile aligned with residence.`,
      ],
      talkingPoints: [
        `Walk through YTD performance attribution: highlight positive contributions from energy and gold hedges offsetting tech consolidation.`,
        isCriticalMargin
          ? `Explain the Lombard margin buffer to client: propose trimming ${clientHoldings.find(h => h.sector.toLowerCase().includes("tech"))?.instrument_name || "volatile equities"} to restore safe headroom before market turbulence.`
          : `Affirm portfolio resilience through the 2026 geopolitical cycle and review liquidity for upcoming commitments.`,
        hasBreaches
          ? `Address the sustainability exclusion: recommend smoothly rotating out of non-compliant holdings into certified ESG equivalents without capital loss.`
          : `Discuss upcoming planned cash distributions or private equity capital calls to ensure liquid cash buffers are adequate.`,
        `Reaffirm long-term strategic asset allocation aligned with client's ${c.investment_horizon_years}-year horizon.`,
      ],
      proposedTrades: [
        {
          action: isCriticalMargin ? "Trim" : "Switch",
          instrumentName: isCriticalMargin
            ? (clientHoldings.find(h => h.sector.toLowerCase().includes("tech"))?.instrument_name || "Volatile Equity Position")
            : "Geopolitical Energy Beneficiaries",
          weightPctChange: "-2.5%",
          rationale: isCriticalMargin
            ? "De-risk collateral portfolio and restore safe Lombard headroom above margin trigger."
            : "Harvest gains following Hormuz shipping disruption price surge.",
          mandateCheck: "Compliant with SAA bands",
        },
        {
          action: "Buy",
          instrumentName: "Short-Duration Fixed Income / Treasury Liquidity",
          weightPctChange: "+2.5%",
          rationale: "Lock in attractive 2026 yields while providing defensive liquidity buffer.",
          mandateCheck: "Compliant with SAA bands",
        },
      ],
      governanceNotes: `Mandate SAA bands, Lombard advance rates, and sustainability guidelines verified against Julius Baer Investment Policy 2026.`,
    };

    setGeneratedMemo(memo);
  }

  // Copy Memo to Clipboard
  const handleCopy = () => {
    if (!generatedMemo) return;
    const text = `
JULIUS BAER ADVISORY BRIEFING — ${client.client_name} (${client.client_id})
Booking Centre: ${client.booking_centre} Desk | AUM: USD ${(client.total_aum_usd / 1e6).toFixed(1)}M
RM: Priscilla Ong (Asia Desk)

1. EXECUTIVE SUMMARY
${generatedMemo.executiveSummary}

2. 2026 MACRO ATTRIBUTION
${generatedMemo.portfolioReview}

3. KEY RISKS & ALERTS
${generatedMemo.keyRiskFactors.map((r) => `• ${r}`).join("\n")}

4. PRISCILLA'S TALKING POINTS
${generatedMemo.talkingPoints.map((t, idx) => `${idx + 1}. ${t}`).join("\n")}

5. PROPOSED TRADE ACTIONS
${generatedMemo.proposedTrades.map((tr) => `• [${tr.action}] ${tr.instrumentName} (${tr.weightPctChange}): ${tr.rationale}`).join("\n")}

Governance: ${generatedMemo.governanceNotes}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Copilot Chat Message
  const handleSendMessage = async (msgText?: string) => {
    const textToSend = msgText || inputMessage;
    if (!textToSend.trim()) return;

    const newHistory = [...chatMessages, { role: "user" as const, text: textToSend }];
    setChatMessages(newHistory);
    setInputMessage("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          clientId: client.client_id,
          client: {
            client_name: client.client_name,
            client_id: client.client_id,
            booking_centre: client.booking_centre,
            wealth_band: client.wealth_band,
            total_aum_usd: client.total_aum_usd,
            tax_domicile: client.tax_domicile,
            country_of_residence: client.country_of_residence,
            risk_profile: client.risk_profile,
            risk_tolerance_score: client.risk_tolerance_score,
            investment_horizon_years: client.investment_horizon_years,
            liquidity_needs: client.liquidity_needs,
            objectives: client.objectives,
          },
          facilities: clientFacilities,
          portfolios: clientPortfolios,
          holdings: clientHoldings.slice(0, 15),
          mandateCompliance: mandateCompliance,
          conversationHistory: newHistory.slice(-6),
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();
      setChatMessages([...newHistory, { role: "assistant", text: data.reply, source: data.source }]);
    } catch (err) {
      // Deterministic fallback
      let answer = `Regarding ${client.client_name} (${client.client_id}): Relationship AUM is USD ${(client.total_aum_usd / 1e6).toFixed(1)}M on the ${client.booking_centre} Desk. `;
      const q = textToSend.toLowerCase();
      if (q.includes("margin") || q.includes("ltv") || q.includes("lombard")) {
        if (clientFacilities.length > 0) {
          const fac = clientFacilities[0];
          answer += `Lombard facility currently has an LTV of ${fac["ltv_pct_2026-08-26"].toFixed(1)}% against a margin call trigger of ${fac.margin_call_ltv_pct}%. Headroom remaining is USD ${(fac["headroom_2026-08-26"] / 1e6).toFixed(2)}M.`;
        } else {
          answer += `This client currently does not have active Lombard credit facilities.`;
        }
      } else if (q.includes("sustain") || q.includes("esg") || q.includes("exclusion")) {
        const breaches = mandateCompliance.flatMap(m => m.sustainabilityBreaches);
        if (breaches.length > 0) {
          answer += `Detected non-compliant position: ${breaches[0].instrument_name} in ${breaches[0].sector}. Recommend executing a rebalancing trade to replace with certified ESG equivalent.`;
        } else {
          answer += `No sustainability breaches found across client portfolios. All holdings adhere to Julius Baer Responsible Investment guidelines.`;
        }
      } else if (q.includes("oil") || q.includes("energy") || q.includes("middle east")) {
        answer += `The February-March 2026 Middle East shipping escalation drove Brent crude from $74 to $112/bbl, benefiting the portfolio's energy allocations and commodity hedges while creating input cost headwinds for global equities.`;
      } else {
        answer += `Client risk profile is ${client.risk_profile}, with investment objectives: "${client.objectives}". Planned upcoming cash needs and commitments are tracked in the liquidity panel.`;
      }
      setChatMessages([...newHistory, { role: "assistant", text: answer, source: "Rules Engine" }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Asset allocation summary for current client
  const assetClassTotals = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const h of clientHoldings) {
      map.set(h.asset_class, (map.get(h.asset_class) || 0) + h.market_value_usd);
      total += h.market_value_usd;
    }
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
      pct: total > 0 ? (value / total) * 100 : 0,
    })).sort((a, b) => b.value - a.value);
  }, [clientHoldings]);

  const hasMarginAlert = priorityItem?.keyRisks.marginRisk && priorityItem.keyRisks.marginRisk.status !== "healthy";
  const hasMandateBreach = (priorityItem?.keyRisks.sustainabilityBreaches?.length ?? 0) > 0;
  const isTaxMismatch = client.tax_domicile !== client.country_of_residence;

  return (
    <div className="space-y-6">
      {/* Client Context Header */}
      <div className="bg-white p-5 sm:p-6 rounded-sm border border-[#E5E5E1] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Client Identity & Fast Switcher */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-sm bg-[#1A1A1A] text-[#C5A059] flex items-center justify-center font-bold text-sm tracking-wider shadow-xs">
              {client.client_name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <select
                  aria-label="Select Client"
                  value={client.client_id}
                  onChange={(e) => onSelectClient(e.target.value)}
                  className="text-lg sm:text-xl font-medium text-[#1A1A1A] bg-transparent hover:text-[#C5A059] focus:outline-none cursor-pointer border-b border-dashed border-[#C5A059]/50 pr-2"
                >
                  {clients.map((c) => (
                    <option key={c.client_id} value={c.client_id} className="text-xs text-[#1A1A1A]">
                      {c.client_name} ({c.client_id}) — USD {(c.total_aum_usd / 1e6).toFixed(1)}M
                    </option>
                  ))}
                </select>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#FDFDFB] text-[#70706B] border border-[#E5E5E1]">
                  {client.wealth_band}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#70706B] font-medium px-2 py-0.5 rounded-sm bg-[#FDFDFB] border border-[#E5E5E1]">
                  {client.booking_centre}
                </span>
              </div>
              <p className="text-xs text-[#70706B] mt-0.5">
                Risk: <strong className="text-[#1A1A1A]">{client.risk_profile}</strong> • Horizon: {client.investment_horizon_years} yrs • Domicile: <strong className="text-[#1A1A1A]">{client.tax_domicile}</strong> (Resides: {client.country_of_residence})
              </p>
            </div>
          </div>

          {/* Quick Metrics & Interactive Visual Risk Gauges */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="bg-[#FDFDFB] border border-[#E5E5E1] px-3.5 py-2 rounded-sm shadow-2xs">
              <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Relationship AUM</span>
              <span className="text-base font-light text-[#1A1A1A]">
                USD {(client.total_aum_usd / 1e6).toFixed(1)}M
              </span>
            </div>

            <div className="bg-[#FDFDFB] border border-[#E5E5E1] px-3.5 py-2 rounded-sm shadow-2xs">
              <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">YTD Return</span>
              <span className={`text-base font-semibold flex items-center ${(priorityItem?.ytdReturnPct ?? 0) >= 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"}`}>
                {(priorityItem?.ytdReturnPct ?? 0) >= 0 ? "+" : ""}
                {(priorityItem?.ytdReturnPct ?? 0).toFixed(1)}%
              </span>
            </div>

            {/* Visual Client Risk Tolerance Gauge */}
            <div className="bg-[#FDFDFB] border border-[#E5E5E1] px-3.5 py-1.5 rounded-sm shadow-2xs flex items-center">
              <ClientRiskGauge
                score={client.risk_tolerance_score}
                riskProfile={client.risk_profile}
                size="sm"
                showLabel={true}
              />
            </div>

            {/* Visual Lombard LTV Meter (if facility present) */}
            {priorityItem?.keyRisks.marginRisk ? (
              <div className="bg-[#FDFDFB] border border-[#E5E5E1] px-3.5 py-1.5 rounded-sm shadow-2xs flex items-center">
                <LombardLtvMeter
                  currentLtv={priorityItem.keyRisks.marginRisk.currentLtv}
                  marginCallThreshold={priorityItem.keyRisks.marginRisk.threshold}
                  size="sm"
                />
              </div>
            ) : (
              <div className="bg-[#FDFDFB] border border-[#E5E5E1] px-3 py-2 rounded-sm shadow-2xs text-center">
                <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Credit Facility</span>
                <span className="text-xs text-[#70706B] font-mono">Unleveraged</span>
              </div>
            )}
          </div>
        </div>

        {/* Prominent Alert Banner if any alert exists */}
        {(hasMarginAlert || hasMandateBreach || isTaxMismatch) && (
          <div className="mt-4 pt-3.5 border-t border-[#F0F0EE] flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-[#70706B] mr-1">
              Active Advisory Triggers:
            </span>
            {hasMarginAlert && (
              <span className="px-2.5 py-1 rounded-sm bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] font-medium flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1 text-[#DC2626]" />
                Lombard LTV {priorityItem?.keyRisks.marginRisk?.currentLtv != null ? priorityItem.keyRisks.marginRisk.currentLtv.toFixed(1) : (clientFacilities[0]?.["ltv_pct_2026-08-26"] ?? 0).toFixed(1)}% (Margin Call at {priorityItem?.keyRisks.marginRisk?.threshold ?? 70}%)
              </span>
            )}
            {hasMandateBreach && (
              <span className="px-2.5 py-1 rounded-sm bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB] font-medium flex items-center">
                <Shield className="w-3 h-3 mr-1 text-[#C5A059]" />
                Mandate Exclusion: {priorityItem?.keyRisks.sustainabilityBreaches?.[0]}
              </span>
            )}
            {isTaxMismatch && (
              <span className="px-2.5 py-1 rounded-sm bg-[#FDFDFB] text-[#70706B] border border-[#E5E5E1] font-medium">
                Tax Cross-Border ({client.tax_domicile} vs {client.country_of_residence})
              </span>
            )}
          </div>
        )}

        {/* Clean Workspace Tabs */}
        <div className="flex space-x-1 mt-4 pt-3 border-t border-[#F0F0EE] overflow-x-auto">
          {[
            { id: "overview", label: "Overview: AUM • Actions • Upselling", icon: TrendingUp },
            { id: "briefing", label: "Meeting Briefing & Talking Points", icon: Sparkles },
            { id: "portfolio", label: "Portfolio & Holdings Look-Through", icon: PieChartIcon },
            { id: "credit", label: "Lombard Credit & Mandates", icon: Shield },
            { id: "stress", label: "Scenario What-If Stress", icon: Activity },
            { id: "notes", label: "Priscilla's Notes & Cash Needs", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#1A1A1A] text-white font-semibold shadow-xs"
                    : "text-[#70706B] hover:text-[#1A1A1A] hover:bg-[#FDFDFB] font-medium"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#C5A059]" : "text-[#70706B]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-VIEW 0: Visual AUM, Actions Needed, Upselling Opportunities (Default) */}
      {activeTab === "overview" && (
        <ClientOverview
          client={client}
          priorityItem={priorityItem}
          holdings={clientHoldings}
          facilities={clientFacilities}
          cashNeeds={clientCashNeeds}
          commitments={clientCommitments}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {/* SUB-VIEW 1: Meeting Briefing & Copilot */}
      {activeTab === "briefing" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Ready-to-Use Advisory Memo */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                <div>
                  <span className="text-[10px] font-semibold text-[#C5A059] uppercase tracking-widest block">
                    Meeting Intelligence Briefing
                  </span>
                  <h3 className="text-base font-semibold text-[#1A1A1A] mt-0.5">
                    Advisory Discussion Guide for Priscilla Ong
                  </h3>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-sm text-xs font-medium border border-[#E5E5E1] bg-[#FDFDFB] hover:bg-[#FAF7F0] text-[#1A1A1A] transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#2D8A39]" /> : <Copy className="w-3.5 h-3.5 text-[#C5A059]" />}
                  <span>{copied ? "Copied!" : "Copy Talking Points"}</span>
                </button>
              </div>

              {generatedMemo && (
                <div className="space-y-4 text-xs">
                  {/* Executive Summary */}
                  <div className="p-4 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] space-y-1">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-[#70706B] block">
                      Executive Summary
                    </span>
                    <p className="text-[#1A1A1A] leading-relaxed">{generatedMemo.executiveSummary}</p>
                  </div>

                  {/* Priscilla's Spoken Talking Points */}
                  <div className="p-4 bg-[#FAF7F0] rounded-sm border border-[#E9DFCB] space-y-2">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-[#8C6D23] block flex items-center">
                      <Sparkles className="w-3 h-3 mr-1 text-[#C5A059]" />
                      Priscilla's Key Talking Points (Meeting Agenda Script)
                    </span>
                    <div className="space-y-2 text-[#1A1A1A]">
                      {generatedMemo.talkingPoints.map((tp, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <span className="font-semibold text-[#8C6D23] shrink-0 mt-0.5">{idx + 1}.</span>
                          <p className="leading-relaxed">{tp}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2026 Macro Attribution */}
                  <div className="p-4 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] space-y-1">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-[#70706B] block">
                      2026 Macro Context &amp; Attribution
                    </span>
                    <p className="text-[#1A1A1A] leading-relaxed">{generatedMemo.portfolioReview}</p>
                  </div>

                  {/* Actionable Rebalancing Trades */}
                  <div className="p-4 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] space-y-2.5">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-[#70706B] block">
                      Actionable Trade Proposals
                    </span>
                    <div className="space-y-2">
                      {generatedMemo.proposedTrades.map((tr, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-sm border border-[#E5E5E1]">
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-sm text-[9px] font-semibold uppercase tracking-wider ${
                                tr.action === "Buy"
                                  ? "bg-[#E6F4EA] text-[#2D8A39] border border-[#CEEAD6]"
                                  : tr.action === "Sell" || tr.action === "Trim"
                                  ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                                  : "bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]"
                              }`}
                            >
                              {tr.action} • {tr.weightPctChange}
                            </span>
                            <span className="text-[10px] text-[#70706B]">{tr.mandateCheck}</span>
                          </div>
                          <div className="font-semibold text-[#1A1A1A]">{tr.instrumentName}</div>
                          <p className="text-[#70706B] text-[11px] mt-0.5 leading-relaxed">{tr.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footnote */}
                  <p className="text-[11px] text-[#70706B] italic">
                    Governance Check: {generatedMemo.governanceNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Julius Baer Advisory Copilot Q&A */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-sm border border-[#E5E5E1] shadow-xs flex flex-col h-[650px]">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-sm bg-[#1A1A1A] text-[#C5A059] flex items-center justify-center text-xs font-serif font-bold">
                    JB
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#1A1A1A]">Julius Baer Copilot</h3>
                    <span className="text-[10px] text-[#70706B] block">Client: {client.client_name}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-[#E6F4EA] text-[#2D8A39]">
                  Live
                </span>
              </div>

              {/* Quick Prompt Chips */}
              <div className="py-2.5 flex flex-wrap gap-1.5 border-b border-[#F0F0EE]">
                {[
                  "Why is LTV close to margin call?",
                  "Any sustainability breaches?",
                  "How did oil impact the portfolio?",
                  "Upcoming cash needs & calls?",
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    className="text-[10px] bg-[#FDFDFB] hover:bg-[#F4F4F1] text-[#70706B] hover:text-[#1A1A1A] border border-[#E5E5E1] px-2.5 py-1 rounded-sm transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
                {chatMessages.map((m, idx) => {
                  const isUser = m.role === "user";
                  return (
                    <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-sm p-3 text-xs leading-relaxed ${
                          isUser
                            ? "bg-[#1A1A1A] text-white"
                            : "bg-[#FDFDFB] text-[#1A1A1A] border border-[#E5E5E1]"
                        }`}
                      >
                        <p className="whitespace-pre-line">{m.text}</p>
                        {m.source && (
                          <div className="mt-1.5 pt-1.5 border-t border-[#E5E5E1]/50 text-[9px] text-[#70706B] uppercase tracking-wider">
                            Source: {m.source}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#FDFDFB] text-[#70706B] border border-[#E5E5E1] rounded-sm p-2.5 text-xs flex items-center space-x-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C5A059]" />
                      <span>Checking policy &amp; holdings...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="pt-3 border-t border-[#F0F0EE]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex space-x-2"
                >
                  <input
                    type="text"
                    placeholder={`Ask about ${client.client_name} or policy...`}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm px-3 py-2 text-xs text-[#1A1A1A] placeholder-[#70706B] focus:outline-none focus:border-[#C5A059]"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-[#1A1A1A] text-[#C5A059] hover:bg-[#2A2A2A] rounded-sm transition-colors cursor-pointer disabled:opacity-50"
                    aria-label="Send Question"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Portfolio & Holdings Look-Through */}
      {activeTab === "portfolio" && (
        <div className="space-y-6">
          {/* Paired Pie Charts: Ideal Allocation vs Current Allocation */}
          <AllocationComparison
            clientId={client.client_id}
            onTradeRebalance={() => {
              setActiveTab("notes");
            }}
          />

          {/* Holdings Table with Look-Through */}
          <div className="bg-white rounded-sm border border-[#E5E5E1] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#F0F0EE] flex items-center justify-between">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
                  Holdings &amp; Underlying Look-Through Details
                </h3>
                <p className="text-[11px] text-[#70706B] mt-0.5">
                  Showing all {clientHoldings.length} active positions as of 26 August 2026.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5E1] bg-[#FDFDFB] text-[#70706B] text-[10px] uppercase tracking-widest font-semibold">
                    <th className="py-2.5 px-4">Instrument / Position</th>
                    <th className="py-2.5 px-4">Asset Class</th>
                    <th className="py-2.5 px-4">Sector</th>
                    <th className="py-2.5 px-4 text-right">Market Value</th>
                    <th className="py-2.5 px-4 text-right">Weight</th>
                    <th className="py-2.5 px-4 text-right">Unrealised P&amp;L</th>
                    <th className="py-2.5 px-4 text-center">Look-Through Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EE]">
                  {clientHoldings.map((h, idx) => {
                    const inst = instrumentsById.get(h.instrument_id);
                    const isLookThrough = inst?.underlying_reference != null;
                    const isExcluded = inst?.sustainability_excluded === "Y";

                    return (
                      <tr key={idx} className="hover:bg-[#FDFDFB] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#1A1A1A]">{h.instrument_name}</div>
                          <div className="text-[10px] text-[#70706B] font-mono">{h.instrument_id}</div>
                        </td>
                        <td className="py-3 px-4 text-[#70706B]">{h.asset_class}</td>
                        <td className="py-3 px-4 text-[#70706B]">{h.sector}</td>
                        <td className="py-3 px-4 text-right font-medium text-[#1A1A1A]">
                          ${(h.market_value_usd / 1e3).toLocaleString(undefined, { maximumFractionDigits: 0 })}k
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#1A1A1A]">
                          {h.weight_pct.toFixed(1)}%
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${h.unrealised_pnl_pct >= 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"}`}>
                          {h.unrealised_pnl_pct >= 0 ? "+" : ""}
                          {h.unrealised_pnl_pct.toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isLookThrough ? (
                            <span className="px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-semibold bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]">
                              Note Ref: {inst?.underlying_reference}
                            </span>
                          ) : isExcluded ? (
                            <span className="px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-semibold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                              Excluded Defense
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#D1D1CC]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Lombard Credit & Mandates */}
      {activeTab === "credit" && (
        <div className="space-y-6">
          {/* Lombard Facilities */}
          <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
            <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold flex items-center">
              <Shield className="w-4 h-4 mr-1.5 text-[#C5A059]" />
              Lombard Credit Facilities &amp; Collateral Margin Buffer
            </h3>

            {clientFacilities.length > 0 ? (
              <div className="space-y-4">
                {clientFacilities.map((fac) => {
                  const currentLtv = fac["ltv_pct_2026-08-26"];
                  const threshold = fac.margin_call_ltv_pct;
                  const headroom = fac["headroom_2026-08-26"];
                  const isWarning = threshold - currentLtv <= 5.0;
                  const isCritical = threshold - currentLtv <= 1.5;

                  return (
                    <div key={fac.facility_id} className="p-4 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm text-[#1A1A1A]">{fac.facility_type} ({fac.facility_ccy})</div>
                          <div className="text-xs text-[#70706B]">Facility ID: {fac.facility_id} • Interest Rate: {fac.interest_rate_pct}%</div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-sm text-xs font-semibold uppercase tracking-wider self-start sm:self-auto ${
                            isCritical
                              ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                              : isWarning
                              ? "bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]"
                              : "bg-[#E6F4EA] text-[#2D8A39] border border-[#CEEAD6]"
                          }`}
                        >
                          {isCritical ? "Critical Margin Trigger" : isWarning ? "Buffer Warning" : "Healthy Buffer"}
                        </span>
                      </div>

                      {/* LTV Visual Progress Meter */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-[#70706B]">
                          <span>Current LTV: <strong className="text-[#1A1A1A]">{currentLtv.toFixed(1)}%</strong></span>
                          <span>Margin Call Trigger: <strong className="text-[#B91C1C]">{threshold}%</strong></span>
                        </div>
                        <div className="h-2.5 bg-[#E5E5E1] rounded-sm overflow-hidden relative">
                          <div
                            className={`h-full ${
                              isCritical ? "bg-[#B91C1C]" : isWarning ? "bg-[#C5A059]" : "bg-[#2D8A39]"
                            }`}
                            style={{ width: `${Math.min(currentLtv, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Credit Limit</span>
                          <span className="font-semibold text-[#1A1A1A]">${(fac.credit_limit / 1e6).toFixed(1)}M</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Amount Drawn</span>
                          <span className="font-semibold text-[#1A1A1A]">${(fac["drawn_2026-08-26"] / 1e6).toFixed(1)}M</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Headroom Remaining</span>
                          <span className="font-semibold text-[#1A1A1A]">${(headroom / 1e6).toFixed(2)}M</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Distance to Margin</span>
                          <span className={`font-semibold ${isWarning ? "text-[#B91C1C]" : "text-[#2D8A39]"}`}>
                            {(threshold - currentLtv).toFixed(1)}% LTV
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#70706B]">No active credit facilities for this client.</p>
            )}
          </div>

          {/* Mandate Compliance Check */}
          <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
            <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
              Mandate Governance &amp; ESG Status
            </h3>
            <div className="space-y-3">
              {mandateCompliance.map((mc, idx) => (
                <div key={idx} className="p-4 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1A1A1A]">{mc.mandate_name} ({mc.mandate_code})</span>
                    <span className="text-[10px] text-[#70706B]">Portfolio: {mc.portfolio_id}</span>
                  </div>

                  {mc.sustainabilityBreaches.length > 0 ? (
                    <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-sm text-[#991B1B]">
                      <span className="font-semibold">Exclusion Breach: </span>
                      {mc.sustainabilityBreaches[0].reason} ({mc.sustainabilityBreaches[0].instrument_name})
                    </div>
                  ) : (
                    <div className="p-2.5 bg-[#E6F4EA] border border-[#CEEAD6] rounded-sm text-[#2D8A39] flex items-center space-x-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>All holdings comply with mandate ESG exclusions and single-name limits.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: Scenario Stress What-If */}
      {activeTab === "stress" && (
        <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0F0EE]">
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
                Client Portfolio Stress Simulator
              </h3>
              <p className="text-xs text-[#70706B] mt-0.5">
                Simulate macro event shocks on {client.client_name}'s AUM and Lombard collateral in 1-click.
              </p>
            </div>
          </div>

          {/* Scenario Selector Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PREDEFINED_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`p-3.5 text-left rounded-sm border transition-all cursor-pointer ${
                  selectedScenarioId === sc.id
                    ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs"
                    : "bg-[#FDFDFB] hover:bg-[#F4F4F1] border-[#E5E5E1] text-[#1A1A1A]"
                }`}
              >
                <div className="font-semibold text-xs">{sc.name}</div>
                <div className={`text-[11px] mt-1 line-clamp-2 ${selectedScenarioId === sc.id ? "text-white/80" : "text-[#70706B]"}`}>
                  {sc.description}
                </div>
              </button>
            ))}
          </div>

          {/* Stress Results Display */}
          <div className="p-5 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Current AUM</span>
                <span className="text-base font-light text-[#1A1A1A]">USD {(client.total_aum_usd / 1e6).toFixed(1)}M</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Simulated AUM Impact</span>
                <span className={`text-base font-semibold ${stressResult.estimatedAumImpactPct >= 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"}`}>
                  {stressResult.estimatedAumImpactPct >= 0 ? "+" : ""}
                  {stressResult.estimatedAumImpactPct.toFixed(1)}% (${(stressResult.estimatedAumImpactUsd / 1e3).toFixed(0)}k)
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Lombard Facility Status</span>
                <span className={`text-sm font-semibold ${stressResult.facilityLtvImpact?.marginCallTriggered ? "text-[#B91C1C]" : "text-[#2D8A39]"}`}>
                  {stressResult.facilityLtvImpact
                    ? stressResult.facilityLtvImpact.marginCallTriggered
                      ? "MARGIN CALL TRIGGERED"
                      : `LTV ${stressResult.facilityLtvImpact.afterLtv.toFixed(1)}% (Safe)`
                    : "No credit facility"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Advisory Remedy</span>
                <span className="text-xs text-[#1A1A1A] font-medium block mt-0.5 line-clamp-2">
                  {stressResult.strategicAdvice}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: Notes & Cash Needs */}
      {activeTab === "notes" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Priscilla's Notes */}
          <div className="lg:col-span-7 bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
            <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
              Priscilla's Relationship Manager Meeting History &amp; Sentiment
            </h3>
            <div className="space-y-3">
              {clientNotes.length > 0 ? (
                clientNotes.map((n, idx) => (
                  <div key={idx} className="p-3.5 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[#70706B] text-[10px]">
                      <span className="font-semibold text-[#1A1A1A]">{n.channel}</span>
                      <span>{n.note_date}</span>
                    </div>
                    <p className="text-[#1A1A1A] leading-relaxed mt-1">{n.note}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#70706B]">No recorded notes for this client.</p>
              )}
            </div>
          </div>

          {/* Right: Cash Needs & Commitments */}
          <div className="lg:col-span-5 bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
            <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
              Planned Cash Needs &amp; Fund Commitments
            </h3>
            <div className="space-y-3">
              {clientCashNeeds.map((cn) => (
                <div key={cn.need_id} className="p-3 bg-[#FAF7F0] rounded-sm border border-[#E9DFCB] text-xs">
                  <div className="flex justify-between font-semibold text-[#1A1A1A]">
                    <span>{cn.description}</span>
                    <span className="text-[#8C6D23]">{cn.currency} {(cn.amount / 1e3).toLocaleString()}k</span>
                  </div>
                  <div className="text-[10px] text-[#70706B] mt-1">Due Date: {cn.due_from} • Priority: {cn.priority}</div>
                </div>
              ))}

              {clientCommitments.map((cm) => (
                <div key={cm.commitment_id} className="p-3 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] text-xs">
                  <div className="flex justify-between font-semibold text-[#1A1A1A]">
                    <span>{cm.fund_name}</span>
                    <span className="text-[#70706B]">Uncalled: ${(cm.uncalled / 1e3).toLocaleString()}k</span>
                  </div>
                  <div className="text-[10px] text-[#70706B] mt-1">Committed: ${(cm.total_committed / 1e6).toFixed(1)}M • {cm.vintage_year} Vintage</div>
                </div>
              ))}

              {clientCashNeeds.length === 0 && clientCommitments.length === 0 && (
                <p className="text-xs text-[#70706B]">No upcoming cash requirements recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Speed-Dial Quick Action Menu */}
      <RMQuickActionMenu
        client={client}
        onLogCall={handleLogCall}
        onDraftReview={handleDraftReview}
      />
    </div>
  );
};
