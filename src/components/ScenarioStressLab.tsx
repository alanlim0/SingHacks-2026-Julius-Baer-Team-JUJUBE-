import React, { useState } from "react";
import {
  AlertTriangle,
  Play,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Info,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import {
  PREDEFINED_SCENARIOS,
  runStressTest,
  clients,
  creditFacilitiesByClientId,
} from "../utils/intelligenceEngine";

interface ScenarioStressLabProps {
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
}

export const ScenarioStressLab: React.FC<ScenarioStressLabProps> = ({
  selectedClientId,
  onSelectClient,
}) => {
  const [activeScenarioId, setActiveScenarioId] = useState<string>(PREDEFINED_SCENARIOS[0].id);
  const [customMode, setCustomMode] = useState<boolean>(false);
  const [customShocks, setCustomShocks] = useState({
    energy: 10,
    technology: -5,
    equities: -2,
    commodities: 5,
    gold: 5,
  });

  const selectedClient = clients.find((c) => c.client_id === selectedClientId) || clients[0];
  const clientFacility = creditFacilitiesByClientId.get(selectedClient.client_id)?.[0];

  const result = runStressTest(selectedClient.client_id, activeScenarioId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-sm border border-[#E5E5E1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-semibold text-[#C5A059] uppercase tracking-widest mb-1.5">
            <Sliders className="w-3.5 h-3.5" />
            <span>Macroeconomic Stress Testing &amp; Scenario Simulator</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1A1A1A]">
            Simulate forward-looking market shifts before the client meeting
          </h2>
          <p className="text-xs text-[#70706B] mt-1.5 max-w-3xl leading-relaxed">
            Model the impact of geopolitical outcomes, oil price shocks, and interest rate pivots on client portfolio value
            and Lombard collateral margin triggers.
          </p>
        </div>

        {/* Client Selector */}
        <div className="flex items-center space-x-2 bg-[#FDFDFB] p-2.5 rounded-sm border border-[#E5E5E1] self-start md:self-auto shadow-2xs">
          <span className="text-[10px] uppercase tracking-widest text-[#70706B] font-semibold">Testing Client:</span>
          <select
            aria-label="Select Testing Client"
            value={selectedClientId}
            onChange={(e) => onSelectClient(e.target.value)}
            className="text-xs font-semibold text-[#1A1A1A] bg-transparent focus:outline-none cursor-pointer"
          >
            {clients.map((c) => (
              <option key={c.client_id} value={c.client_id}>
                {c.client_id} — {c.client_name} (${(c.total_aum_usd / 1e6).toFixed(1)}M)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Scenario Presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PREDEFINED_SCENARIOS.map((sc) => {
          const isSelected = activeScenarioId === sc.id && !customMode;
          return (
            <div
              key={sc.id}
              onClick={() => {
                setActiveScenarioId(sc.id);
                setCustomMode(false);
              }}
              className={`p-5 rounded-sm border transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm ring-1 ring-[#C5A059]"
                  : "bg-white text-[#1A1A1A] border-[#E5E5E1] hover:border-[#D1D1CC] shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span
                  className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                    isSelected ? "bg-[#2A2A2A] text-[#C5A059]" : "bg-[#F4F4F1] text-[#70706B] border border-[#E5E5E1]"
                  }`}
                >
                  Preset Scenario
                </span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-[#C5A059]" />}
              </div>
              <h3 className="text-sm font-semibold mb-1.5">{sc.name}</h3>
              <p className={`text-xs leading-relaxed ${isSelected ? "text-[#CCCCCC]" : "text-[#70706B]"}`}>
                {sc.description}
              </p>

              <div className={`mt-3.5 pt-2.5 border-t grid grid-cols-3 gap-2 text-[11px] ${isSelected ? "border-[#333333]" : "border-[#F0F0EE]"}`}>
                <div>
                  <span className={isSelected ? "text-[#999999]" : "text-[#70706B]"}>Energy:</span>{" "}
                  <strong className={sc.shocks.energy > 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"}>
                    {sc.shocks.energy > 0 ? "+" : ""}{sc.shocks.energy * 100}%
                  </strong>
                </div>
                <div>
                  <span className={isSelected ? "text-[#999999]" : "text-[#70706B]"}>Tech:</span>{" "}
                  <strong className={sc.shocks.technology > 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"}>
                    {sc.shocks.technology > 0 ? "+" : ""}{sc.shocks.technology * 100}%
                  </strong>
                </div>
                <div>
                  <span className={isSelected ? "text-[#999999]" : "text-[#70706B]"}>Gold:</span>{" "}
                  <strong className={sc.shocks.gold > 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"}>
                    {sc.shocks.gold > 0 ? "+" : ""}{sc.shocks.gold * 100}%
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stress Results Display */}
      <div className="bg-white p-6 sm:p-8 rounded-sm border border-[#E5E5E1] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0F0EE] pb-5">
          <div>
            <span className="text-[10px] font-semibold text-[#70706B] uppercase tracking-widest block">
              Simulation Outcome for {selectedClient.client_name}
            </span>
            <h3 className="text-xl font-light tracking-tight text-[#1A1A1A] mt-1">
              Scenario: {result.scenarioName}
            </h3>
          </div>

          <div className="flex items-center space-x-5">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-widest text-[#70706B] block">Current Portfolio AUM</span>
              <span className="text-sm font-semibold font-mono text-[#1A1A1A]">
                USD ${(selectedClient.total_aum_usd / 1e6).toFixed(2)}M
              </span>
            </div>
            <div className="text-right pl-5 border-l border-[#F0F0EE]">
              <span className="text-[10px] uppercase tracking-widest text-[#70706B] block">Simulated Impact</span>
              <span
                className={`text-base font-light font-mono flex items-center justify-end ${
                  result.estimatedAumImpactUsd >= 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"
                }`}
              >
                {result.estimatedAumImpactUsd >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />
                )}
                {result.estimatedAumImpactUsd >= 0 ? "+" : ""}${(result.estimatedAumImpactUsd / 1e6).toFixed(2)}M (
                {result.estimatedAumImpactPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Collateral & Lombard Impact Warning (if borrower) */}
        {result.facilityLtvImpact && (
          <div
            className={`p-4 rounded-sm border flex items-start space-x-3.5 text-xs ${
              result.facilityLtvImpact.marginCallTriggered
                ? "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
                : "bg-[#FAF7F0] border-[#E9DFCB] text-[#8C6D23]"
            }`}
          >
            <ShieldAlert
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                result.facilityLtvImpact.marginCallTriggered ? "text-[#DC2626]" : "text-[#C5A059]"
              }`}
            />
            <div className="space-y-1 leading-relaxed">
              <div className="font-semibold text-sm">
                {result.facilityLtvImpact.marginCallTriggered
                  ? "🚨 CRITICAL: Scenario Triggers Immediate Margin Call Liquidation!"
                  : "Collateral Sensitivity Warning"}
              </div>
              <p>
                Under this scenario, {selectedClient.client_name}'s Lombard facility LTV moves from{" "}
                <strong>{result.facilityLtvImpact.beforeLtv.toFixed(1)}%</strong> to{" "}
                <strong className={result.facilityLtvImpact.marginCallTriggered ? "text-[#B91C1C]" : "text-[#8C6D23]"}>
                  {result.facilityLtvImpact.afterLtv.toFixed(1)}%
                </strong>{" "}
                (Margin call trigger: <strong>{clientFacility?.margin_call_ltv_pct}%</strong>).
              </p>
              {result.facilityLtvImpact.marginCallTriggered && (
                <div className="font-medium text-[#991B1B] pt-1">
                  Advisory Action: Relationship Manager must urge client to provide cash buffer or reduce drawn limit before volatility strikes.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sector-by-Sector Impact Breakdown */}
        <div>
          <h4 className="text-xs uppercase tracking-widest font-semibold text-[#70706B] mb-3">
            Sector-Level Valuation Shift in Holdings
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.affectedSectors.map((s, idx) => (
              <div key={idx} className="p-3 rounded-sm border border-[#E5E5E1] bg-[#FDFDFB] flex items-center justify-between text-xs">
                <span className="font-medium text-[#1A1A1A] truncate mr-2" title={s.sector}>
                  {s.sector}
                </span>
                <span
                  className={`font-mono font-semibold ${
                    s.deltaPct >= 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"
                  }`}
                >
                  {s.deltaPct >= 0 ? "+" : ""}{s.deltaPct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Advisory Guidance */}
        <div className="p-4 bg-[#FAF7F0] border border-[#E9DFCB] rounded-sm space-y-1.5 text-xs">
          <div className="font-semibold text-[#8C6D23] flex items-center text-[10px] uppercase tracking-widest">
            <Info className="w-3.5 h-3.5 mr-1.5 text-[#C5A059]" />
            <span>Julius Baer Advisory Playbook Guidance:</span>
          </div>
          <p className="text-[#1A1A1A] leading-relaxed pl-5 font-normal">
            {result.strategicAdvice}
          </p>
        </div>
      </div>
    </div>
  );
};
