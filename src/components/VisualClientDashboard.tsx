import React, { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import {
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Zap,
  ArrowRight,
  DollarSign,
  Layers,
  Sparkles,
  ChevronRight,
  Check,
  Percent,
  Compass,
} from "lucide-react";
import {
  clients,
  clientsById,
  holdings,
  creditFacilitiesByClientId,
  commitmentsByClientId,
  plannedCashNeedsByClientId,
  TODAY_SNAPSHOT,
  getPriorityRankings,
} from "../utils/intelligenceEngine";
import { LombardLtvMeter, ClientRiskGauge } from "./RiskMeter";

// Distinctive Julius Baer visual palette
const ASSET_COLORS: Record<string, string> = {
  Equities: "#1A1A1A", // Signature Charcoal
  "Fixed Income": "#C5A059", // Champagne Gold
  Commodities: "#B45309", // Warm Bullion Amber
  "Structured Products": "#8C6D23", // Deep Ochre
  Cash: "#2D8A39", // Forest Green
  Alternatives: "#4B5563", // Slate
};

interface VisualClientDashboardProps {
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
}

export const VisualClientDashboard: React.FC<VisualClientDashboardProps> = ({
  selectedClientId,
  onSelectClient,
}) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  // Action feedback states
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [proposedOpportunities, setProposedOpportunities] = useState<Set<string>>(new Set());

  // Active client
  const client = useMemo(
    () => clientsById.get(selectedClientId) || clients[0],
    [selectedClientId]
  );

  // Client holdings
  const clientHoldings = useMemo(
    () =>
      holdings.filter(
        (h) => h.client_id === client.client_id && h.snapshot_date === TODAY_SNAPSHOT
      ),
    [client.client_id]
  );

  // Baseline holdings (for YTD return calculation)
  const baselineHoldings = useMemo(
    () =>
      holdings.filter(
        (h) => h.client_id === client.client_id && h.snapshot_date === "2025-12-31"
      ),
    [client.client_id]
  );

  // AUM calculations
  const totalAumUsd = useMemo(
    () => clientHoldings.reduce((sum, h) => sum + h.market_value_usd, 0),
    [clientHoldings]
  );
  const baselineAumUsd = useMemo(
    () => baselineHoldings.reduce((sum, h) => sum + h.market_value_usd, 0),
    [baselineHoldings]
  );
  const ytdPnlUsd = totalAumUsd - baselineAumUsd;
  const ytdPnlPct = baselineAumUsd > 0 ? (ytdPnlUsd / baselineAumUsd) * 100 : 0;

  // Asset allocation donut data
  const allocationData = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of clientHoldings) {
      const cur = map.get(h.asset_class) || 0;
      map.set(h.asset_class, cur + h.market_value_usd);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value,
        pct: totalAumUsd > 0 ? (value / totalAumUsd) * 100 : 0,
        color: ASSET_COLORS[name] || "#70706B",
      }))
      .sort((a, b) => b.value - a.value);
  }, [clientHoldings, totalAumUsd]);

  // SAA target vs actual comparison data
  const saaComparisonData = useMemo(() => {
    return [
      { name: "Equities", actual: 44.5, target: 40.0 },
      { name: "Fixed Income", actual: 23.5, target: 30.0 },
      { name: "Commodities", actual: 16.5, target: 12.0 },
      { name: "Structured", actual: 8.5, target: 10.0 },
      { name: "Cash", actual: 7.0, target: 8.0 },
    ];
  }, []);

  // Top 4 holdings for visual bento
  const topHoldings = useMemo(() => {
    return [...clientHoldings]
      .sort((a, b) => b.market_value_usd - a.market_value_usd)
      .slice(0, 4);
  }, [clientHoldings]);

  // Credit / Lombard facility
  const creditFacility = useMemo(() => {
    const facs = creditFacilitiesByClientId.get(client.client_id) || [];
    return facs[0];
  }, [client.client_id]);

  // Search filter for clients
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.client_name.toLowerCase().includes(q) ||
        c.client_id.toLowerCase().includes(q) ||
        c.tax_domicile.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Handle action triggers
  const handleActionClick = (id: string) => {
    setCompletedActions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpportunityClick = (id: string) => {
    setProposedOpportunities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* ========================================================================= */}
      {/* SIMPLE SEARCH HEADER (Visual-First, No Queues, No Categories)              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-sm border border-[#E5E5E1] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#70706B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client name e.g. Tan, Al-Mansoor, Chen, Sterling..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#FAF7F0]/60 hover:bg-white focus:bg-white border border-[#E5E5E1] rounded-sm text-sm text-[#1A1A1A] placeholder-[#70706B] focus:outline-none focus:border-[#C5A059] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#70706B] hover:text-[#1A1A1A]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Active Client Indicator */}
          <div className="flex items-center space-x-2 text-xs font-semibold shrink-0 bg-[#FAF7F0] px-3.5 py-2 rounded-sm border border-[#E9DFCB]">
            <span className="text-[#70706B]">Active:</span>
            <span className="text-[#1A1A1A]">{client.client_name}</span>
            <span className="font-mono text-[#8C6D23] font-bold">
              ${(totalAumUsd / 1e6).toFixed(1)}M
            </span>
          </div>
        </div>

        {/* Instant Search Results Popdown if query typed */}
        {filteredClients.length > 0 && (
          <div className="mt-3 divide-y divide-[#F0F0EE] border-t border-[#F0F0EE] pt-2">
            <span className="text-[10px] font-bold uppercase text-[#70706B] tracking-wider block mb-1">
              Search Results ({filteredClients.length}):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {filteredClients.map((c) => (
                <button
                  key={c.client_id}
                  onClick={() => {
                    onSelectClient(c.client_id);
                    setSearchQuery("");
                  }}
                  className="text-left p-2 rounded-sm bg-[#FAF7F0]/50 hover:bg-[#FAF7F0] border border-[#E5E5E1] hover:border-[#C5A059] transition-all cursor-pointer"
                >
                  <span className="font-semibold text-xs text-[#1A1A1A] block truncate">
                    {c.client_name}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-[#70706B] mt-0.5">
                    <span>{c.risk_profile}</span>
                    <span className="font-mono font-bold text-[#1A1A1A]">
                      ${(c.total_aum_usd / 1e6).toFixed(1)}M
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Horizontal Client Selector Chips */}
        {!searchQuery && (
          <div className="mt-3 pt-2.5 border-t border-[#F0F0EE] flex items-center space-x-2 overflow-x-auto text-xs">
            <span className="text-[10px] font-bold uppercase text-[#70706B] tracking-wider shrink-0 mr-1">
              Select Client:
            </span>
            {clients.slice(0, 6).map((c) => {
              const isSelected = c.client_id === client.client_id;
              return (
                <button
                  key={c.client_id}
                  onClick={() => onSelectClient(c.client_id)}
                  className={`px-3 py-1.5 rounded-sm font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                    isSelected
                      ? "bg-[#1A1A1A] text-white shadow-xs"
                      : "bg-[#FAF7F0] hover:bg-[#F4F4F0] text-[#1A1A1A] border border-[#E5E5E1]"
                  }`}
                >
                  <span>{c.client_name}</span>
                  <span
                    className={`font-mono text-[10px] ${
                      isSelected ? "text-[#C5A059]" : "text-[#70706B]"
                    }`}
                  >
                    ${(c.total_aum_usd / 1e6).toFixed(0)}M
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. VISUAL AUM                                                             */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-sm border border-[#E5E5E1] p-6 shadow-xs space-y-6">
        {/* Visual Hero Metric Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#F0F0EE]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] block">
              1. Visual Assets Under Management
            </span>
            <div className="flex items-baseline space-x-3 mt-1">
              <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-[#1A1A1A]">
                ${(totalAumUsd / 1e6).toFixed(2)}M
              </span>
              <span className="text-xs font-semibold text-[#70706B] uppercase">USD</span>
              <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-sm bg-[#F0FDF4] border border-[#BBF7D0] text-xs font-bold text-[#166534]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {ytdPnlPct >= 0 ? "+" : ""}
                  {ytdPnlPct.toFixed(1)}% YTD (+${(ytdPnlUsd / 1e6).toFixed(2)}M)
                </span>
              </div>
            </div>
          </div>

          {/* Clean Profile Badges */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-3 py-1.5 rounded-sm bg-[#FAF7F0] border border-[#E9DFCB] text-[#8C6D23] font-semibold">
              {client.risk_profile} ({client.risk_tolerance_score}/10)
            </span>
            <span className="px-3 py-1.5 rounded-sm bg-[#FAF7F0] border border-[#E9DFCB] text-[#1A1A1A] font-medium">
              Tax: {client.tax_domicile}
            </span>
            <span className="px-3 py-1.5 rounded-sm bg-[#FAF7F0] border border-[#E9DFCB] text-[#1A1A1A] font-medium">
              Horizon: {client.investment_horizon_years} yrs
            </span>
          </div>
        </div>

        {/* Visual Charts Grid: Donut + SAA Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Donut Chart with Center Label */}
          <div className="lg:col-span-6 flex flex-col sm:flex-row items-center justify-center gap-4 bg-[#FAF7F0]/40 p-4 rounded-sm border border-[#E5E5E1]">
            <div className="w-48 h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {allocationData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [
                      `$${(Number(val) / 1e6).toFixed(2)}M`,
                      "Market Value",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] uppercase font-bold text-[#70706B]">AUM</span>
                <span className="text-sm font-mono font-bold text-[#1A1A1A]">
                  ${(totalAumUsd / 1e6).toFixed(1)}M
                </span>
              </div>
            </div>

            {/* Visual Legend with Percentage Bars */}
            <div className="flex-1 w-full space-y-2 text-xs">
              {allocationData.map((item) => (
                <div key={item.name} className="space-y-0.5">
                  <div className="flex items-center justify-between font-medium">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[#1A1A1A]">{item.name}</span>
                    </div>
                    <span className="font-mono text-[#70706B]">{item.pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#E5E5E1] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.pct}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SAA Target vs Actual Visual Comparison */}
          <div className="lg:col-span-6 space-y-3 bg-[#FAF7F0]/40 p-4 rounded-sm border border-[#E5E5E1]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[#1A1A1A]">
                Target vs Actual SAA Corridors
              </span>
              <span className="text-[10px] text-[#70706B] font-mono">
                Mandate Policy Bands
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {saaComparisonData.map((s) => {
                const diff = s.actual - s.target;
                const isOver = diff > 2.5;
                const isUnder = diff < -2.5;

                return (
                  <div key={s.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#1A1A1A]">{s.name}</span>
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-[#70706B]">Target: {s.target}%</span>
                        <span className="font-bold text-[#1A1A1A]">
                          Actual: {s.actual.toFixed(1)}%
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded-xs text-[10px] font-bold ${
                            isOver
                              ? "bg-[#FEF2F2] text-[#991B1B]"
                              : isUnder
                              ? "bg-[#FFFBEB] text-[#92400E]"
                              : "bg-[#F0FDF4] text-[#166534]"
                          }`}
                        >
                          {isOver
                            ? `+${diff.toFixed(1)}% (Over)`
                            : isUnder
                            ? `${diff.toFixed(1)}% (Under)`
                            : "On Target"}
                        </span>
                      </div>
                    </div>

                    {/* Dual visual progress bar */}
                    <div className="relative h-2 w-full bg-[#E5E5E1] rounded-full overflow-hidden">
                      <div
                        className="absolute h-full rounded-full bg-[#1A1A1A]"
                        style={{ width: `${s.actual}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-[#C5A059] z-10"
                        style={{ left: `${s.target}%` }}
                        title={`Target: ${s.target}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Visual Top Holdings Bento */}
        <div>
          <span className="text-[10px] font-bold uppercase text-[#70706B] tracking-wider block mb-2">
            Top Holdings Visual Balance:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {topHoldings.map((h) => {
              const isPositive = h.unrealised_pnl_base >= 0;
              return (
                <div
                  key={h.instrument_name}
                  className="bg-[#FAF7F0]/30 border border-[#E5E5E1] rounded-sm p-3 space-y-1.5 hover:border-[#C5A059] transition-all"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#1A1A1A] truncate max-w-[140px]">
                      {h.instrument_name}
                    </span>
                    <span className="font-mono font-bold text-[#1A1A1A]">
                      {h.weight_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#70706B]">
                    <span>{h.sector}</span>
                    <span
                      className={`font-mono font-semibold ${
                        isPositive ? "text-[#166534]" : "text-[#991B1B]"
                      }`}
                    >
                      {isPositive ? "+" : ""}${(h.unrealised_pnl_base / 1e6).toFixed(2)}M
                    </span>
                  </div>
                  <div className="h-1 w-full bg-[#E5E5E1] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C5A059] rounded-full"
                      style={{ width: `${Math.min(100, h.weight_pct * 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. ACTIONS NEEDED (VISUAL-FIRST)                                          */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-sm border border-[#E5E5E1] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#991B1B] block">
              2. Actions Needed
            </span>
            <h3 className="text-base font-bold text-[#1A1A1A] mt-0.5">
              Visual Risk Triggers &amp; Immediate Rebalancing
            </h3>
          </div>
          <span className="text-xs text-[#70706B] font-mono">
            {completedActions.size} of 4 Actions Resolved
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ACTION 1: Lombard LTV Visual Meter */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-3 transition-all ${
              completedActions.has("act-lombard")
                ? "bg-[#F0FDF4] border-[#BBF7D0]"
                : creditFacility && creditFacility["ltv_pct_2026-08-26"] >= 65
                ? "bg-[#FFFBEB] border-[#FDE68A]"
                : "bg-[#FDFDFB] border-[#E5E5E1]"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#70706B]">
                  Lombard LTV Buffer
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-xs bg-[#FEF2F2] text-[#991B1B]">
                  Caution
                </span>
              </div>

              {/* Visual Meter */}
              <div className="flex justify-center py-1">
                <LombardLtvMeter
                  currentLtv={creditFacility ? creditFacility["ltv_pct_2026-08-26"] : 68.4}
                  marginCallThreshold={70}
                  size="sm"
                  headroomUsd={creditFacility ? creditFacility["headroom_2026-08-26"] : 1200000}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-[#1A1A1A]">
                  LTV: {creditFacility ? creditFacility["ltv_pct_2026-08-26"].toFixed(1) : "68.4"}%
                </span>
                <span className="text-[#8C6D23]">Headroom: $1.2M</span>
              </div>
            </div>

            <button
              onClick={() => handleActionClick("act-lombard")}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                completedActions.has("act-lombard")
                  ? "bg-[#166534] text-white"
                  : "bg-[#1A1A1A] text-white hover:bg-[#C5A059]"
              }`}
            >
              {completedActions.has("act-lombard") ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Buffer Top-Up Staged</span>
                </>
              ) : (
                <span>De-Risk Lombard Headroom</span>
              )}
            </button>
          </div>

          {/* ACTION 2: Mandate Drift Rebalancing */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-3 transition-all ${
              completedActions.has("act-drift")
                ? "bg-[#F0FDF4] border-[#BBF7D0]"
                : "bg-[#FFFBEB] border-[#FDE68A]"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#70706B]">
                  Mandate Drift
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-xs bg-[#FDE68A] text-[#92400E]">
                  Overweight
                </span>
              </div>

              <h4 className="text-xs font-bold text-[#1A1A1A]">
                Commodities +4.5% Above Mandate Max
              </h4>

              {/* Visual drift bar */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-mono">
                  <span>Actual: 16.5%</span>
                  <span className="text-[#92400E] font-bold">Max Allowed: 12.0%</span>
                </div>
                <div className="h-2 w-full bg-[#E5E5E1] rounded-full overflow-hidden">
                  <div className="h-full bg-[#B45309] rounded-full" style={{ width: "85%" }} />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleActionClick("act-drift")}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                completedActions.has("act-drift")
                  ? "bg-[#166534] text-white"
                  : "bg-[#1A1A1A] text-white hover:bg-[#C5A059]"
              }`}
            >
              {completedActions.has("act-drift") ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Rebalanced to Target</span>
                </>
              ) : (
                <span>Rebalance Commodities (-$2.1M)</span>
              )}
            </button>
          </div>

          {/* ACTION 3: Single-Stock Concentration */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-3 transition-all ${
              completedActions.has("act-conc")
                ? "bg-[#F0FDF4] border-[#BBF7D0]"
                : "bg-[#FEF2F2] border-[#FECACA]"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#70706B]">
                  Concentration
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-xs bg-[#FCA5A5] text-[#991B1B]">
                  Breach
                </span>
              </div>

              <h4 className="text-xs font-bold text-[#1A1A1A]">
                Alphabet Inc. at 13.8% (Limit: 10%)
              </h4>

              {/* Visual concentration bar */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-mono">
                  <span>Current: 13.8%</span>
                  <span className="text-[#991B1B] font-bold">Limit: 10.0%</span>
                </div>
                <div className="h-2 w-full bg-[#E5E5E1] rounded-full overflow-hidden">
                  <div className="h-full bg-[#DC2626] rounded-full" style={{ width: "95%" }} />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleActionClick("act-conc")}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                completedActions.has("act-conc")
                  ? "bg-[#166534] text-white"
                  : "bg-[#1A1A1A] text-white hover:bg-[#C5A059]"
              }`}
            >
              {completedActions.has("act-conc") ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Trim Staged (-$2.0M)</span>
                </>
              ) : (
                <span>Trim Position to 9.5%</span>
              )}
            </button>
          </div>

          {/* ACTION 4: Capital Call Liquidity Coverage */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-3 transition-all ${
              completedActions.has("act-liq")
                ? "bg-[#F0FDF4] border-[#BBF7D0]"
                : "bg-[#FDFDFB] border-[#E5E5E1]"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#70706B]">
                  Liquidity Coverage
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-xs bg-[#BBF7D0] text-[#166534]">
                  Sufficient
                </span>
              </div>

              <h4 className="text-xs font-bold text-[#1A1A1A]">
                Upcoming Private Equity Call: $2.5M
              </h4>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-mono">
                  <span>Liquid Cash: $3.2M</span>
                  <span className="text-[#166534] font-bold">128% Covered</span>
                </div>
                <div className="h-2 w-full bg-[#E5E5E1] rounded-full overflow-hidden">
                  <div className="h-full bg-[#2D8A39] rounded-full" style={{ width: "78%" }} />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleActionClick("act-liq")}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                completedActions.has("act-liq")
                  ? "bg-[#166534] text-white"
                  : "bg-[#1A1A1A] text-white hover:bg-[#C5A059]"
              }`}
            >
              {completedActions.has("act-liq") ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Call Funding Earmarked</span>
                </>
              ) : (
                <span>Earmark $2.5M for Call</span>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. UPSELLING & INVESTMENT OPPORTUNITIES (VISUAL-FIRST)                    */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-sm border border-[#E5E5E1] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] block">
              3. Upselling &amp; Growth Opportunities
            </span>
            <h3 className="text-base font-bold text-[#1A1A1A] mt-0.5">
              High-Conviction Ideas Tailored for {client.client_name}
            </h3>
          </div>
          <span className="text-xs text-[#8C6D23] font-semibold bg-[#FAF7F0] px-3 py-1 rounded-sm border border-[#E9DFCB]">
            {proposedOpportunities.size} of 4 Proposals Staged
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* OPP 1: Gold Volatility Monetization */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-4 transition-all ${
              proposedOpportunities.has("opp-gold")
                ? "bg-[#FAF7F0] border-[#C5A059] shadow-xs"
                : "bg-white border-[#E5E5E1] hover:border-[#C5A059]"
            }`}
          >
            <div className="space-y-2">
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]">
                Yield Enhancement
              </span>
              <h4 className="text-sm font-bold text-[#1A1A1A]">
                Bullion Fixed Coupon Note (FCN)
              </h4>
              {/* Big Visual Metric */}
              <div className="py-2 border-y border-[#F0F0EE]">
                <span className="text-2xl font-mono font-bold text-[#166534] block">
                  9.8% p.a.
                </span>
                <span className="text-[10px] text-[#70706B]">
                  Guaranteed quarterly cash coupon
                </span>
              </div>
              <div className="text-[11px] text-[#70706B] space-y-1">
                <p>• 70% Downside Protection Barrier</p>
                <p>• Monetizes elevated gold volatility</p>
              </div>
            </div>

            <button
              onClick={() => handleOpportunityClick("opp-gold")}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                proposedOpportunities.has("opp-gold")
                  ? "bg-[#166534] text-white"
                  : "bg-[#1A1A1A] text-white hover:bg-[#C5A059]"
              }`}
            >
              {proposedOpportunities.has("opp-gold") ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Term Sheet Generated</span>
                </>
              ) : (
                <span>Propose to Client</span>
              )}
            </button>
          </div>

          {/* OPP 2: Green Bond Multi-Year Yield Lock-in */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-4 transition-all ${
              proposedOpportunities.has("opp-green")
                ? "bg-[#FAF7F0] border-[#C5A059] shadow-xs"
                : "bg-white border-[#E5E5E1] hover:border-[#C5A059]"
            }`}
          >
            <div className="space-y-2">
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                Fixed Income Lock-in
              </span>
              <h4 className="text-sm font-bold text-[#1A1A1A]">
                Julius Baer Green Bond Fund
              </h4>
              {/* Big Visual Metric */}
              <div className="py-2 border-y border-[#F0F0EE]">
                <span className="text-2xl font-mono font-bold text-[#166534] block">
                  5.4% p.a.
                </span>
                <span className="text-[10px] text-[#70706B]">
                  5-Year Multi-Year Lock-in Yield
                </span>
              </div>
              <div className="text-[11px] text-[#70706B] space-y-1">
                <p>• High Investment Grade (A-rated)</p>
                <p>• Locks in peak rates before easing</p>
              </div>
            </div>

            <button
              onClick={() => handleOpportunityClick("opp-green")}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                proposedOpportunities.has("opp-green")
                  ? "bg-[#166534] text-white"
                  : "bg-[#1A1A1A] text-white hover:bg-[#C5A059]"
              }`}
            >
              {proposedOpportunities.has("opp-green") ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Allocation Staged</span>
                </>
              ) : (
                <span>Propose to Client</span>
              )}
            </button>
          </div>

          {/* OPP 3: Capital-Protected Energy Note */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-4 transition-all ${
              proposedOpportunities.has("opp-energy")
                ? "bg-[#FAF7F0] border-[#C5A059] shadow-xs"
                : "bg-white border-[#E5E5E1] hover:border-[#C5A059]"
            }`}
          >
            <div className="space-y-2">
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                Capital Protected
              </span>
              <h4 className="text-sm font-bold text-[#1A1A1A]">
                Energy Transition Participation Note
              </h4>
              {/* Big Visual Metric */}
              <div className="py-2 border-y border-[#F0F0EE]">
                <span className="text-2xl font-mono font-bold text-[#C5A059] block">
                  100% Floor
                </span>
                <span className="text-[10px] text-[#70706B]">
                  Zero principal downside risk
                </span>
              </div>
              <div className="text-[11px] text-[#70706B] space-y-1">
                <p>• 1.4x Upside participation</p>
                <p>• Captures Hormuz supply disruption</p>
              </div>
            </div>

            <button
              onClick={() => handleOpportunityClick("opp-energy")}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                proposedOpportunities.has("opp-energy")
                  ? "bg-[#166534] text-white"
                  : "bg-[#1A1A1A] text-white hover:bg-[#C5A059]"
              }`}
            >
              {proposedOpportunities.has("opp-energy") ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Structure Viewed</span>
                </>
              ) : (
                <span>Propose to Client</span>
              )}
            </button>
          </div>

          {/* OPP 4: Singapore VCC Tax Structuring */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-4 transition-all ${
              proposedOpportunities.has("opp-vcc")
                ? "bg-[#FAF7F0] border-[#C5A059] shadow-xs"
                : "bg-white border-[#E5E5E1] hover:border-[#C5A059]"
            }`}
          >
            <div className="space-y-2">
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]">
                Tax &amp; Wealth Planning
              </span>
              <h4 className="text-sm font-bold text-[#1A1A1A]">
                Singapore VCC Fund Wrapper
              </h4>
              {/* Big Visual Metric */}
              <div className="py-2 border-y border-[#F0F0EE]">
                <span className="text-2xl font-mono font-bold text-[#166534] block">
                  0% Tax
                </span>
                <span className="text-[10px] text-[#70706B]">
                  Onshore Singapore 13O / 13U Exemption
                </span>
              </div>
              <div className="text-[11px] text-[#70706B] space-y-1">
                <p>• Eliminates cross-border remittance risk</p>
                <p>• Multi-generational succession ready</p>
              </div>
            </div>

            <button
              onClick={() => handleOpportunityClick("opp-vcc")}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                proposedOpportunities.has("opp-vcc")
                  ? "bg-[#166534] text-white"
                  : "bg-[#1A1A1A] text-white hover:bg-[#C5A059]"
              }`}
            >
              {proposedOpportunities.has("opp-vcc") ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Advisory Engaged</span>
                </>
              ) : (
                <span>Propose to Client</span>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
