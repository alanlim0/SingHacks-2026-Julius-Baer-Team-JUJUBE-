import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  holdings,
  mandates,
  portfoliosByClientId,
  clientsById,
  TODAY_SNAPSHOT,
} from "../utils/intelligenceEngine";
import { CheckCircle2, TrendingUp, TrendingDown, RefreshCw, Sparkles } from "lucide-react";

interface AllocationComparisonProps {
  clientId: string;
  compact?: boolean;
  onTradeRebalance?: () => void;
}

// Dedicated distinctive asset class palette
const ASSET_CLASS_COLORS: Record<string, string> = {
  "Equity": "#1A1A1A", // Signature Charcoal
  "Fixed Income": "#C5A059", // Signature Champagne Gold
  "Structured Products": "#8C6D23", // Deep Ochre
  "Alternatives": "#4B5563", // Slate Gray
  "Cash and Equivalents": "#2D8A39", // Forest Green
  "Commodities": "#B45309", // Warm Amber
};

// Fallback target SAA allocations by Risk Profile if mandate table entry is incomplete
const DEFAULT_SAA_BY_PROFILE: Record<string, Record<string, number>> = {
  "Conservative": {
    "Fixed Income": 60,
    "Equity": 20,
    "Cash and Equivalents": 10,
    "Alternatives": 5,
    "Commodities": 5,
    "Structured Products": 0,
  },
  "Moderate": {
    "Fixed Income": 45,
    "Equity": 35,
    "Cash and Equivalents": 10,
    "Alternatives": 5,
    "Structured Products": 5,
  },
  "Balanced Growth": {
    "Equity": 45,
    "Fixed Income": 35,
    "Alternatives": 10,
    "Structured Products": 5,
    "Cash and Equivalents": 5,
  },
  "Growth": {
    "Equity": 60,
    "Fixed Income": 20,
    "Alternatives": 10,
    "Structured Products": 5,
    "Cash and Equivalents": 5,
  },
  "Dynamic": {
    "Equity": 75,
    "Alternatives": 15,
    "Fixed Income": 5,
    "Cash and Equivalents": 5,
    "Structured Products": 0,
  },
};

const CustomDonutTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const pctVal = typeof data.payload?.pct === "number" ? data.payload.pct : (typeof data.value === "number" ? data.value : 0);
    return (
      <div className="bg-white border border-[#E5E5E1] p-2.5 rounded-sm shadow-md text-xs">
        <p className="font-semibold text-[#1A1A1A]">{data.name}</p>
        <p className="font-mono text-[#70706B] mt-0.5">
          {pctVal.toFixed(1)}%
          {data.payload?.usdValue ? ` (USD $${(data.payload.usdValue / 1e6).toFixed(2)}M)` : ""}
        </p>
      </div>
    );
  }
  return null;
};

export const AllocationComparison: React.FC<AllocationComparisonProps> = ({
  clientId,
  compact = false,
  onTradeRebalance,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const client = useMemo(() => clientsById.get(clientId), [clientId]);
  const clientHoldings = useMemo(
    () => holdings.filter((h) => h.client_id === clientId && h.snapshot_date === TODAY_SNAPSHOT),
    [clientId]
  );
  const clientPortfolios = useMemo(
    () => portfoliosByClientId.get(clientId) || [],
    [clientId]
  );

  // Compute Current Allocation
  const currentAllocation = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const h of clientHoldings) {
      map.set(h.asset_class, (map.get(h.asset_class) || 0) + h.market_value_usd);
      total += h.market_value_usd;
    }

    const list = Array.from(map.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value),
      usdValue: value,
      pct: total > 0 ? (value / total) * 100 : 0,
      color: ASSET_CLASS_COLORS[name] || "#70706B",
    }));

    return { list, total };
  }, [clientHoldings]);

  // Compute Ideal Allocation (Target SAA)
  const idealAllocation = useMemo(() => {
    const mandateCode = clientPortfolios[0]?.mandate_code;
    const mandateRows = mandates.filter((m) => m.mandate_code === mandateCode);

    if (mandateRows.length > 0) {
      const list = mandateRows.map((m) => ({
        name: m.asset_class,
        value: m.target_pct,
        pct: m.target_pct,
        minPct: m.min_pct,
        maxPct: m.max_pct,
        color: ASSET_CLASS_COLORS[m.asset_class] || "#70706B",
      }));
      return { list, mandateName: clientPortfolios[0]?.mandate_name || "Strategic Asset Allocation" };
    }

    // Fallback to Risk Profile template
    const profile = client?.risk_profile || "Balanced Growth";
    const template = DEFAULT_SAA_BY_PROFILE[profile] || DEFAULT_SAA_BY_PROFILE["Balanced Growth"];
    const list = Object.entries(template).map(([name, pct]) => ({
      name,
      value: pct,
      pct,
      color: ASSET_CLASS_COLORS[name] || "#70706B",
    }));

    return { list, mandateName: `${profile} SAA Target` };
  }, [clientPortfolios, client]);

  // Compute Drift per Asset Class
  const driftList = useMemo(() => {
    const allNames = Array.from(
      new Set([
        ...currentAllocation.list.map((c) => c.name),
        ...idealAllocation.list.map((i) => i.name),
      ])
    );

    return allNames.map((name) => {
      const cur = currentAllocation.list.find((c) => c.name === name)?.pct || 0;
      const ideal = idealAllocation.list.find((i) => i.name === name)?.pct || 0;
      const drift = cur - ideal;
      const color = ASSET_CLASS_COLORS[name] || "#70706B";

      let status: "Overweight" | "Underweight" | "Balanced" = "Balanced";
      if (drift > 2.5) status = "Overweight";
      else if (drift < -2.5) status = "Underweight";

      return {
        name,
        currentPct: cur,
        idealPct: ideal,
        driftPct: drift,
        status,
        color,
      };
    }).sort((a, b) => Math.abs(b.driftPct) - Math.abs(a.driftPct));
  }, [currentAllocation, idealAllocation]);

  return (
    <div className={`bg-white rounded-sm border border-[#E5E5E1] shadow-xs ${compact ? "p-4" : "p-6"}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#F0F0EE]">
        <div>
          <div className="flex items-center space-x-1.5 text-[10px] font-semibold text-[#C5A059] uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Level Intuitive Asset Allocation</span>
          </div>
          <h3 className="text-base sm:text-lg font-light tracking-tight text-[#1A1A1A] mt-0.5">
            Current Holdings vs. Ideal SAA Target
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[#FAF7F0] border border-[#E9DFCB] text-[#8C6D23] font-medium">
            Mandate: {idealAllocation.mandateName}
          </span>
          {onTradeRebalance && (
            <button
              onClick={onTradeRebalance}
              className="px-2.5 py-1 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded-sm text-[10px] uppercase tracking-wider font-semibold transition-colors cursor-pointer flex items-center space-x-1 shadow-2xs"
            >
              <RefreshCw className="w-3 h-3 text-[#C5A059]" />
              <span>Simulate Rebalance</span>
            </button>
          )}
        </div>
      </div>

      {/* Paired Donut Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 items-center">
        {/* Chart 1: Current Allocation */}
        <div className="flex flex-col items-center">
          <div className="text-center mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A] block">
              1. Current Allocation
            </span>
            <span className="text-[11px] font-mono text-[#70706B]">
              Actual Portfolio: USD ${(currentAllocation.total / 1e6).toFixed(1)}M
            </span>
          </div>

          <div className="h-52 w-52 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentAllocation.list}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(entry) => setSelectedAsset(entry.name)}
                >
                  {currentAllocation.list.map((entry, index) => (
                    <Cell
                      key={`curr-${index}`}
                      fill={entry.color}
                      stroke={selectedAsset === entry.name ? "#1A1A1A" : "#FFFFFF"}
                      strokeWidth={selectedAsset === entry.name ? 2 : 1}
                      className="cursor-pointer transition-transform hover:opacity-90"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomDonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] uppercase font-mono text-[#70706B] tracking-wider">Current</span>
              <span className="text-sm font-semibold text-[#1A1A1A] leading-tight">
                ${(currentAllocation.total / 1e6).toFixed(1)}M
              </span>
            </div>
          </div>
        </div>

        {/* Chart 2: Ideal Allocation (Target SAA) */}
        <div className="flex flex-col items-center">
          <div className="text-center mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A059] block">
              2. Ideal (Target SAA)
            </span>
            <span className="text-[11px] font-mono text-[#70706B]">
              Mandate Benchmark: 100% Target Weight
            </span>
          </div>

          <div className="h-52 w-52 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={idealAllocation.list}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(entry) => setSelectedAsset(entry.name)}
                >
                  {idealAllocation.list.map((entry, index) => (
                    <Cell
                      key={`ideal-${index}`}
                      fill={entry.color}
                      stroke={selectedAsset === entry.name ? "#C5A059" : "#FFFFFF"}
                      strokeWidth={selectedAsset === entry.name ? 2 : 1}
                      className="cursor-pointer transition-transform hover:opacity-90"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomDonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] uppercase font-mono text-[#C5A059] tracking-wider">Target</span>
              <span className="text-xs font-semibold text-[#1A1A1A] leading-tight">
                {client?.risk_profile || "Standard"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Intuitive Visual Drift Cards / Chips */}
      <div className="mt-5 pt-4 border-t border-[#F0F0EE]">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-[#70706B]">
            Portfolio Allocation Drift Analysis
          </span>
          <span className="text-[10px] text-[#70706B]">
            Click any asset class to filter
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {driftList.map((item, idx) => {
            const isOver = item.status === "Overweight";
            const isUnder = item.status === "Underweight";
            const isSelected = selectedAsset === item.name;

            return (
              <div
                key={idx}
                onClick={() => setSelectedAsset(isSelected ? null : item.name)}
                className={`p-2.5 rounded-sm border cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#1A1A1A] bg-[#FAF9F5] shadow-xs"
                    : "border-[#E5E5E1] bg-[#FDFDFB] hover:border-[#D1D1CC]"
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-semibold text-[#1A1A1A] truncate">
                    {item.name}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs font-mono">
                  <span className="text-[#1A1A1A] font-medium">{item.currentPct.toFixed(1)}%</span>
                  <span className="text-[10px] text-[#70706B]">/ {item.idealPct.toFixed(0)}%</span>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px]">
                  {isOver ? (
                    <span className="text-[#B45309] font-semibold flex items-center space-x-0.5">
                      <TrendingUp className="w-3 h-3 text-[#D97706]" />
                      <span>+{item.driftPct.toFixed(1)}%</span>
                    </span>
                  ) : isUnder ? (
                    <span className="text-[#4B5563] font-semibold flex items-center space-x-0.5">
                      <TrendingDown className="w-3 h-3 text-[#6B7280]" />
                      <span>{item.driftPct.toFixed(1)}%</span>
                    </span>
                  ) : (
                    <span className="text-[#2D8A39] font-medium flex items-center space-x-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#2D8A39]" />
                      <span>Aligned</span>
                    </span>
                  )}

                  <span
                    className={`text-[9px] uppercase px-1 py-0.2 rounded-2xs font-semibold ${
                      isOver
                        ? "bg-[#FEF3C7] text-[#92400E]"
                        : isUnder
                        ? "bg-[#F3F4F6] text-[#374151]"
                        : "bg-[#DEF7EC] text-[#03543F]"
                    }`}
                  >
                    {item.status === "Balanced" ? "OK" : item.status === "Overweight" ? "OVER" : "UNDER"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
