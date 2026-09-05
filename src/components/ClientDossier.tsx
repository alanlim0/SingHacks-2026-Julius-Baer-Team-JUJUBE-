import React, { useState } from "react";
import {
  Shield,
  AlertTriangle,
  FileText,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  CreditCard,
  Droplets,
  Layers,
  ChevronRight,
  ExternalLink,
  Info,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Client,
  Portfolio,
  Holding,
  CreditFacility,
  Commitment,
  PlannedCashNeed,
  RMNote,
  EventLogEntry,
} from "../types";
import {
  getClientLookThrough,
  getClientMandateCompliance,
  getEventAttribution,
  SNAPSHOT_DATES,
  TODAY_SNAPSHOT,
} from "../utils/intelligenceEngine";

interface ClientDossierProps {
  client: Client;
  portfolios: Portfolio[];
  holdings: Holding[];
  facilities: CreditFacility[];
  commitments: Commitment[];
  cashNeeds: PlannedCashNeed[];
  notes: RMNote[];
  eventLog: EventLogEntry[];
  onOpenMeetingPrep: (clientId: string) => void;
}

export const ClientDossier: React.FC<ClientDossierProps> = ({
  client,
  portfolios,
  holdings,
  facilities,
  commitments,
  cashNeeds,
  notes,
  eventLog,
  onOpenMeetingPrep,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>("allocation");
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>(TODAY_SNAPSHOT);

  const lookThroughData = getClientLookThrough(client.client_id, selectedSnapshot);
  const mandateCompliance = getClientMandateCompliance(client.client_id, selectedSnapshot);
  const attribution = getEventAttribution(client.client_id);

  // Snapshot AUM history for time series chart
  const snapshotHistory = SNAPSHOT_DATES.map((date) => {
    const pfTotal = portfolios.reduce((sum, p) => {
      const key = `aum_${date}` as keyof Portfolio;
      const val = typeof p[key] === "number" ? (p[key] as number) : 0;
      return sum + val;
    }, 0);
    return {
      date,
      aumUsd: pfTotal > 0 ? pfTotal / 1e6 : client.total_aum_usd / 1e6,
    };
  });

  // Holdings for currently selected snapshot
  const currentSnapshotHoldings = holdings.filter(
    (h) => h.client_id === client.client_id && h.snapshot_date === selectedSnapshot
  );

  // Tax note evaluation
  const isCrossBorderTax = client.tax_domicile !== client.country_of_residence;

  return (
    <div className="space-y-6">
      {/* Client Overview Card */}
      <div className="bg-white rounded-sm border border-[#E5E5E1] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Client Identity & Demographics */}
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-sm bg-[#F4F4F1] text-[#70706B] border border-[#E5E5E1]">
                {client.client_id}
              </span>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1A1A1A]">
                {client.client_name}
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#FDFDFB] text-[#70706B] border border-[#E5E5E1]">
                {client.wealth_band}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#70706B] font-medium px-2 py-0.5 rounded-sm bg-[#FDFDFB] border border-[#E5E5E1]">
                {client.booking_centre} Desk
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
              <div>
                <span className="text-[#70706B] block text-[10px] uppercase tracking-widest">Age &amp; Nationality</span>
                <span className="font-medium text-[#1A1A1A] mt-0.5 block">
                  {client.age ? `${client.age} yrs` : "Family Entity"} • {client.nationality}
                </span>
              </div>
              <div>
                <span className="text-[#70706B] block text-[10px] uppercase tracking-widest">Country of Residence</span>
                <span className="font-medium text-[#1A1A1A] mt-0.5 block">{client.country_of_residence}</span>
              </div>
              <div>
                <span className="text-[#70706B] block text-[10px] uppercase tracking-widest">Tax Domicile</span>
                <span className={`font-medium mt-0.5 block ${isCrossBorderTax ? "text-[#B91C1C] underline decoration-[#FCA5A5]" : "text-[#1A1A1A]"}`}>
                  {client.tax_domicile} {isCrossBorderTax && "(Cross-Border Check)"}
                </span>
              </div>
              <div>
                <span className="text-[#70706B] block text-[10px] uppercase tracking-widest">KYC Review Due</span>
                <span className="font-medium text-[#1A1A1A] mt-0.5 block">{client.kyc_review_due}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0F0EE] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#70706B] block text-[10px] uppercase tracking-widest">Life Stage</span>
                <span className="font-medium text-[#1A1A1A] mt-0.5 block">{client.life_stage}</span>
              </div>
              <div>
                <span className="text-[#70706B] block text-[10px] uppercase tracking-widest">Source of Wealth</span>
                <span className="font-medium text-[#1A1A1A] mt-0.5 block">{client.source_of_wealth}</span>
              </div>
              <div>
                <span className="text-[#70706B] block text-[10px] uppercase tracking-widest">Risk &amp; Horizon</span>
                <span className="font-medium text-[#1A1A1A] mt-0.5 block">
                  {client.risk_profile} ({client.risk_tolerance_score}/10) • {client.investment_horizon_years} yrs • Liquidity: {client.liquidity_needs}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Total Wealth & Actions */}
          <div className="lg:w-80 shrink-0 bg-[#FDFDFB] p-5 rounded-sm border border-[#E5E5E1] space-y-4 shadow-2xs">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#70706B] font-semibold block">Total Relationship AUM</span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-3xl font-light text-[#1A1A1A] tracking-tight">
                  USD {(client.total_aum_usd / 1e6).toFixed(1)}M
                </span>
                <span
                  className={`text-xs font-semibold flex items-center ${
                    attribution.returnPct >= 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"
                  }`}
                >
                  {attribution.returnPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {attribution.returnPct >= 0 ? "+" : ""}
                  {attribution.returnPct.toFixed(1)}% YTD
                </span>
              </div>
              <span className="text-[11px] text-[#70706B] mt-0.5 block">
                Net change: USD {(attribution.deltaAum / 1e6).toFixed(2)}M since Dec 2025
              </span>
            </div>

            <div className="pt-3 border-t border-[#F0F0EE]">
              <span className="text-[10px] uppercase tracking-widest text-[#70706B] block mb-1.5 font-semibold">
                {portfolios.length} Portfolio Account{portfolios.length > 1 ? "s" : ""}:
              </span>
              <div className="space-y-1.5">
                {portfolios.map((p) => (
                  <div key={p.portfolio_id} className="text-xs flex items-center justify-between text-[#1A1A1A]">
                    <span className="font-medium truncate max-w-[170px]" title={p.portfolio_name}>
                      {p.portfolio_name}
                    </span>
                    <span className="font-mono text-[#70706B] text-[11px]">
                      ${(p.aum_usd_current / 1e6).toFixed(1)}M ({p.service_model[0]})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onOpenMeetingPrep(client.client_id)}
              className="w-full py-2.5 px-4 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded-sm text-xs uppercase tracking-widest font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Advisory Meeting Studio</span>
            </button>
          </div>
        </div>

        {/* Priscilla's Qualitative Notes & Reality Reconciliation */}
        {notes.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#F0F0EE]">
            <div className="bg-[#FAF7F0] border border-[#E9DFCB] rounded-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-xs font-semibold text-[#8C6D23] uppercase tracking-wider text-[10px]">
                  <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Relationship Manager Priscilla Ong's Qualitative Log</span>
                  <span className="text-[#8C6D23] font-normal">({notes.length} notes recorded)</span>
                </div>
                <span className="text-[11px] text-[#8C6D23]">
                  Last note: {notes[notes.length - 1].note_date} via {notes[notes.length - 1].channel}
                </span>
              </div>
              <p className="text-xs text-[#1A1A1A] italic leading-relaxed">
                "{notes[notes.length - 1].note}"
              </p>

              {/* Special Reality Divergence Callouts */}
              {client.client_id === "CL-0005" && (
                <div className="mt-2.5 text-xs bg-[#FEF2F2] text-[#991B1B] p-2.5 rounded-sm border border-[#FECACA] font-medium leading-relaxed">
                  ⚠️ Reality vs. Note Tension: Client stated she believes her portfolio is 100% sustainable. However, portfolio PF-0007 holds Global Energy Majors Equity Fund (11.1%) and Sunrise Palm Resources (10.2%), which directly breach the binding exclusions of her Sustainable Balanced mandate!
                </div>
              )}
              {client.client_id === "CL-0007" && (
                <div className="mt-2.5 text-xs bg-[#F0F7FF] text-[#1E40AF] p-2.5 rounded-sm border border-[#BFDBFE] font-medium leading-relaxed">
                  💡 Advisory Opportunity: Alistair is 72, retired, and wants to fund a USD 12m foundation in 2027. He refuses to sell bonds at a loss, but his longest bond does not mature until 2045. Advise on funding via appreciated equity holdings or structured donation tranches to optimize his UK worldwide remittance tax position.
                </div>
              )}
              {client.client_id === "CL-0002" && (
                <div className="mt-2.5 text-xs bg-[#FEF2F2] text-[#991B1B] p-2.5 rounded-sm border border-[#FECACA] font-medium leading-relaxed">
                  ⚠️ Urgent Collateral Squeeze: Ravi drew further on his Lombard facility after the June tech drawdown, pushing LTV to 73.71% (margin call is triggered at 75.0%). With $6.2M in planned trust funding and tax payments upcoming, he cannot sustain further tech selloffs.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Snapshot Date Selector */}
      <div className="bg-white p-3 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-2 border border-[#E5E5E1] text-xs shadow-2xs">
        <div className="flex items-center space-x-2 text-[#70706B] font-semibold text-[10px] uppercase tracking-widest">
          <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>Historical Snapshot:</span>
        </div>
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {SNAPSHOT_DATES.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedSnapshot(d)}
              className={`px-3 py-1 rounded-sm font-mono text-xs transition-colors cursor-pointer ${
                selectedSnapshot === d
                  ? "bg-[#1A1A1A] text-white font-semibold shadow-xs"
                  : "bg-[#FDFDFB] text-[#70706B] hover:text-[#1A1A1A] border border-[#E5E5E1]"
              }`}
            >
              {d} {d === TODAY_SNAPSHOT ? "(Today)" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-[#E5E5E1] flex space-x-1 overflow-x-auto text-xs">
        {[
          { id: "allocation", label: "Multi-Portfolio & Mandate Bands", icon: PieChartIcon },
          { id: "timeline", label: "5-Snapshot Timeline & Event Attribution", icon: TrendingUp },
          { id: "holdings", label: `Holdings & Structured Look-Through (${currentSnapshotHoldings.length})`, icon: Layers },
          { id: "credit", label: `Credit & Lombard LTV (${facilities.length})`, icon: CreditCard },
          { id: "liquidity", label: `Liquidity & Commitments (${commitments.length + cashNeeds.length})`, icon: Droplets },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap rounded-t-sm ${
                isActive
                  ? "border-[#C5A059] text-[#1A1A1A] font-semibold bg-[#FAF9F5]"
                  : "border-transparent text-[#70706B] hover:text-[#1A1A1A] hover:bg-[#FDFDFB] font-medium"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#C5A059]" : "text-[#70706B]"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: Multi-Portfolio & Mandate Compliance */}
      {activeSubTab === "allocation" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Multi-Account Breakdown Card */}
            <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
              <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold flex items-center justify-between">
                <span>Multi-Portfolio Account Architecture</span>
                <span className="text-[10px] font-normal text-[#70706B]">
                  {portfolios.length} linked account{portfolios.length > 1 ? "s" : ""}
                </span>
              </h3>

              <div className="space-y-3">
                {portfolios.map((p) => {
                  const pfHoldings = holdings.filter(
                    (h) => h.portfolio_id === p.portfolio_id && h.snapshot_date === selectedSnapshot
                  );
                  const pfAum = pfHoldings.reduce((sum, h) => sum + h.market_value_usd, 0);
                  const sharePct = client.total_aum_usd > 0 ? (pfAum / client.total_aum_usd) * 100 : 0;

                  return (
                    <div
                      key={p.portfolio_id}
                      className="p-4 rounded-sm border border-[#E5E5E1] bg-[#FDFDFB] hover:border-[#D1D1CC] transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-[#1A1A1A]">{p.portfolio_name}</span>
                          <span className="font-mono text-[#70706B] text-[11px]">({p.portfolio_id})</span>
                          <span className="px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider bg-[#F4F4F1] text-[#1A1A1A] border border-[#E5E5E1] font-semibold">
                            {p.service_model}
                          </span>
                        </div>
                        <span className="font-mono font-semibold text-[#1A1A1A]">
                          USD {(pfAum / 1e6).toFixed(2)}M ({sharePct.toFixed(1)}%)
                        </span>
                      </div>

                      <div className="text-xs text-[#70706B] grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-[#F0F0EE]">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-[#70706B] block">Mandate</span>
                          <span className="font-medium text-[#1A1A1A]">{p.mandate_name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-[#70706B] block">Base Currency</span>
                          <span className="font-medium text-[#1A1A1A]">{p.base_currency}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-[#70706B] block">Benchmark</span>
                          <span className="font-medium text-[#1A1A1A] truncate block" title={p.benchmark}>
                            {p.benchmark}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Asset Allocation Chart */}
            <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
              <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
                Consolidated Asset Allocation ({selectedSnapshot})
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={mandateCompliance[0]?.assetClassCompliance || []}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <XAxis dataKey="assetClass" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, "auto"]} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="actualPct" name="Actual %" fill="#1A1A1A" />
                    <Bar dataKey="targetPct" name="Target %" fill="#C5A059" />
                    <Bar dataKey="maxPct" name="Max Band %" fill="#E5E5E1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Mandate Compliance & Drift Table */}
          <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
            <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold flex items-center justify-between">
              <span>Mandate Governance, Allocation Bands &amp; Breach Analysis</span>
              <span className="text-[10px] text-[#70706B] font-normal">
                Against Strategic Asset Allocation (SAA)
              </span>
            </h3>

            {mandateCompliance.map((comp) => (
              <div key={comp.portfolio_id} className="border border-[#E5E5E1] rounded-sm p-4 mb-3 bg-[#FDFDFB]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-semibold text-[#1A1A1A]">{comp.mandate_name}</span>
                    <span className="font-mono text-[#70706B] text-[11px]">({comp.portfolio_id})</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FAF9F5] text-[#70706B] border-b border-[#E5E5E1] text-[10px] uppercase tracking-wider">
                        <th className="p-2.5 font-semibold">Asset Class</th>
                        <th className="p-2.5 font-semibold text-right">Actual %</th>
                        <th className="p-2.5 font-semibold text-right">Min %</th>
                        <th className="p-2.5 font-semibold text-right">Target %</th>
                        <th className="p-2.5 font-semibold text-right">Max %</th>
                        <th className="p-2.5 font-semibold text-right">Drift</th>
                        <th className="p-2.5 font-semibold">Compliance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0EE]">
                      {comp.assetClassCompliance.map((row) => (
                        <tr key={row.assetClass} className="hover:bg-white/80">
                          <td className="p-2.5 font-medium text-[#1A1A1A]">{row.assetClass}</td>
                          <td className="p-2.5 text-right font-mono font-semibold text-[#1A1A1A]">{row.actualPct.toFixed(1)}%</td>
                          <td className="p-2.5 text-right font-mono text-[#70706B]">{row.minPct}%</td>
                          <td className="p-2.5 text-right font-mono text-[#70706B]">{row.targetPct}%</td>
                          <td className="p-2.5 text-right font-mono text-[#70706B]">{row.maxPct}%</td>
                          <td className="p-2.5 text-right font-mono">
                            {row.driftPct > 0 ? (
                              <span className="text-[#C5A059] font-semibold">+{row.driftPct.toFixed(1)}%</span>
                            ) : (
                              <span className="text-[#D1D1CC]">—</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {row.status === "compliant" ? (
                              <span className="px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-[#E6F4EA] text-[#2D8A39]">
                                In Band
                              </span>
                            ) : row.status === "overweight" ? (
                              <span className="px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]">
                                Overweight Drift
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-sm text-[10px] font-semibold bg-[#F0F7FF] text-[#1E40AF] border border-[#BFDBFE]">
                                Underweight Drift
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sustainability Breaches if any */}
                {comp.sustainabilityBreaches.length > 0 && (
                  <div className="mt-3 bg-[#FEF2F2] border border-[#FECACA] rounded-sm p-3 text-xs space-y-1">
                    <span className="font-semibold text-[#991B1B] block flex items-center">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-[#DC2626]" />
                      Binding Sustainability Exclusion Breaches ({comp.sustainabilityBreaches.length}):
                    </span>
                    {comp.sustainabilityBreaches.map((b, bIdx) => (
                      <div key={bIdx} className="text-[#991B1B] pl-4">
                        • <strong>{b.instrument_name}</strong> ({b.weightPct.toFixed(1)}%): {b.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: 5-Snapshot Timeline & Event Attribution */}
      {activeSubTab === "timeline" && (
        <div className="space-y-6">
          {/* Historical AUM Evolution Chart */}
          <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold flex items-center justify-between">
              <span>5-Snapshot Portfolio Value Evolution (USD Millions)</span>
              <span className="text-[10px] text-[#70706B] font-normal">
                Baseline (31-Dec-2025) to Today (26-Aug-2026)
              </span>
            </h3>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snapshotHistory} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} unit="M" />
                  <Tooltip formatter={(val: any) => [`$${Number(val).toFixed(2)}M`, "Total AUM"]} />
                  <Area
                    type="monotone"
                    dataKey="aumUsd"
                    stroke="#C5A059"
                    strokeWidth={2}
                    fill="#C5A059"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Event Attribution Breakdown */}
          <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
            <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
              Macro Event Attribution &amp; Performance Drivers
            </h3>
            <p className="text-xs text-[#70706B]">
              Linking 2026 events from <code className="bg-[#F4F4F1] px-1 py-0.5 rounded-sm text-[#1A1A1A]">event_log.csv</code> directly to
              the transmission channels affecting client holdings.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Asset Class Attribution Table */}
              <div className="border border-[#E5E5E1] rounded-sm p-4 bg-[#FDFDFB]">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-[#1A1A1A] mb-3">Performance by Asset Class (YTD)</h4>
                <div className="space-y-2 text-xs">
                  {attribution.assetClassBreakdown.map((item) => (
                    <div key={item.assetClass} className="flex items-center justify-between py-1.5 border-b border-[#F0F0EE]">
                      <span className="font-medium text-[#1A1A1A]">{item.assetClass}</span>
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-[#70706B]">
                          ${(item.currentVal / 1e6).toFixed(1)}M
                        </span>
                        <span
                          className={`font-mono font-semibold ${
                            item.deltaVal >= 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"
                          }`}
                        >
                          {item.deltaVal >= 0 ? "+" : ""}${(item.deltaVal / 1e6).toFixed(2)}M
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matched Geopolitical & Macro Events */}
              <div className="border border-[#E5E5E1] rounded-sm p-4 bg-[#FDFDFB]">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-[#1A1A1A] mb-3">Authoritative Events Impacting Holdings</h4>
                <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
                  {attribution.matchedEvents.slice(0, 5).map((e, idx) => (
                    <div key={idx} className="p-2.5 rounded-sm bg-white border border-[#E5E5E1]">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono font-semibold text-[#1A1A1A]">{e.event_date}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-sm text-[9px] uppercase tracking-wider font-bold ${
                            e.severity === "Severe"
                              ? "bg-[#FEF2F2] text-[#991B1B]"
                              : "bg-[#FAF7F0] text-[#8C6D23]"
                          }`}
                        >
                          {e.severity}
                        </span>
                      </div>
                      <p className="text-[#1A1A1A] font-medium">{e.description}</p>
                      <span className="text-[10px] text-[#70706B] mt-1 block">
                        Transmission: <em>{e.primary_transmission}</em>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Holdings & Look-Through */}
      {activeSubTab === "holdings" && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
                  Portfolio Holdings &amp; Structured Products Look-Through
                </h3>
                <p className="text-xs text-[#70706B] mt-0.5">
                  Snapshot: <strong className="text-[#1A1A1A]">{selectedSnapshot}</strong> • Look through structured notes to underlying reference baskets.
                </p>
              </div>
              <div className="text-xs font-mono text-[#1A1A1A] bg-[#FDFDFB] border border-[#E5E5E1] px-3 py-1.5 rounded-sm shadow-2xs">
                Total Holdings Value: USD {(lookThroughData.totalAum / 1e6).toFixed(2)}M
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F5] text-[#70706B] border-b border-[#E5E5E1] text-[10px] uppercase tracking-wider">
                    <th className="p-2.5 font-semibold">Instrument</th>
                    <th className="p-2.5 font-semibold">Asset Class</th>
                    <th className="p-2.5 font-semibold">Sector</th>
                    <th className="p-2.5 font-semibold text-right">Market Val (USD)</th>
                    <th className="p-2.5 font-semibold text-right">Weight</th>
                    <th className="p-2.5 font-semibold text-right">Unrealised P&amp;L</th>
                    <th className="p-2.5 font-semibold">Liquidity</th>
                    <th className="p-2.5 font-semibold">Look-Through Exposure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EE]">
                  {currentSnapshotHoldings.map((h) => {
                    const exp = lookThroughData.exposures.find((e) => e.instrument_id === h.instrument_id);
                    const isStructured = exp?.isStructured;

                    return (
                      <tr key={h.instrument_id} className={`hover:bg-[#FAF9F5] ${isStructured ? "bg-[#FAF7F0]/30" : ""}`}>
                        <td className="p-2.5">
                          <div className="font-semibold text-[#1A1A1A]">{h.instrument_name}</div>
                          <div className="text-[10px] font-mono text-[#70706B]">{h.instrument_id}</div>
                        </td>
                        <td className="p-2.5 text-[#70706B]">{h.asset_class}</td>
                        <td className="p-2.5 text-[#70706B]">{h.sector}</td>
                        <td className="p-2.5 text-right font-mono font-semibold text-[#1A1A1A]">
                          ${(h.market_value_usd / 1e3).toLocaleString(undefined, { maximumFractionDigits: 0 })}k
                        </td>
                        <td className="p-2.5 text-right font-mono text-[#70706B]">{h.weight_pct.toFixed(1)}%</td>
                        <td className="p-2.5 text-right font-mono">
                          <span className={h.unrealised_pnl_base >= 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"}>
                            {h.unrealised_pnl_base >= 0 ? "+" : ""}
                            {(h.unrealised_pnl_pct).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-semibold bg-[#F4F4F1] text-[#70706B] border border-[#E5E5E1]">
                            {h.liquidity_tier}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {isStructured && exp?.underlyingReference ? (
                            <div className="p-1.5 rounded-sm bg-[#FAF7F0] border border-[#E9DFCB] text-[11px] text-[#8C6D23]">
                              <span className="font-semibold block text-[9px] uppercase tracking-widest text-[#8C6D23]">
                                🔍 Underlying:
                              </span>
                              {exp.underlyingReference}
                            </div>
                          ) : (
                            <span className="text-[#D1D1CC] text-[11px]">Direct</span>
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

      {/* SUB-TAB 4: Credit & Lombard LTV Monitor */}
      {activeSubTab === "credit" && (
        <div className="space-y-4">
          {facilities.length === 0 ? (
            <div className="bg-white rounded-sm p-10 text-center text-[#70706B] border border-[#E5E5E1]">
              <CreditCard className="w-8 h-8 mx-auto text-[#70706B] mb-2" />
              <p className="text-sm font-medium text-[#1A1A1A]">This client has no active credit facilities or Lombard loans.</p>
            </div>
          ) : (
            facilities.map((fac) => {
              const currentLtv = fac["ltv_pct_2026-08-26"];
              const marginTrigger = fac.margin_call_ltv_pct;
              const currentHeadroom = fac["headroom_2026-08-26"];
              const isBreached = currentLtv >= marginTrigger;
              const isWarning = marginTrigger - currentLtv <= 5.0;

              const ltvTrajectory = SNAPSHOT_DATES.map((d) => ({
                date: d,
                ltv: fac[`ltv_pct_${d}` as keyof CreditFacility] as number,
                marginCall: marginTrigger,
              }));

              return (
                <div key={fac.facility_id} className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0F0EE] pb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-semibold text-[#1A1A1A]">{fac.facility_type}</h3>
                        <span className="font-mono text-xs text-[#70706B]">({fac.facility_id})</span>
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider font-semibold ${
                            isBreached
                              ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                              : isWarning
                              ? "bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]"
                              : "bg-[#E6F4EA] text-[#2D8A39]"
                          }`}
                        >
                          {isBreached ? "MARGIN CALL" : isWarning ? "HEADROOM ALERT" : "HEALTHY"}
                        </span>
                      </div>
                      <span className="text-xs text-[#70706B] mt-1 block">
                        Pledged Collateral Portfolio: <strong className="text-[#1A1A1A]">{fac.collateral_portfolio_id}</strong>
                      </span>
                    </div>

                    <div className="flex items-center space-x-5 text-xs font-mono">
                      <div>
                        <span className="text-[#70706B] block text-[10px] uppercase tracking-widest">Credit Limit</span>
                        <span className="font-semibold text-[#1A1A1A]">
                          USD {(fac.credit_limit / 1e6).toFixed(2)}M
                        </span>
                      </div>
                      <div>
                        <span className="text-[#70706B] block text-[10px] uppercase tracking-widest">Drawn Today</span>
                        <span className="font-semibold text-[#B91C1C]">
                          USD {(fac["drawn_2026-08-26"] / 1e6).toFixed(2)}M
                        </span>
                      </div>
                      <div>
                        <span className="text-[#70706B] block text-[10px] uppercase tracking-widest">Headroom</span>
                        <span className="font-semibold text-[#1A1A1A]">
                          USD {(currentHeadroom / 1e6).toFixed(2)}M
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* LTV Comparison Gauge */}
                  <div className="bg-[#FDFDFB] p-5 rounded-sm border border-[#E5E5E1]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[#1A1A1A]">Loan-to-Value (LTV) vs. Margin Call Trigger</span>
                      <span className="font-mono font-semibold text-[#1A1A1A]">
                        {currentLtv.toFixed(1)}% / {marginTrigger.toFixed(1)}% Limit
                      </span>
                    </div>
                    <div className="w-full bg-[#F0F0EE] h-2 rounded-sm overflow-hidden relative">
                      <div
                        className={`h-full ${
                          isBreached ? "bg-[#B91C1C]" : isWarning ? "bg-[#C5A059]" : "bg-[#2D8A39]"
                        }`}
                        style={{ width: `${Math.min(currentLtv, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#70706B] mt-1.5 uppercase tracking-wider">
                      <span>0%</span>
                      <span className="text-[#C5A059] font-medium">
                        Warning Zone: {(marginTrigger - 5).toFixed(0)}%
                      </span>
                      <span className="text-[#B91C1C] font-semibold">
                        Trigger: {marginTrigger}%
                      </span>
                    </div>
                  </div>

                  {/* Historical LTV Trajectory Chart */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-[#1A1A1A]">5-Snapshot LTV Evolution (%)</h4>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={ltvTrajectory} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} domain={[0, 90]} unit="%" />
                          <Tooltip />
                          <Area type="monotone" dataKey="ltv" name="LTV %" stroke="#B91C1C" fill="#FEF2F2" fillOpacity={0.6} />
                          <Area type="step" dataKey="marginCall" name="Margin Call Limit %" stroke="#7F1D1D" strokeDasharray="3 3" fill="none" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-TAB 5: Liquidity & Commitments Matching */}
      {activeSubTab === "liquidity" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Private Market Commitments */}
            <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
              <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold flex items-center justify-between">
                <span>Private Markets Capital Commitments</span>
                <span className="text-[10px] text-[#70706B]">{commitments.length} active funds</span>
              </h3>

              {commitments.length === 0 ? (
                <p className="text-xs text-[#70706B] italic py-4 text-center">No outstanding private market fund commitments.</p>
              ) : (
                <div className="space-y-3">
                  {commitments.map((c) => (
                    <div key={c.commitment_id} className="p-3.5 rounded-sm border border-[#E5E5E1] bg-[#FDFDFB] text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#1A1A1A]">{c.fund_name}</span>
                        <span className="font-mono text-[#70706B] text-[11px]">{c.currency}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[#70706B] text-[11px] pt-1 border-t border-[#F0F0EE]">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-[#70706B] block">Committed</span>
                          <span className="font-medium text-[#1A1A1A]">${(c.committed / 1e6).toFixed(1)}M</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-[#70706B] block">Called to Date</span>
                          <span className="font-medium text-[#1A1A1A]">${(c.called_to_date / 1e6).toFixed(1)}M</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-widest text-[#70706B] block">Uncalled Liability</span>
                          <span className="font-semibold text-[#B91C1C]">${(c.uncalled / 1e6).toFixed(1)}M</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-[#70706B] pt-1">
                        Expected call window: <strong className="text-[#1A1A1A]">{c.expected_call_window}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Planned Cash Needs */}
            <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
              <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold flex items-center justify-between">
                <span>Planned Cash Needs &amp; Client Liabilities</span>
                <span className="text-[10px] text-[#70706B]">{cashNeeds.length} items</span>
              </h3>

              {cashNeeds.length === 0 ? (
                <p className="text-xs text-[#70706B] italic py-4 text-center">No recorded planned cash needs.</p>
              ) : (
                <div className="space-y-3">
                  {cashNeeds.map((n) => (
                    <div key={n.need_id} className="p-3.5 rounded-sm border border-[#E5E5E1] bg-[#FDFDFB] text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#1A1A1A]">{n.description}</span>
                        <span className="font-mono font-semibold text-[#B91C1C]">
                          {n.currency} {(n.amount / 1e6).toFixed(2)}M
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#70706B] pt-1 border-t border-[#F0F0EE]">
                        <span>Window: {n.due_from} to {n.due_to}</span>
                        <span className="px-2 py-0.5 rounded-sm bg-[#F4F4F1] text-[#70706B] font-medium text-[10px] uppercase tracking-wider">
                          {n.recurrence} • {n.certainty}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
