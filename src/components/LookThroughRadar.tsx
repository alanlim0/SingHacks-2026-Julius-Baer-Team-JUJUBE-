import React, { useState, useMemo } from "react";
import {
  Layers,
  Search,
  ExternalLink,
  Info,
  PieChart as PieChartIcon,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  instruments,
  holdings,
  clientsById,
  TODAY_SNAPSHOT,
} from "../utils/intelligenceEngine";

interface LookThroughRadarProps {
  onSelectClient: (clientId: string) => void;
}

const ASSET_COLORS = ["#1A1A1A", "#C5A059", "#8C6D23", "#4B5563", "#2D8A39", "#0284C7"];
const UNDERLYING_COLORS = ["#1A1A1A", "#C5A059", "#B45309", "#475569", "#059669", "#6D28D9"];
const CONCENTRATION_COLORS = ["#1A1A1A", "#C5A059", "#B45309", "#4B5563", "#047857", "#7C3AED"];

// Custom Tooltip for Julius Baer styled Pie Charts
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white border border-[#E5E5E1] p-2.5 rounded-sm shadow-md text-xs">
        <p className="font-semibold text-[#1A1A1A]">{data.name}</p>
        <p className="font-mono text-[#70706B] mt-0.5">
          USD ${(data.value / 1e6).toFixed(2)}M
          {data.payload?.pct !== undefined ? ` (${data.payload.pct.toFixed(1)}%)` : ""}
        </p>
      </div>
    );
  }
  return null;
};

export const LookThroughRadar: React.FC<LookThroughRadarProps> = ({ onSelectClient }) => {
  // Tabs: "structured" | "concentration" (Credit & Lombard Heatmap removed)
  const [radarTab, setRadarTab] = useState<"structured" | "concentration">("structured");

  // Filter structured products with underlying references
  const structuredInstruments = useMemo(
    () =>
      instruments.filter(
        (i) => i.asset_class === "Structured Products" || Boolean(i.underlying_reference)
      ),
    []
  );

  // Group holdings of structured products across all clients
  const structuredHoldingsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        instrument: (typeof instruments)[0];
        totalHeldUsd: number;
        holders: { clientId: string; clientName: string; portfolioId: string; valueUsd: number; weightPct: number }[];
      }
    >();

    for (const inst of structuredInstruments) {
      const instHoldings = holdings.filter(
        (h) => h.instrument_id === inst.instrument_id && h.snapshot_date === TODAY_SNAPSHOT
      );
      const totalHeld = instHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);

      const holders = instHoldings.map((h) => {
        const client = clientsById.get(h.client_id);
        return {
          clientId: h.client_id,
          clientName: client?.client_name || h.client_id,
          portfolioId: h.portfolio_id,
          valueUsd: h.market_value_usd,
          weightPct: h.weight_pct,
        };
      });

      if (totalHeld > 0) {
        map.set(inst.instrument_id, {
          instrument: inst,
          totalHeldUsd: totalHeld,
          holders,
        });
      }
    }
    return map;
  }, [structuredInstruments]);

  // Desk Asset Class Allocation Pie Data across all client holdings at TODAY_SNAPSHOT
  const assetClassPieData = useMemo(() => {
    const map = new Map<string, number>();
    holdings
      .filter((h) => h.snapshot_date === TODAY_SNAPSHOT)
      .forEach((h) => {
        map.set(h.asset_class, (map.get(h.asset_class) || 0) + h.market_value_usd);
      });
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value),
      pct: total > 0 ? (value / total) * 100 : 0,
    }));
  }, []);

  // Structured Products Look-Through Underlying Pie Data
  const underlyingPieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const inst of structuredInstruments) {
      const instHoldings = holdings.filter(
        (h) => h.instrument_id === inst.instrument_id && h.snapshot_date === TODAY_SNAPSHOT
      );
      const val = instHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);
      if (val > 0) {
        const theme = inst.underlying_reference || "Custom Strategy";
        map.set(theme, (map.get(theme) || 0) + val);
      }
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
        pct: total > 0 ? (value / total) * 100 : 0,
      }));
  }, [structuredInstruments]);

  // Cross-portfolio concentration across all 20 clients
  const clientConcentrations = useMemo(() => {
    const list: {
      clientId: string;
      clientName: string;
      holdingName: string;
      totalUsd: number;
      shareOfAumPct: number;
      accountsCount: number;
    }[] = [];

    for (const [clientId, client] of clientsById.entries()) {
      const clientHoldings = holdings.filter(
        (h) => h.client_id === clientId && h.snapshot_date === TODAY_SNAPSHOT
      );
      const totalAum = client.total_aum_usd;

      const mapByName = new Map<string, { totalUsd: number; accounts: Set<string> }>();
      for (const h of clientHoldings) {
        const inst = instruments.find((i) => i.instrument_id === h.instrument_id);
        const nameKey = h.instrument_name;
        const cur = mapByName.get(nameKey) || { totalUsd: 0, accounts: new Set<string>() };
        cur.totalUsd += h.market_value_usd;
        cur.accounts.add(h.portfolio_id);
        mapByName.set(nameKey, cur);

        if (inst?.underlying_reference) {
          const underlyingKey = `[Underlying] ${inst.underlying_reference}`;
          const uCur = mapByName.get(underlyingKey) || { totalUsd: 0, accounts: new Set<string>() };
          uCur.totalUsd += h.market_value_usd;
          uCur.accounts.add(h.portfolio_id);
          mapByName.set(underlyingKey, uCur);
        }
      }

      for (const [nameKey, val] of mapByName.entries()) {
        const pct = totalAum > 0 ? (val.totalUsd / totalAum) * 100 : 0;
        if (pct > 12.0) {
          list.push({
            clientId,
            clientName: client.client_name,
            holdingName: nameKey,
            totalUsd: val.totalUsd,
            shareOfAumPct: pct,
            accountsCount: val.accounts.size,
          });
        }
      }
    }

    list.sort((a, b) => b.shareOfAumPct - a.shareOfAumPct);
    return list;
  }, []);

  // Top Single-Name Holdings Pie Data across Cross-Account Concentration
  const topHoldingsPieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of clientConcentrations) {
      // Clean display name
      const cleanName = c.holdingName.replace("[Underlying] ", "");
      map.set(cleanName, (map.get(cleanName) || 0) + c.totalUsd);
    }
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const otherVal = sorted.slice(5).reduce((sum, [, v]) => sum + v, 0);
    const total = sorted.reduce((sum, [, v]) => sum + v, 0);

    const result = top5.map(([name, value]) => ({
      name,
      value: Math.round(value),
      pct: total > 0 ? (value / total) * 100 : 0,
    }));
    if (otherVal > 0) {
      result.push({
        name: "Other Concentrations",
        value: Math.round(otherVal),
        pct: total > 0 ? (otherVal / total) * 100 : 0,
      });
    }
    return result;
  }, [clientConcentrations]);

  // Concentration Severity Pie Data
  const severityPieData = useMemo(() => {
    let severeCount = 0;
    let severeVal = 0;
    let elevatedCount = 0;
    let elevatedVal = 0;
    for (const c of clientConcentrations) {
      if (c.shareOfAumPct > 20) {
        severeCount++;
        severeVal += c.totalUsd;
      } else {
        elevatedCount++;
        elevatedVal += c.totalUsd;
      }
    }
    const totalVal = severeVal + elevatedVal;
    return [
      {
        name: `Severe Risk (>20% AUM: ${severeCount})`,
        value: severeVal,
        pct: totalVal > 0 ? (severeVal / totalVal) * 100 : 0,
        color: "#B91C1C",
      },
      {
        name: `Elevated Risk (12-20% AUM: ${elevatedCount})`,
        value: elevatedVal,
        pct: totalVal > 0 ? (elevatedVal / totalVal) * 100 : 0,
        color: "#C5A059",
      },
    ];
  }, [clientConcentrations]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-sm border border-[#E5E5E1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-semibold text-[#C5A059] uppercase tracking-widest mb-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Desk Risk Radar &amp; Multi-Portfolio Look-Through</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1A1A1A]">
            Uncover risks invisible in isolated portfolio silos
          </h2>
          <p className="text-xs text-[#70706B] mt-1.5 max-w-3xl leading-relaxed">
            Look through structured notes to true economic underlyings, monitor aggregate single-name
            concentration with interactive pie charts, and resolve cross-account imbalances across the desk.
          </p>
        </div>

        {/* Simplified Tab Controls (Credit & Lombard Heatmap removed) */}
        <div className="flex bg-[#F4F4F1] p-1 rounded-sm border border-[#E5E5E1] text-xs font-medium self-start md:self-auto shrink-0">
          <button
            onClick={() => setRadarTab("structured")}
            className={`px-3.5 py-1.5 rounded-sm transition-colors cursor-pointer text-xs uppercase tracking-wider ${
              radarTab === "structured"
                ? "bg-white text-[#1A1A1A] shadow-xs font-semibold"
                : "text-[#70706B] hover:text-[#1A1A1A]"
            }`}
          >
            Structured Look-Through
          </button>
          <button
            onClick={() => setRadarTab("concentration")}
            className={`px-3.5 py-1.5 rounded-sm transition-colors cursor-pointer text-xs uppercase tracking-wider ${
              radarTab === "concentration"
                ? "bg-white text-[#1A1A1A] shadow-xs font-semibold"
                : "text-[#70706B] hover:text-[#1A1A1A]"
            }`}
          >
            Cross-Account Concentration
          </button>
        </div>
      </div>

      {/* VIEW 1: Structured Products Look-Through with Simplified Pie Charts */}
      {radarTab === "structured" && (
        <div className="space-y-6">
          {/* Executive Pie Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart 1: Desk Asset Allocation */}
            <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                  <div className="flex items-center space-x-2">
                    <PieChartIcon className="w-4 h-4 text-[#C5A059]" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A]">
                      Desk Asset Allocation Breakdown
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#70706B] bg-[#F4F4F1] px-2 py-0.5 rounded-2xs">
                    USD 268.4M Total Book
                  </span>
                </div>
                <p className="text-xs text-[#70706B] mt-2">
                  Distribution across all 20 managed accounts, highlighting structured product exposure.
                </p>
              </div>

              <div className="h-60 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetClassPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {assetClassPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="text-[11px] font-medium text-[#1A1A1A]">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart 2: True Economic Underlying Exposure */}
            <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-[#C5A059]" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A]">
                      Look-Through Underlying Exposure
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#8C6D23] bg-[#FAF7F0] border border-[#E9DFCB] px-2 py-0.5 rounded-2xs font-semibold">
                    USD 42.1M Structured Notes
                  </span>
                </div>
                <p className="text-xs text-[#70706B] mt-2">
                  True economic risk exposure uncovered from multi-asset structured notes and derivative products.
                </p>
              </div>

              <div className="h-60 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={underlyingPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {underlyingPieData.map((_, index) => (
                        <Cell key={`underlying-cell-${index}`} fill={UNDERLYING_COLORS[index % UNDERLYING_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="text-[11px] font-medium text-[#1A1A1A]">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Instrument Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from(structuredHoldingsMap.values()).map(({ instrument, totalHeldUsd, holders }) => (
              <div
                key={instrument.instrument_id}
                className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-[#70706B] block">{instrument.instrument_id}</span>
                    <h3 className="text-sm font-semibold text-[#1A1A1A] leading-snug">{instrument.instrument_name}</h3>
                  </div>
                  <span className="font-mono font-semibold text-xs bg-[#FDFDFB] text-[#1A1A1A] border border-[#E5E5E1] px-2.5 py-1 rounded-sm shadow-2xs shrink-0">
                    Total: USD ${(totalHeldUsd / 1e6).toFixed(2)}M
                  </span>
                </div>

                {/* Underlying Exposure Breakdown */}
                <div className="p-3.5 bg-[#FAF7F0] border border-[#E9DFCB] rounded-sm text-xs space-y-1">
                  <div className="font-semibold text-[#8C6D23] flex items-center text-[10px] uppercase tracking-widest">
                    <Info className="w-3.5 h-3.5 mr-1 text-[#C5A059]" />
                    <span>True Economic Exposure (Look-Through):</span>
                  </div>
                  <p className="text-[#1A1A1A] font-medium pl-4.5 leading-relaxed">
                    {instrument.underlying_reference || "Direct reference asset"}
                  </p>
                </div>

                {/* Clients Holding This Instrument */}
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-[#70706B] block mb-2">
                    Held by {holders.length} Client Account{holders.length > 1 ? "s" : ""}:
                  </span>
                  <div className="space-y-1.5">
                    {holders.map((h, idx) => (
                      <div
                        key={idx}
                        onClick={() => onSelectClient(h.clientId)}
                        className="flex items-center justify-between text-xs p-2.5 rounded-sm bg-[#FDFDFB] hover:bg-[#FAF9F5] cursor-pointer border border-[#E5E5E1] transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-[#1A1A1A] hover:text-[#C5A059]">{h.clientName}</span>
                          <span className="text-[10px] font-mono text-[#70706B]">({h.portfolioId})</span>
                        </div>
                        <div className="font-mono text-[#70706B] text-[11px]">
                          ${(h.valueUsd / 1e3).toFixed(0)}k ({h.weightPct.toFixed(1)}% of PF)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: Cross-Portfolio Single-Name Concentration with Pie Charts */}
      {radarTab === "concentration" && (
        <div className="space-y-6">
          {/* Concentration Pie Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart 1: Top Single-Issuer Concentrations */}
            <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                  <div className="flex items-center space-x-2">
                    <PieChartIcon className="w-4 h-4 text-[#C5A059]" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A]">
                      Top Single-Issuer Concentrations Desk-Wide
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] px-2 py-0.5 rounded-2xs font-semibold">
                    {clientConcentrations.length} Elevated Positions
                  </span>
                </div>
                <p className="text-xs text-[#70706B] mt-2">
                  Share of aggregate concentrated capital across client portfolios (&gt;12% of client wealth).
                </p>
              </div>

              <div className="h-60 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topHoldingsPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {topHoldingsPieData.map((_, index) => (
                        <Cell
                          key={`concentration-cell-${index}`}
                          fill={CONCENTRATION_COLORS[index % CONCENTRATION_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="text-[11px] font-medium text-[#1A1A1A]">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart 2: Severity Distribution */}
            <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-[#B91C1C]" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A]">
                      Concentration Risk Severity Split
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#70706B] bg-[#F4F4F1] px-2 py-0.5 rounded-2xs">
                    Threshold: &gt;12% AUM
                  </span>
                </div>
                <p className="text-xs text-[#70706B] mt-2">
                  Capital volume categorized by severe single-stock exposure versus moderate advisory drift.
                </p>
              </div>

              <div className="h-60 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {severityPieData.map((entry, index) => (
                        <Cell key={`severity-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: string) => (
                        <span className="text-[11px] font-medium text-[#1A1A1A]">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Elevated Positions Table with 1-Click CTA */}
          <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
                  Cross-Account Single-Position Concentration Records
                </h3>
                <p className="text-xs text-[#70706B] mt-0.5">
                  Identifies aggregated exposures that exceed safe diversification limits across combined accounts.
                </p>
              </div>
              <span className="text-xs font-mono text-[#1A1A1A] bg-[#FDFDFB] border border-[#E5E5E1] px-3 py-1 rounded-sm shadow-2xs self-start sm:self-auto">
                {clientConcentrations.length} Elevated Exposures
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F5] text-[#70706B] border-b border-[#E5E5E1] text-[10px] uppercase tracking-wider">
                    <th className="p-2.5 font-semibold">Client</th>
                    <th className="p-2.5 font-semibold">Instrument / Underlying Reference</th>
                    <th className="p-2.5 font-semibold text-right">Total Exposure (USD)</th>
                    <th className="p-2.5 font-semibold text-right">Share of Total Wealth</th>
                    <th className="p-2.5 font-semibold text-center">Accounts Spread</th>
                    <th className="p-2.5 font-semibold">Risk Assessment</th>
                    <th className="p-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EE]">
                  {clientConcentrations.map((item, idx) => {
                    const isSevere = item.shareOfAumPct > 20;
                    return (
                      <tr key={idx} className={`hover:bg-[#FAF9F5] ${isSevere ? "bg-[#FEF2F2]/30" : ""}`}>
                        <td className="p-2.5">
                          <div className="font-semibold text-[#1A1A1A]">{item.clientName}</div>
                          <div className="text-[10px] font-mono text-[#70706B]">{item.clientId}</div>
                        </td>
                        <td className="p-2.5">
                          <span className="font-medium text-[#1A1A1A]">{item.holdingName}</span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-[#1A1A1A]">
                          USD ${(item.totalUsd / 1e6).toFixed(2)}M
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          <span className={`font-semibold ${isSevere ? "text-[#B91C1C]" : "text-[#8C6D23]"}`}>
                            {item.shareOfAumPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-mono text-[#70706B]">
                          {item.accountsCount} portfolio{item.accountsCount > 1 ? "s" : ""}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wider ${
                              isSevere
                                ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                                : "bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]"
                            }`}
                          >
                            {isSevere ? "Excessive Concentration" : "Elevated Weight"}
                          </span>
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => onSelectClient(item.clientId)}
                            className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded-sm text-[10px] uppercase tracking-wider font-semibold transition-colors cursor-pointer inline-flex items-center space-x-1 shadow-2xs"
                          >
                            <span>Inspect Client</span>
                            <ArrowUpRight className="w-3 h-3 text-[#C5A059]" />
                          </button>
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
    </div>
  );
};
