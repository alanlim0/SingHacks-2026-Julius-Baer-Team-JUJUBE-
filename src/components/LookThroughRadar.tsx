import React, { useState } from "react";
import {
  AlertTriangle,
  Layers,
  CreditCard,
  Search,
  ExternalLink,
  Info,
  Droplets,
} from "lucide-react";
import {
  instruments,
  holdings,
  clientsById,
  creditFacilities,
  commitments,
  plannedCashNeeds,
  TODAY_SNAPSHOT,
} from "../utils/intelligenceEngine";

interface LookThroughRadarProps {
  onSelectClient: (clientId: string) => void;
}

export const LookThroughRadar: React.FC<LookThroughRadarProps> = ({ onSelectClient }) => {
  const [radarTab, setRadarTab] = useState<string>("structured");

  // Filter structured products with underlying references
  const structuredInstruments = instruments.filter(
    (i) => i.asset_class === "Structured Products" || Boolean(i.underlying_reference)
  );

  // Group holdings of structured products across all clients
  const structuredHoldingsMap = new Map<
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
      structuredHoldingsMap.set(inst.instrument_id, {
        instrument: inst,
        totalHeldUsd: totalHeld,
        holders,
      });
    }
  }

  // Cross-portfolio concentration across all 20 clients
  // Group by client and underlying issuer/name
  const clientConcentrations: {
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
      // If structured, also consider underlying reference
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
        clientConcentrations.push({
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

  // Sort descending by share of AUM
  clientConcentrations.sort((a, b) => b.shareOfAumPct - a.shareOfAumPct);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-sm border border-[#E5E5E1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-semibold text-[#C5A059] uppercase tracking-widest mb-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Hidden Risk &amp; Multi-Portfolio Look-Through Radar</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1A1A1A]">
            Uncover risks invisible in isolated portfolio silos
          </h2>
          <p className="text-xs text-[#70706B] mt-1.5 max-w-3xl leading-relaxed">
            Look through structured notes to true economic underlyings, aggregate single-name concentration
            across Discretionary, Advisory, and Custody accounts, and monitor systemic collateral leverage across the desk.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-[#F4F4F1] p-1 rounded-sm border border-[#E5E5E1] text-xs font-medium self-start md:self-auto shrink-0">
          <button
            onClick={() => setRadarTab("structured")}
            className={`px-3.5 py-1.5 rounded-sm transition-colors cursor-pointer text-xs uppercase tracking-wider ${
              radarTab === "structured" ? "bg-white text-[#1A1A1A] shadow-xs font-semibold" : "text-[#70706B] hover:text-[#1A1A1A]"
            }`}
          >
            Structured Look-Through
          </button>
          <button
            onClick={() => setRadarTab("concentration")}
            className={`px-3.5 py-1.5 rounded-sm transition-colors cursor-pointer text-xs uppercase tracking-wider ${
              radarTab === "concentration" ? "bg-white text-[#1A1A1A] shadow-xs font-semibold" : "text-[#70706B] hover:text-[#1A1A1A]"
            }`}
          >
            Cross-Account Concentration
          </button>
          <button
            onClick={() => setRadarTab("collateral")}
            className={`px-3.5 py-1.5 rounded-sm transition-colors cursor-pointer text-xs uppercase tracking-wider ${
              radarTab === "collateral" ? "bg-white text-[#1A1A1A] shadow-xs font-semibold" : "text-[#70706B] hover:text-[#1A1A1A]"
            }`}
          >
            Credit &amp; Lombard Heatmap
          </button>
        </div>
      </div>

      {/* VIEW 1: Structured Products Look-Through */}
      {radarTab === "structured" && (
        <div className="space-y-4">
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

      {/* VIEW 2: Cross-Portfolio Single-Name Concentration Radar */}
      {radarTab === "concentration" && (
        <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
                Cross-Account Single-Position Concentration Radar (&gt;12% Total Wealth)
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
                          className="px-2.5 py-1 bg-[#FDFDFB] hover:bg-[#F4F4F1] text-[#1A1A1A] border border-[#E5E5E1] rounded-sm text-[10px] uppercase tracking-wider font-semibold transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Credit & Lombard Heatmap */}
      {radarTab === "collateral" && (
        <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
              Desk-Wide Lombard &amp; Credit Facilities Risk Matrix
            </h3>
            <p className="text-xs text-[#70706B] mt-0.5">
              LTV progression across the 5 snapshots and distance to formal margin call liquidation.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] text-[#70706B] border-b border-[#E5E5E1] text-[10px] uppercase tracking-wider">
                  <th className="p-2.5 font-semibold">Borrower</th>
                  <th className="p-2.5 font-semibold">Facility Type</th>
                  <th className="p-2.5 font-semibold text-right">Credit Limit</th>
                  <th className="p-2.5 font-semibold text-right">Drawn Today</th>
                  <th className="p-2.5 font-semibold text-right">Dec 2025</th>
                  <th className="p-2.5 font-semibold text-right">Feb 2026</th>
                  <th className="p-2.5 font-semibold text-right">Mar 2026</th>
                  <th className="p-2.5 font-semibold text-right">Jun 2026</th>
                  <th className="p-2.5 font-semibold text-right">Aug 2026 (Today)</th>
                  <th className="p-2.5 font-semibold text-right">Margin Call LTV</th>
                  <th className="p-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0EE]">
                {creditFacilities.map((fac) => {
                  const client = clientsById.get(fac.client_id);
                  const currentLtv = fac["ltv_pct_2026-08-26"];
                  const threshold = fac.margin_call_ltv_pct;
                  const isWarning = threshold - currentLtv <= 5.0;
                  const isCritical = threshold - currentLtv <= 2.0;

                  return (
                    <tr
                      key={fac.facility_id}
                      className={`hover:bg-[#FAF9F5] ${isCritical ? "bg-[#FEF2F2]/30" : isWarning ? "bg-[#FAF7F0]/30" : ""}`}
                    >
                      <td className="p-2.5">
                        <div
                          onClick={() => onSelectClient(fac.client_id)}
                          className="font-semibold text-[#1A1A1A] hover:text-[#C5A059] cursor-pointer"
                        >
                          {client?.client_name || fac.client_id}
                        </div>
                        <div className="text-[10px] font-mono text-[#70706B]">{fac.client_id}</div>
                      </td>
                      <td className="p-2.5 text-[#1A1A1A] font-medium">{fac.facility_type}</td>
                      <td className="p-2.5 text-right font-mono font-semibold text-[#1A1A1A]">
                        USD ${(fac.credit_limit / 1e6).toFixed(1)}M
                      </td>
                      <td className="p-2.5 text-right font-mono text-[#B91C1C] font-semibold">
                        USD ${(fac["drawn_2026-08-26"] / 1e6).toFixed(2)}M
                      </td>
                      <td className="p-2.5 text-right font-mono text-[#70706B]">{fac["ltv_pct_2025-12-31"].toFixed(1)}%</td>
                      <td className="p-2.5 text-right font-mono text-[#70706B]">{fac["ltv_pct_2026-02-27"].toFixed(1)}%</td>
                      <td className="p-2.5 text-right font-mono text-[#70706B]">{fac["ltv_pct_2026-03-31"].toFixed(1)}%</td>
                      <td className="p-2.5 text-right font-mono">
                        <span className={fac["ltv_pct_2026-06-30"] >= threshold ? "text-[#B91C1C] font-semibold" : "text-[#70706B]"}>
                          {fac["ltv_pct_2026-06-30"].toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold">
                        <span className={isCritical ? "text-[#B91C1C]" : isWarning ? "text-[#8C6D23]" : "text-[#2D8A39]"}>
                          {currentLtv.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-[#1A1A1A]">{threshold.toFixed(1)}%</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold uppercase tracking-wider ${
                            isCritical
                              ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                              : isWarning
                              ? "bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]"
                              : "bg-[#E6F4EA] text-[#2D8A39]"
                          }`}
                        >
                          {isCritical ? "CRITICAL HEADROOM" : isWarning ? "HEADROOM ALERT" : "HEALTHY"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
