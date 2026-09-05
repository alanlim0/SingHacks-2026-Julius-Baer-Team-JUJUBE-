import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Zap,
  TrendingUp,
  Activity,
  DollarSign,
  Scale,
  Compass,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Droplets,
  Layers,
  Coins,
  CheckCircle,
} from "lucide-react";
import {
  getProactiveRiskAndOpportunities,
  runStressTest,
  clientsById,
} from "../utils/intelligenceEngine";

interface ProactiveRiskAndOpportunitiesProps {
  selectedClientId: string;
}

export const ProactiveRiskAndOpportunities: React.FC<
  ProactiveRiskAndOpportunitiesProps
> = ({ selectedClientId }) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    "SCENARIO_ME_ESCALATION"
  );

  const data = useMemo(
    () => getProactiveRiskAndOpportunities(selectedClientId),
    [selectedClientId]
  );
  const client = clientsById.get(selectedClientId);

  // Run stress simulation
  const stressSimulation = useMemo(
    () => runStressTest(selectedClientId, selectedScenarioId),
    [selectedClientId, selectedScenarioId]
  );

  const { riskRadar, eventOpportunities, scenarios } = data;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-sm border border-[#E5E5E1] p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F0F0EE]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-xs text-[10px] font-bold bg-[#1A1A1A] text-[#C5A059] uppercase tracking-wider">
                Requirement 2
              </span>
              <span className="text-[11px] font-semibold text-[#70706B] uppercase tracking-widest">
                Proactive Risk &amp; Opportunity Detection
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#1A1A1A] mt-1">
              Risk Alerts &amp; Event Opportunities: {client?.client_name}
            </h2>
            <p className="text-xs text-[#70706B] mt-0.5">
              Surfacing drift, concentration, liquidity, currency, and collateral risks — plus event-driven investment ideas — before the client asks.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-3 py-1.5 rounded-sm bg-[#FAF7F0] border border-[#E9DFCB] text-[#8C6D23] font-semibold">
              Proactive Alert Scanner Active
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: Client-Specific Risk Alerts (Drift, Concentration, etc.)       */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
            Client-Specific Risk Alerts (5 Pillars)
          </h3>
          <span className="text-xs text-[#70706B]">Continuous automated book monitoring</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 1. Mandate & SAA Drift */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-3 ${
              riskRadar.driftRisk.hasRisk
                ? "bg-[#FFFBEB] border-[#FDE68A]"
                : "bg-white border-[#E5E5E1]"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#70706B]">
                  1. Mandate Drift
                </span>
                {riskRadar.driftRisk.hasRisk ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-[#166534]" />
                )}
              </div>
              <h4 className="text-xs font-bold text-[#1A1A1A]">
                {riskRadar.driftRisk.headline}
              </h4>
              <p className="text-[11px] text-[#70706B] leading-relaxed">
                {riskRadar.driftRisk.details}
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-xs w-fit ${
                riskRadar.driftRisk.hasRisk
                  ? "bg-[#D97706] text-white"
                  : "bg-[#F0FDF4] text-[#166534]"
              }`}
            >
              {riskRadar.driftRisk.hasRisk ? "Rebalance Needed" : "Within Corridor"}
            </span>
          </div>

          {/* 2. Concentration Risk */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-3 ${
              riskRadar.concentrationRisk.hasRisk
                ? "bg-[#FEF2F2] border-[#FECACA]"
                : "bg-white border-[#E5E5E1]"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#70706B]">
                  2. Concentration
                </span>
                {riskRadar.concentrationRisk.hasRisk ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-[#166534]" />
                )}
              </div>
              <h4 className="text-xs font-bold text-[#1A1A1A]">
                {riskRadar.concentrationRisk.headline}
              </h4>
              <p className="text-[11px] text-[#70706B] leading-relaxed">
                {riskRadar.concentrationRisk.details}
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-xs w-fit ${
                riskRadar.concentrationRisk.hasRisk
                  ? "bg-[#DC2626] text-white"
                  : "bg-[#F0FDF4] text-[#166534]"
              }`}
            >
              {riskRadar.concentrationRisk.hasRisk ? "Single Issuer >10%" : "Diversified"}
            </span>
          </div>

          {/* 3. Liquidity Risk */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-3 ${
              riskRadar.liquidityRisk.hasRisk
                ? "bg-[#FFFBEB] border-[#FDE68A]"
                : "bg-white border-[#E5E5E1]"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#70706B]">
                  3. Liquidity Gap
                </span>
                {riskRadar.liquidityRisk.hasRisk ? (
                  <Droplets className="w-3.5 h-3.5 text-[#D97706]" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-[#166534]" />
                )}
              </div>
              <h4 className="text-xs font-bold text-[#1A1A1A]">
                {riskRadar.liquidityRisk.headline}
              </h4>
              <p className="text-[11px] text-[#70706B] leading-relaxed">
                {riskRadar.liquidityRisk.details}
              </p>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-xs w-fit ${
                riskRadar.liquidityRisk.hasRisk
                  ? "bg-[#D97706] text-white"
                  : "bg-[#F0FDF4] text-[#166534]"
              }`}
            >
              {riskRadar.liquidityRisk.hasRisk ? "Action Required" : "Cash Covered"}
            </span>
          </div>

          {/* 4. Currency Risk */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-3 ${
              riskRadar.currencyRisk.hasRisk
                ? "bg-[#FFFBEB] border-[#FDE68A]"
                : "bg-white border-[#E5E5E1]"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#70706B]">
                  4. Currency Exposure
                </span>
                <Coins className="w-3.5 h-3.5 text-[#C5A059]" />
              </div>
              <h4 className="text-xs font-bold text-[#1A1A1A]">
                {riskRadar.currencyRisk.headline}
              </h4>
              <p className="text-[11px] text-[#70706B] leading-relaxed">
                {riskRadar.currencyRisk.details}
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-xs w-fit bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]">
              Base: {client?.base_currency}
            </span>
          </div>

          {/* 5. Collateral & Lombard Risk */}
          <div
            className={`p-4 rounded-sm border flex flex-col justify-between space-y-3 ${
              riskRadar.collateralRisk.status === "critical"
                ? "bg-[#FEF2F2] border-[#FECACA]"
                : riskRadar.collateralRisk.status === "warning"
                ? "bg-[#FFFBEB] border-[#FDE68A]"
                : "bg-white border-[#E5E5E1]"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#70706B]">
                  5. Lombard Collateral
                </span>
                <ShieldAlert
                  className={`w-3.5 h-3.5 ${
                    riskRadar.collateralRisk.status === "critical"
                      ? "text-[#DC2626]"
                      : "text-[#D97706]"
                  }`}
                />
              </div>
              <h4 className="text-xs font-bold text-[#1A1A1A]">
                {riskRadar.collateralRisk.headline}
              </h4>
              <p className="text-[11px] text-[#70706B] leading-relaxed">
                {riskRadar.collateralRisk.details}
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-bold text-[#1A1A1A]">
                {riskRadar.collateralRisk.currentLtv.toFixed(1)}% LTV
              </span>
              <span className="text-[#70706B]">
                Limit: {riskRadar.collateralRisk.thresholdLtv}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: Event-Based Opportunity Engine                                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-sm border border-[#E5E5E1] p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
              Event-Based Opportunity Engine
            </h3>
            <p className="text-xs text-[#70706B] mt-0.5">
              Connecting 2026 market developments to proactive, high-conviction ideas tailored for this portfolio.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-xs bg-[#FAF7F0] border border-[#E9DFCB] text-xs font-semibold text-[#8C6D23]">
            {eventOpportunities.length} Active Market Catalysts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {eventOpportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-4 space-y-3 hover:border-[#C5A059] transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-wider">
                    {opp.transmissionChannel}
                  </span>
                  <span className="text-[10px] font-mono text-[#70706B]">{opp.eventDate}</span>
                </div>

                <h4 className="text-xs font-bold text-[#1A1A1A]">{opp.marketEvent}</h4>

                <div className="p-2.5 bg-white rounded-sm border border-[#F0F0EE] text-[11px] text-[#70706B]">
                  <strong className="block text-[#1A1A1A] font-semibold text-[10px] uppercase">
                    Portfolio Impact:
                  </strong>
                  {opp.affectedPortfolioImpact}
                </div>

                <div className="p-2.5 bg-[#FAF7F0] rounded-sm border border-[#E9DFCB] text-[11px] text-[#1A1A1A]">
                  <strong className="block text-[#8C6D23] font-semibold text-[10px] uppercase">
                    Actionable Idea:
                  </strong>
                  {opp.actionableIdea}
                </div>
              </div>

              <div className="pt-2 border-t border-[#F0F0EE] text-[11px] text-[#166534] font-semibold">
                Expected Benefit: {opp.expectedBenefit}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: Portfolio Stress Testing and Scenario Analysis                 */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-sm border border-[#E5E5E1] p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#F0F0EE]">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A1A1A]">
              Portfolio Stress Testing &amp; Scenario Analysis
            </h3>
            <p className="text-xs text-[#70706B] mt-0.5">
              Simulate macro and geopolitical shockwaves against holdings, sector allocations, and Lombard collateral.
            </p>
          </div>

          {/* Scenario Selector */}
          <div className="flex items-center space-x-2">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                  selectedScenarioId === sc.id
                    ? "bg-[#1A1A1A] text-white shadow-xs"
                    : "bg-[#F4F4F0] text-[#70706B] hover:text-[#1A1A1A]"
                }`}
              >
                {sc.name.split("&")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Simulation Output Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Summary Metrics */}
          <div className="lg:col-span-5 bg-[#FAF7F0] p-5 rounded-sm border border-[#E9DFCB] space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C6D23] block">
                Active Scenario
              </span>
              <h4 className="text-sm font-bold text-[#1A1A1A] mt-0.5">
                {stressSimulation.scenarioName}
              </h4>
              <p className="text-xs text-[#70706B] mt-1 leading-relaxed">
                {stressSimulation.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E9DFCB]">
              <div>
                <span className="text-[10px] text-[#70706B] uppercase block">AUM Impact (%)</span>
                <span
                  className={`text-lg font-mono font-bold ${
                    stressSimulation.estimatedAumImpactPct >= 0
                      ? "text-[#166534]"
                      : "text-[#991B1B]"
                  }`}
                >
                  {stressSimulation.estimatedAumImpactPct >= 0 ? "+" : ""}
                  {stressSimulation.estimatedAumImpactPct.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#70706B] uppercase block">Dollar Delta</span>
                <span
                  className={`text-lg font-mono font-bold ${
                    stressSimulation.estimatedAumImpactUsd >= 0
                      ? "text-[#166534]"
                      : "text-[#991B1B]"
                  }`}
                >
                  {stressSimulation.estimatedAumImpactUsd >= 0 ? "+" : ""}$
                  {(stressSimulation.estimatedAumImpactUsd / 1e6).toFixed(2)}M
                </span>
              </div>
            </div>

            {/* Lombard facility impact if active */}
            {stressSimulation.facilityLtvImpact && (
              <div className="p-3 bg-white rounded-sm border border-[#E9DFCB] text-xs space-y-1">
                <span className="font-bold text-[#1A1A1A] block">Lombard Facility Stress:</span>
                <div className="flex items-center justify-between font-mono">
                  <span>Current LTV: {stressSimulation.facilityLtvImpact.beforeLtv.toFixed(1)}%</span>
                  <span className="text-[#C5A059]">→</span>
                  <span
                    className={`font-bold ${
                      stressSimulation.facilityLtvImpact.marginCallTriggered
                        ? "text-[#DC2626]"
                        : "text-[#1A1A1A]"
                    }`}
                  >
                    Simulated LTV: {stressSimulation.facilityLtvImpact.afterLtv.toFixed(1)}%
                  </span>
                </div>
                {stressSimulation.facilityLtvImpact.marginCallTriggered && (
                  <p className="text-[11px] font-bold text-[#DC2626] pt-1">
                    ⚠ Margin call triggered under this scenario!
                  </p>
                )}
              </div>
            )}

            <div className="pt-2 text-xs">
              <strong className="text-[#1A1A1A] block mb-0.5">RM Strategic Recommendation:</strong>
              <p className="text-[#70706B] leading-relaxed">
                {stressSimulation.strategicAdvice}
              </p>
            </div>
          </div>

          {/* Right: Sector Shock Breakdown */}
          <div className="lg:col-span-7 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] block">
              Simulated Sector Impact Under {stressSimulation.scenarioName}:
            </span>

            <div className="divide-y divide-[#F0F0EE]">
              {stressSimulation.affectedSectors.map((sec) => (
                <div
                  key={sec.sector}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-[#1A1A1A]">{sec.sector}</span>
                  <span
                    className={`font-mono font-bold ${
                      sec.deltaPct >= 0 ? "text-[#166534]" : "text-[#991B1B]"
                    }`}
                  >
                    {sec.deltaPct >= 0 ? "+" : ""}
                    {sec.deltaPct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
