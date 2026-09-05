import React, { useState, useMemo } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Globe,
  Flame,
  Shield,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  Calendar,
  MessageSquare,
  Zap,
} from "lucide-react";
import {
  getIntelligentPortfolioExplanations,
  clientsById,
} from "../utils/intelligenceEngine";

interface IntelligentPortfolioExplanationsProps {
  selectedClientId: string;
}

export const IntelligentPortfolioExplanations: React.FC<
  IntelligentPortfolioExplanationsProps
> = ({ selectedClientId }) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);

  const explanations = useMemo(
    () => getIntelligentPortfolioExplanations(selectedClientId),
    [selectedClientId]
  );
  const client = clientsById.get(selectedClientId);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(explanations.clientReadyMeetingScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-sm border border-[#E5E5E1] p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F0F0EE]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-[#1A1A1A] text-[#C5A059] uppercase tracking-wider">
                Requirement 1
              </span>
              <span className="text-[11px] font-semibold text-[#70706B] uppercase tracking-widest">
                Intelligent Portfolio Monitoring
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#1A1A1A] mt-1">
              What {client?.client_name}&apos;s Portfolio Did &amp; Why
            </h2>
            <p className="text-xs text-[#70706B] mt-0.5">
              Connecting real-world 2026 market and geopolitical events directly to the specific holdings that moved.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="px-4 py-2 bg-[#FAF7F0] border border-[#E9DFCB] rounded-sm text-right">
              <span className="text-[10px] text-[#70706B] uppercase block">2026 YTD Return</span>
              <div className="flex items-center justify-end space-x-1 font-mono font-bold text-base">
                {explanations.ytdReturnPct >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-[#166534]" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-[#991B1B]" />
                )}
                <span
                  className={
                    explanations.ytdReturnPct >= 0 ? "text-[#166534]" : "text-[#991B1B]"
                  }
                >
                  {explanations.ytdReturnPct >= 0 ? "+" : ""}
                  {explanations.ytdReturnPct.toFixed(1)}%
                </span>
                <span className="text-xs font-normal text-[#70706B]">
                  (${Math.abs(explanations.ytdReturnUsd / 1e6).toFixed(1)}M USD)
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyScript}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#1A1A1A] text-white text-xs font-semibold rounded-sm hover:bg-[#C5A059] transition-all cursor-pointer shadow-xs"
            >
              {copiedScript ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#BBF7D0]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Client Script</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Plain-English Executive Summary */}
        <div className="mt-4 p-4 rounded-sm bg-[#FAF7F0] border border-[#E9DFCB] flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-[#C5A059] mt-0.5 shrink-0" />
          <div className="text-xs text-[#1A1A1A] leading-relaxed">
            <strong className="font-semibold text-[#8C6D23] uppercase tracking-wider block text-[10px] mb-0.5">
              Executive AI Observation
            </strong>
            {explanations.executiveSummary}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: AI-Powered Observations Linking Real Events to Holdings       */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
            Event-Driven Portfolio Observations ({explanations.observations.length})
          </h3>
          <span className="text-xs text-[#70706B]">
            Meaningful observations rather than dense, complex charts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {explanations.observations.map((obs) => {
            const isSelected = selectedObservationId === obs.id;

            return (
              <div
                key={obs.id}
                onClick={() => setSelectedObservationId(isSelected ? null : obs.id)}
                className={`bg-white rounded-sm border p-5 transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#C5A059] shadow-xs ring-1 ring-[#C5A059]/20"
                    : "border-[#E5E5E1] hover:border-[#C5A059]/60"
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#F0F0EE]">
                  <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]">
                    {obs.category}
                  </span>
                  <span className="text-[10px] font-medium text-[#70706B]">
                    {obs.affectedHoldings.length} holdings moved
                  </span>
                </div>

                <h4 className="text-sm font-bold text-[#1A1A1A] mt-2.5">{obs.headline}</h4>
                <p className="text-xs text-[#1A1A1A] mt-1.5 leading-relaxed">{obs.narrative}</p>

                {/* Client-friendly takeaway */}
                <div className="mt-3 p-2.5 rounded-sm bg-[#FDFDFB] border border-[#F0F0EE] text-[11px] text-[#70706B]">
                  <strong className="font-semibold text-[#1A1A1A]">Client takeaway:</strong>{" "}
                  {obs.clientFriendlySummary}
                </div>

                {/* Connected Holdings */}
                <div className="mt-3 pt-2.5 border-t border-[#F0F0EE] space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-[#70706B] block">
                    Individual Holdings Moving on this Event:
                  </span>
                  {obs.affectedHoldings.map((h) => (
                    <div
                      key={h.instrumentName}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-xs bg-[#FAF7F0]/50"
                    >
                      <div className="truncate max-w-[240px]">
                        <span className="font-semibold text-[#1A1A1A]">{h.instrumentName}</span>
                        <span className="text-[10px] text-[#70706B] ml-1.5">({h.sector})</span>
                      </div>
                      <div className="flex items-center space-x-2 font-mono text-[11px]">
                        <span
                          className={h.pnlUsd >= 0 ? "text-[#166534] font-bold" : "text-[#991B1B] font-bold"}
                        >
                          {h.pnlUsd >= 0 ? "+" : ""}${(h.pnlUsd / 1e6).toFixed(2)}M
                        </span>
                        <span className="text-[10px] text-[#70706B]">
                          ({h.pnlPct >= 0 ? "+" : ""}
                          {h.pnlPct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: Attribution a Client Would Actually Understand                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-sm border border-[#E5E5E1] p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
            Performance Attribution A Client Can Actually Understand
          </h3>
          <p className="text-xs text-[#70706B] mt-0.5">
            Clear, transparent narrative drivers explaining why each asset class contributed or detracted, without financial jargon.
          </p>
        </div>

        <div className="divide-y divide-[#F0F0EE]">
          {explanations.clientAttribution.map((attr) => {
            const isPositive = attr.contributionPct >= 0;

            return (
              <div key={attr.assetClass} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-0.5 max-w-md">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-[#1A1A1A]">{attr.assetClass}</span>
                    <span className="text-xs text-[#70706B]">
                      (e.g., {attr.primaryHoldings.join(", ")})
                    </span>
                  </div>
                  <p className="text-xs text-[#70706B] leading-relaxed">
                    {attr.plainEnglishDriver}
                  </p>
                </div>

                <div className="flex items-center space-x-6 text-right shrink-0 font-mono">
                  <div>
                    <span className="text-[10px] text-[#70706B] block uppercase">P&amp;L Contribution</span>
                    <span
                      className={`text-sm font-bold ${
                        isPositive ? "text-[#166534]" : "text-[#991B1B]"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {attr.contributionPct.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#70706B] block uppercase">Dollar Impact</span>
                    <span
                      className={`text-sm font-bold ${
                        isPositive ? "text-[#166534]" : "text-[#991B1B]"
                      }`}
                    >
                      {isPositive ? "+" : ""}${(attr.contributionUsd / 1e6).toFixed(2)}M
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: Top Moving Holdings Tied Directly to Real Events               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-sm border border-[#E5E5E1] p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
            Top Moving Holdings Linked to Real Geopolitical Events
          </h3>
          <p className="text-xs text-[#70706B] mt-0.5">
            Direct holding-level transparency mapping 2026 events to the balance sheet.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#FAF7F0] border-b border-[#E5E5E1]">
              <tr className="text-[10px] uppercase font-bold text-[#70706B] tracking-wider">
                <th className="py-2.5 px-3">Instrument &amp; Sector</th>
                <th className="py-2.5 px-3">2026 Event Linked</th>
                <th className="py-2.5 px-3">Why It Moved (Plain English)</th>
                <th className="py-2.5 px-3 text-right">Unrealised P&amp;L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EE]">
              {explanations.topMovingHoldings.map((h) => {
                const isPositive = h.unrealisedPnlUsd >= 0;

                return (
                  <tr key={h.instrument_name} className="hover:bg-[#FDFDFB]">
                    <td className="py-3 px-3">
                      <span className="font-semibold text-[#1A1A1A] block">{h.instrument_name}</span>
                      <span className="text-[10px] text-[#70706B]">
                        {h.asset_class} • {h.sector}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-[#1A1A1A]">
                      <span className="px-2 py-0.5 rounded-xs bg-[#FAF7F0] border border-[#E9DFCB] text-[10px] font-medium text-[#8C6D23] inline-block">
                        {h.macroEventLinked}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-[#70706B] leading-relaxed">
                      {h.plainReason}
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <span
                        className={`font-bold block ${
                          isPositive ? "text-[#166534]" : "text-[#991B1B]"
                        }`}
                      >
                        {isPositive ? "+" : ""}${(h.unrealisedPnlUsd / 1e6).toFixed(2)}M
                      </span>
                      <span className="text-[10px] text-[#70706B]">
                        {isPositive ? "+" : ""}
                        {h.unrealisedPnlPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
