import React, { useState, useMemo } from "react";
import {
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Search,
  ArrowRight,
  Sparkles,
  DollarSign,
  Scale,
  Compass,
  FileText,
  UserCheck,
  Building,
  GraduationCap,
  Heart,
  ChevronRight,
  Copy,
  Check,
  Filter,
} from "lucide-react";
import {
  PriorityClientItem,
  PersonalisedRecommendation,
  RebalancingSuggestion,
  TaxAwareOpportunity,
  LifeEventPlan,
} from "../types";
import {
  getRMIntelligenceWorkbench,
  clients,
  creditFacilitiesByClientId,
} from "../utils/intelligenceEngine";

interface RMIntelligenceWorkbenchProps {
  priorityList: PriorityClientItem[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
}

export const RMIntelligenceWorkbench: React.FC<RMIntelligenceWorkbenchProps> = ({
  priorityList,
  selectedClientId,
  onSelectClient,
}) => {
  // Whole-book search and urgency filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("ALL");
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<
    "recommendations" | "rebalancing" | "tax" | "life_events" | "client_briefing"
  >("recommendations");

  // Selected client intelligence
  const workbenchData = useMemo(
    () => getRMIntelligenceWorkbench(selectedClientId),
    [selectedClientId]
  );
  const activePriorityItem = useMemo(
    () => priorityList.find((p) => p.client.client_id === selectedClientId),
    [priorityList, selectedClientId]
  );

  // Local interactive state for recommendations
  const [recommendations, setRecommendations] = useState<PersonalisedRecommendation[]>(
    workbenchData.recommendations
  );
  const [lifePlans, setLifePlans] = useState<LifeEventPlan[]>(workbenchData.lifeEventPlans);
  const [stagedTrades, setStagedTrades] = useState<Set<string>>(new Set());
  const [copiedScript, setCopiedScript] = useState(false);

  // Synchronize when client changes
  React.useEffect(() => {
    const fresh = getRMIntelligenceWorkbench(selectedClientId);
    setRecommendations(fresh.recommendations);
    setLifePlans(fresh.lifeEventPlans);
    setStagedTrades(new Set());
    setCopiedScript(false);
  }, [selectedClientId]);

  // Filtered priority client book
  const filteredBook = useMemo(() => {
    return priorityList.filter((item) => {
      const matchesSearch =
        item.client.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.client.client_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.client.tax_domicile.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUrgency =
        urgencyFilter === "ALL" || item.urgencyLevel.toUpperCase() === urgencyFilter;
      return matchesSearch && matchesUrgency;
    });
  }, [priorityList, searchQuery, urgencyFilter]);

  const handleRecommendationStatus = (
    recId: string,
    newStatus: PersonalisedRecommendation["status"]
  ) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === recId ? { ...r, status: newStatus } : r))
    );
  };

  const toggleTradeStaging = (tradeId: string) => {
    setStagedTrades((prev) => {
      const next = new Set(prev);
      if (next.has(tradeId)) next.delete(tradeId);
      else next.add(tradeId);
      return next;
    });
  };

  const toggleStepCompleted = (pillarIndex: number, stepIndex: number) => {
    setLifePlans((prev) => {
      const next = [...prev];
      const targetPillar = { ...next[pillarIndex] };
      const checklist = [...targetPillar.actionChecklist];
      checklist[stepIndex] = {
        ...checklist[stepIndex],
        completed: !checklist[stepIndex].completed,
      };
      targetPillar.actionChecklist = checklist;
      next[pillarIndex] = targetPillar;
      return next;
    });
  };

  const handleCopyScript = () => {
    const text = `RM ADVISORY BRIEFING: ${workbenchData.client.client_name}
Risk Profile: ${workbenchData.client.risk_profile} | Mandate Score: ${workbenchData.client.risk_tolerance_score}/10
Key Objective: ${workbenchData.client.objectives}
Recommended Action: ${activePriorityItem?.recommendedAction}
Tax Position: Domiciled in ${workbenchData.client.tax_domicile}, resident in ${workbenchData.client.country_of_residence}
Staged Rebalancing Actions: ${stagedTrades.size} pending execution`;
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* SECTION A: Prioritised View Across the Whole Book ("Who to Call First")    */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-sm border border-[#E5E5E1] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#F0F0EE] bg-gradient-to-r from-white via-[#FAF7F0]/40 to-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-[#1A1A1A] text-[#C5A059] uppercase tracking-wider">
                  Requirement 3
                </span>
                <span className="text-[11px] font-semibold text-[#70706B] uppercase tracking-widest">
                  Priscilla Ong&apos;s Advisory Book
                </span>
              </div>
              <h2 className="text-xl font-semibold text-[#1A1A1A] mt-1">
                Prioritised Client Book: Who to Call First
              </h2>
              <p className="text-xs text-[#70706B] mt-0.5">
                Dynamic risk, liquidity, collateral, and mandate intelligence ranked in real time across all 20 client relationships.
              </p>
            </div>

            {/* Quick Summary Badges */}
            <div className="flex items-center space-x-3 text-xs">
              <div className="px-3 py-1.5 rounded-sm bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]">
                <span className="font-bold">{priorityList.filter((p) => p.urgencyLevel === "Critical").length}</span> Critical Call
              </div>
              <div className="px-3 py-1.5 rounded-sm bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]">
                <span className="font-bold">{priorityList.filter((p) => p.urgencyLevel === "High").length}</span> High Priority
              </div>
              <div className="px-3 py-1.5 rounded-sm bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534]">
                <span className="font-bold">{priorityList.length}</span> Total Book
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#70706B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter whole book by client name, ID, or tax domicile..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5E5E1] rounded-sm text-xs text-[#1A1A1A] placeholder-[#70706B] focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
              <Filter className="w-3.5 h-3.5 text-[#70706B] ml-1 mr-0.5" />
              {["ALL", "CRITICAL", "HIGH", "MODERATE"].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setUrgencyFilter(lvl)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                    urgencyFilter === lvl
                      ? "bg-[#1A1A1A] text-white"
                      : "bg-[#F4F4F0] text-[#70706B] hover:text-[#1A1A1A]"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Prioritised Table */}
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#FAF7F0] border-b border-[#E5E5E1] sticky top-0 z-10">
              <tr className="text-[10px] uppercase font-bold text-[#70706B] tracking-wider">
                <th className="py-2.5 px-4">Priority / Client</th>
                <th className="py-2.5 px-4">Total AUM</th>
                <th className="py-2.5 px-4">Primary Trigger &amp; Risk Alert</th>
                <th className="py-2.5 px-4">Life Stage &amp; Domicile</th>
                <th className="py-2.5 px-4 text-right">Workbench Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EE] text-xs">
              {filteredBook.map((item, idx) => {
                const isSelected = item.client.client_id === selectedClientId;
                const isCritical = item.urgencyLevel === "Critical";
                const isHigh = item.urgencyLevel === "High";

                return (
                  <tr
                    key={item.client.client_id}
                    onClick={() => onSelectClient(item.client.client_id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#FAF7F0] border-l-4 border-l-[#C5A059]"
                        : "hover:bg-[#FDFDFB]"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCritical
                              ? "bg-[#DC2626] text-white"
                              : isHigh
                              ? "bg-[#D97706] text-white"
                              : "bg-[#70706B]/20 text-[#1A1A1A]"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-[#1A1A1A] block">
                            {item.client.client_name}
                          </span>
                          <span className="text-[10px] text-[#70706B]">
                            {item.client.client_id} • {item.client.risk_profile}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-[#1A1A1A]">
                      ${(item.client.total_aum_usd / 1e6).toFixed(1)}M
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        {isCritical && <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />}
                        <span
                          className={`truncate max-w-xs ${
                            isCritical
                              ? "text-[#991B1B] font-semibold"
                              : isHigh
                              ? "text-[#92400E] font-medium"
                              : "text-[#70706B]"
                          }`}
                        >
                          {item.primaryTriggers[0]}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[#70706B]">
                      <span className="block truncate max-w-xs">{item.client.life_stage}</span>
                      <span className="text-[10px] text-[#C5A059] font-medium">
                        {item.client.tax_domicile} (res: {item.client.country_of_residence})
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClient(item.client.client_id);
                        }}
                        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-sm text-xs font-semibold cursor-pointer ${
                          isSelected
                            ? "bg-[#C5A059] text-white"
                            : "bg-[#1A1A1A] text-white hover:bg-[#C5A059]"
                        }`}
                      >
                        <span>{isSelected ? "Active Client" : "Select Client"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION B: Active Client RM Cockpit & 5 Core Requirements                */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-sm border border-[#E5E5E1] shadow-xs p-6 space-y-6">
        {/* Client Banner & Mandate Profile */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-[#F0F0EE] gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-sm bg-[#1A1A1A] text-[#C5A059] flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              {workbenchData.client.client_name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-[#1A1A1A]">
                  {workbenchData.client.client_name}
                </h3>
                <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]">
                  {workbenchData.client.client_id}
                </span>
                <span className="px-2 py-0.5 rounded-xs text-[10px] font-semibold bg-[#F4F4F0] text-[#1A1A1A]">
                  {workbenchData.client.wealth_band}
                </span>
              </div>
              <p className="text-xs text-[#70706B] mt-0.5">
                {workbenchData.client.source_of_wealth} • {workbenchData.client.life_stage} • RM Priscilla Ong
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-sm bg-[#FAF7F0] border border-[#E9DFCB]">
              <span className="text-[10px] text-[#70706B] block uppercase">AUM</span>
              <span className="font-mono font-bold text-[#1A1A1A]">
                ${(workbenchData.client.total_aum_usd / 1e6).toFixed(1)}M USD
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-sm bg-[#FAF7F0] border border-[#E9DFCB]">
              <span className="text-[10px] text-[#70706B] block uppercase">Mandate</span>
              <span className="font-semibold text-[#1A1A1A]">
                {workbenchData.client.risk_profile} ({workbenchData.client.risk_tolerance_score}/10)
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-sm bg-[#FAF7F0] border border-[#E9DFCB]">
              <span className="text-[10px] text-[#70706B] block uppercase">Tax Domicile</span>
              <span className="font-semibold text-[#1A1A1A]">
                {workbenchData.client.tax_domicile}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs for the 5 RM Requirements */}
        <div className="flex space-x-2 border-b border-[#F0F0EE] overflow-x-auto pb-1">
          {[
            {
              id: "recommendations",
              label: "Personalised Recommendations",
              icon: Sparkles,
              count: recommendations.length,
            },
            {
              id: "rebalancing",
              label: "Rebalancing & Reasoning",
              icon: Scale,
              count: workbenchData.rebalancingSuggestions.length,
            },
            {
              id: "tax",
              label: "Tax-Aware Optimisation",
              icon: DollarSign,
              count: workbenchData.taxOpportunities.length,
            },
            {
              id: "life_events",
              label: "Life-Event Wealth Planning",
              icon: Compass,
              count: lifePlans.filter((p) => p.isRelevant).length,
            },
            {
              id: "client_briefing",
              label: "Client-Ready Action Plan",
              icon: FileText,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeWorkbenchTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveWorkbenchTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs uppercase tracking-wider font-semibold rounded-t-sm transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-[#1A1A1A] text-white shadow-xs"
                    : "text-[#70706B] hover:text-[#1A1A1A] hover:bg-[#FAF7F0]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#C5A059]" : "text-[#70706B]"}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? "bg-[#C5A059] text-white" : "bg-[#E5E5E1] text-[#70706B]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUB-VIEW 1: Personalised Recommendations Grounded in Profile */}
        {/* ------------------------------------------------------------- */}
        {activeWorkbenchTab === "recommendations" && (
          <div className="space-y-4">
            <div className="bg-[#FAF7F0] p-4 rounded-sm border border-[#E9DFCB] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#1A1A1A]">
                  Grounded RM Recommendations
                </h4>
                <p className="text-xs text-[#70706B]">
                  Tailored strictly to mandate risk ({workbenchData.client.risk_profile}), tax jurisdiction ({workbenchData.client.tax_domicile}), and stated objectives.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#8C6D23]">
                RM Control Mode Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white border border-[#E5E5E1] rounded-sm p-4 flex flex-col justify-between space-y-3 hover:border-[#C5A059] transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059] px-2 py-0.5 bg-[#FAF7F0] rounded-xs">
                        {rec.category}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-xs ${
                          rec.status === "Approved by RM"
                            ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]"
                            : rec.status === "Dismissed"
                            ? "bg-[#F4F4F0] text-[#70706B]"
                            : "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>

                    <h5 className="text-sm font-semibold text-[#1A1A1A]">{rec.title}</h5>
                    <p className="text-xs text-[#1A1A1A] leading-relaxed">{rec.description}</p>

                    <div className="bg-[#FDFDFB] p-2.5 rounded-sm border border-[#F0F0EE] space-y-1 text-[11px]">
                      <span className="font-semibold text-[#70706B] block">Grounded In:</span>
                      <p className="text-[#1A1A1A]">
                        <strong className="font-medium text-[#70706B]">Mandate:</strong> {rec.grounding.mandate}
                      </p>
                      <p className="text-[#1A1A1A]">
                        <strong className="font-medium text-[#70706B]">Tax:</strong> {rec.grounding.taxPosition}
                      </p>
                      <p className="text-[#1A1A1A]">
                        <strong className="font-medium text-[#70706B]">Objective:</strong> {rec.grounding.clientObjectives}
                      </p>
                    </div>

                    <div className="text-[11px] text-[#70706B] pt-1">
                      <strong className="font-semibold text-[#1A1A1A]">Proposed Step:</strong> {rec.proposedAction}
                    </div>
                  </div>

                  {/* RM Action Controls */}
                  <div className="pt-3 border-t border-[#F0F0EE] flex items-center space-x-2">
                    <button
                      onClick={() => handleRecommendationStatus(rec.id, "Approved by RM")}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                        rec.status === "Approved by RM"
                          ? "bg-[#166534] text-white"
                          : "bg-[#1A1A1A] text-white hover:bg-[#C5A059]"
                      }`}
                    >
                      {rec.status === "Approved by RM" ? "✓ Approved" : "Approve"}
                    </button>
                    <button
                      onClick={() => handleRecommendationStatus(rec.id, "Dismissed")}
                      className="px-2.5 py-1.5 text-xs font-medium text-[#70706B] hover:text-[#DC2626] rounded-sm hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUB-VIEW 2: Rebalancing Suggestions (with Reasoning Attached) */}
        {/* ------------------------------------------------------------- */}
        {activeWorkbenchTab === "rebalancing" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F0] p-4 rounded-sm border border-[#E9DFCB]">
              <div>
                <h4 className="text-sm font-semibold text-[#1A1A1A]">
                  Rebalancing Suggestions with Attached Rationale
                </h4>
                <p className="text-xs text-[#70706B]">
                  Every proposed trade includes full analytical reasoning connecting mandate guidelines, concentration limits, and tax efficiency.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-semibold text-[#1A1A1A]">
                  {stagedTrades.size} / {workbenchData.rebalancingSuggestions.length} Staged
                </span>
                <button
                  onClick={() => {
                    const allIds = workbenchData.rebalancingSuggestions.map((s) => s.id);
                    setStagedTrades(new Set(allIds));
                  }}
                  className="px-3 py-1 bg-[#1A1A1A] text-white text-xs font-semibold rounded-sm hover:bg-[#C5A059] transition-colors cursor-pointer"
                >
                  Stage All Trades
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {workbenchData.rebalancingSuggestions.map((trade) => {
                const isStaged = stagedTrades.has(trade.id);
                const isBuy = trade.tradeAction === "BUY";
                const isSell = trade.tradeAction === "SELL" || trade.tradeAction === "TRIM";

                return (
                  <div
                    key={trade.id}
                    className={`p-4 rounded-sm border transition-all ${
                      isStaged
                        ? "bg-[#FAF7F0] border-[#C5A059] shadow-xs"
                        : "bg-white border-[#E5E5E1]"
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-xs uppercase tracking-wider shrink-0 ${
                            isBuy
                              ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]"
                              : isSell
                              ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                              : "bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]"
                          }`}
                        >
                          {trade.tradeAction}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h5 className="text-sm font-semibold text-[#1A1A1A]">
                              {trade.instrumentName}
                            </h5>
                            <span className="text-xs text-[#70706B]">({trade.assetClass})</span>
                          </div>
                          <p className="text-xs font-medium text-[#1A1A1A] mt-1 bg-white/70 p-2 rounded-sm border border-[#E5E5E1]">
                            <strong className="text-[#C5A059]">Reasoning Attached:</strong>{" "}
                            {trade.reasoningAttached}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-xs shrink-0">
                        <div>
                          <span className="text-[10px] text-[#70706B] block uppercase">Weight Change</span>
                          <span className="font-mono font-semibold text-[#1A1A1A]">
                            {trade.currentWeightPct}% → {trade.targetWeightPct}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#70706B] block uppercase">Trade Volume</span>
                          <span className="font-mono font-bold text-[#1A1A1A]">
                            ${Math.abs(trade.deltaUsd / 1e6).toFixed(1)}M USD
                          </span>
                        </div>
                        <button
                          onClick={() => toggleTradeStaging(trade.id)}
                          className={`px-3.5 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-all ${
                            isStaged
                              ? "bg-[#166534] text-white"
                              : "bg-[#1A1A1A] text-white hover:bg-[#C5A059]"
                          }`}
                        >
                          {isStaged ? "✓ Staged for Execution" : "Stage Trade"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#F0F0EE] flex flex-wrap items-center gap-4 text-[11px] text-[#70706B]">
                      <span>
                        <strong className="text-[#1A1A1A]">Mandate Impact:</strong> {trade.mandateImpact}
                      </span>
                      <span>
                        <strong className="text-[#1A1A1A]">Tax Note:</strong> {trade.taxAwareNote}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUB-VIEW 3: Tax-Aware Optimisation Opportunities              */}
        {/* ------------------------------------------------------------- */}
        {activeWorkbenchTab === "tax" && (
          <div className="space-y-4">
            <div className="bg-[#FAF7F0] p-4 rounded-sm border border-[#E9DFCB]">
              <h4 className="text-sm font-semibold text-[#1A1A1A]">
                Tax-Aware Portfolio Optimisation &amp; Structuring
              </h4>
              <p className="text-xs text-[#70706B]">
                Cross-border structuring, statutory withholding tax mitigation, and tax-loss harvesting engineered for {workbenchData.client.client_name}&apos;s tax domicile in {workbenchData.client.tax_domicile}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {workbenchData.taxOpportunities.map((tax) => (
                <div
                  key={tax.id}
                  className="bg-white border border-[#E5E5E1] rounded-sm p-4 space-y-3 hover:border-[#C5A059] transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059] px-2 py-0.5 bg-[#FAF7F0] rounded-xs inline-block">
                      {tax.jurisdiction}
                    </span>
                    <h5 className="text-sm font-semibold text-[#1A1A1A]">{tax.strategyName}</h5>
                    
                    <div className="text-xs text-[#991B1B] bg-[#FEF2F2] p-2.5 rounded-sm border border-[#FECACA]">
                      <strong className="block text-[10px] uppercase tracking-wider font-bold">Current Inefficiency:</strong>
                      {tax.currentStructureIssue}
                    </div>

                    <div className="text-xs text-[#1A1A1A] bg-[#FDFDFB] p-2.5 rounded-sm border border-[#E5E5E1]">
                      <strong className="block text-[10px] uppercase tracking-wider text-[#70706B] font-bold">Recommended Solution:</strong>
                      {tax.optimisationMechanism}
                    </div>

                    <div className="text-xs text-[#166534] bg-[#F0FDF4] p-2 rounded-sm border border-[#BBF7D0] font-semibold">
                      Gain: {tax.taxEfficiencyGain}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F0F0EE]">
                    <span className="text-[10px] uppercase text-[#70706B] font-bold block">RM Action Step:</span>
                    <p className="text-xs text-[#1A1A1A] font-medium">{tax.rmActionStep}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUB-VIEW 4: Life-Event Wealth Planning (5 Pillars)            */}
        {/* ------------------------------------------------------------- */}
        {activeWorkbenchTab === "life_events" && (
          <div className="space-y-5">
            <div className="bg-[#FAF7F0] p-4 rounded-sm border border-[#E9DFCB]">
              <h4 className="text-sm font-semibold text-[#1A1A1A]">
                Comprehensive Life-Event Wealth Planning
              </h4>
              <p className="text-xs text-[#70706B]">
                Active lifecycle milestones across retirement decumulation, founder liquidity, family succession, education trusts, and philanthropic impact.
              </p>
            </div>

            <div className="space-y-4">
              {lifePlans.map((plan, pIdx) => {
                const isImmediate = plan.status === "Immediate Focus";

                return (
                  <div
                    key={plan.pillar}
                    className={`border rounded-sm p-5 transition-all ${
                      isImmediate
                        ? "bg-white border-[#C5A059] shadow-xs"
                        : "bg-white border-[#E5E5E1]"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-[#F0F0EE]">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-sm flex items-center justify-center ${
                            isImmediate ? "bg-[#1A1A1A] text-[#C5A059]" : "bg-[#F4F4F0] text-[#70706B]"
                          }`}
                        >
                          {plan.pillar.includes("Retirement") && <Building className="w-4 h-4" />}
                          {plan.pillar.includes("Business") && <TrendingUp className="w-4 h-4" />}
                          {plan.pillar.includes("Succession") && <UserCheck className="w-4 h-4" />}
                          {plan.pillar.includes("Philanthropy") && <Heart className="w-4 h-4" />}
                          {plan.pillar.includes("Education") && <GraduationCap className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h5 className="text-sm font-bold text-[#1A1A1A]">{plan.pillar}</h5>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase ${
                                isImmediate
                                  ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                                  : "bg-[#F4F4F0] text-[#70706B]"
                              }`}
                            >
                              {plan.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#70706B] mt-0.5">{plan.clientContext}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {plan.recommendedVehicles.map((v) => (
                          <span
                            key={v}
                            className="px-2 py-0.5 bg-[#FAF7F0] border border-[#E9DFCB] rounded-xs text-[10px] font-medium text-[#8C6D23]"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Checklist */}
                    <div className="mt-4 space-y-2.5">
                      <span className="text-[10px] uppercase font-bold text-[#70706B] tracking-wider block">
                        RM Action Checklist:
                      </span>
                      {plan.actionChecklist.map((item, sIdx) => (
                        <div
                          key={item.step}
                          onClick={() => toggleStepCompleted(pIdx, sIdx)}
                          className="flex items-start space-x-3 p-2.5 rounded-sm bg-[#FDFDFB] border border-[#F0F0EE] hover:bg-[#FAF7F0] cursor-pointer transition-colors"
                        >
                          <div
                            className={`w-4 h-4 rounded-xs mt-0.5 flex items-center justify-center transition-colors ${
                              item.completed
                                ? "bg-[#166534] text-white"
                                : "border border-[#70706B] bg-white"
                            }`}
                          >
                            {item.completed && <Check className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 text-xs">
                            <span
                              className={`font-medium ${
                                item.completed ? "line-through text-[#70706B]" : "text-[#1A1A1A]"
                              }`}
                            >
                              {item.step}
                            </span>
                            <div className="flex items-center space-x-3 text-[10px] text-[#70706B] mt-0.5">
                              <span>Timeframe: {item.timeframe}</span>
                              <span>•</span>
                              <span>Notes: {item.rmNotes}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUB-VIEW 5: Client-Ready Action Plan / Advisory Briefing      */}
        {/* ------------------------------------------------------------- */}
        {activeWorkbenchTab === "client_briefing" && (
          <div className="space-y-4">
            <div className="bg-[#FAF7F0] p-4 rounded-sm border border-[#E9DFCB] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#1A1A1A]">
                  Client-Ready Action Plan &amp; Advisory Briefing Guide
                </h4>
                <p className="text-xs text-[#70706B]">
                  Consolidated advisory talking points synthesized for RM Priscilla Ong ahead of meeting {workbenchData.client.client_name}.
                </p>
              </div>

              <button
                onClick={handleCopyScript}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold rounded-sm hover:bg-[#C5A059] transition-all cursor-pointer"
              >
                {copiedScript ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#BBF7D0]" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Client Action Plan</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-white border border-[#E5E5E1] p-5 rounded-sm space-y-4 text-xs">
              <div className="border-b border-[#F0F0EE] pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059]">
                  1. Executive Meeting Agenda &amp; Focus
                </span>
                <p className="text-sm font-semibold text-[#1A1A1A] mt-1">
                  {activePriorityItem?.recommendedAction}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FDFDFB] p-3.5 rounded-sm border border-[#F0F0EE] space-y-2">
                  <span className="font-bold text-[11px] text-[#1A1A1A] block">
                    Portfolio &amp; Mandate Status
                  </span>
                  <p className="text-[#70706B] leading-relaxed">
                    Total AUM is ${(workbenchData.client.total_aum_usd / 1e6).toFixed(1)}M USD under the {workbenchData.client.risk_profile} mandate. Highlight that 2026 performance captured strong gold and commodity gains while tech valuation volatility was buffered by cash liquidity.
                  </p>
                </div>

                <div className="bg-[#FDFDFB] p-3.5 rounded-sm border border-[#F0F0EE] space-y-2">
                  <span className="font-bold text-[11px] text-[#1A1A1A] block">
                    Key Decisions for Client Approval
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-[#70706B]">
                    <li>Approve staged rebalancing ({stagedTrades.size} trades currently queued).</li>
                    <li>Review collateral buffer for Lombard facility to maintain safe headroom.</li>
                    <li>Initiate Singapore VCC or trust tax structuring roadmap.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-[#FAF7F0] p-4 rounded-sm border border-[#E9DFCB]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C6D23] block mb-1">
                  Verbatim RM Talking Point
                </span>
                <p className="italic text-[#1A1A1A] leading-relaxed text-xs">
                  &ldquo;{workbenchData.client.client_name}, our objective today is to lock in your substantial commodity and precious metals gains from early 2026, rebalance single-stock concentration back into high-grade yield, and ensure your offshore structures in Singapore are fully optimized for your family&apos;s multi-generational wealth goals.&rdquo;
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
