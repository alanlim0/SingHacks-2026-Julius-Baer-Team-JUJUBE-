import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  Calendar,
  Zap,
  TrendingUp,
  FileText,
  Clock,
  Sparkles,
  Search,
  ChevronRight,
  Shield,
} from "lucide-react";
import { PriorityClientItem, EventLogEntry } from "../types";

interface MorningBriefingProps {
  priorityList: PriorityClientItem[];
  eventLog: EventLogEntry[];
  onSelectClient: (clientId: string) => void;
  onOpenMeetingPrep: (clientId: string) => void;
}

export const MorningBriefing: React.FC<MorningBriefingProps> = ({
  priorityList,
  eventLog,
  onSelectClient,
  onOpenMeetingPrep,
}) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [bookingCentreFilter, setBookingCentreFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Key metrics
  const totalAum = priorityList.reduce((sum, item) => sum + item.client.total_aum_usd, 0);
  const criticalItems = priorityList.filter((item) => item.urgencyLevel === "Critical");
  const highItems = priorityList.filter((item) => item.urgencyLevel === "High");
  const marginAlerts = priorityList.filter(
    (item) => item.keyRisks.marginRisk && item.keyRisks.marginRisk.status !== "healthy"
  );
  const governanceBreaches = priorityList.filter(
    (item) => item.keyRisks.sustainabilityBreaches && item.keyRisks.sustainabilityBreaches.length > 0
  );

  // Filter list
  const filteredList = priorityList.filter((item) => {
    if (bookingCentreFilter !== "all" && item.client.booking_centre !== bookingCentreFilter) {
      return false;
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchName = item.client.client_name.toLowerCase().includes(q);
      const matchId = item.client.client_id.toLowerCase().includes(q);
      const matchTrig = item.primaryTriggers.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchId && !matchTrig) return false;
    }
    if (filterType === "critical") return item.urgencyLevel === "Critical";
    if (filterType === "needs-action") return item.urgencyLevel === "Critical" || item.urgencyLevel === "High";
    if (filterType === "margin") return item.keyRisks.marginRisk?.status !== "healthy";
    if (filterType === "mandate") return (item.keyRisks.sustainabilityBreaches?.length ?? 0) > 0 || (item.keyRisks.mandateDrifts?.length ?? 0) > 0;
    if (filterType === "tax") return item.keyRisks.taxMismatch;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Calm Executive Greeting Banner */}
      <div className="bg-white p-6 sm:p-8 border border-[#E5E5E1] rounded-sm shadow-xs text-[#1A1A1A]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-semibold text-[#C5A059] tracking-widest uppercase mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Daily Advisory Intelligence Queue</span>
              <span className="text-[#70706B]">• 26 August 2026</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-[#1A1A1A] tracking-tight">
              Good morning, Priscilla.
            </h2>
            <p className="text-xs sm:text-sm text-[#70706B] mt-1.5 max-w-2xl leading-relaxed">
              You have <span className="text-[#B91C1C] font-semibold">{criticalItems.length} critical client alerts</span> and{" "}
              <span className="text-[#C5A059] font-semibold">{highItems.length} high-priority discussions</span> requiring
              preparation before upcoming meetings this fortnight.
            </p>
          </div>

          {/* Clean 4-Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#FDFDFB] border border-[#E5E5E1] p-3.5 rounded-sm text-center shadow-2xs">
              <div className="text-[10px] uppercase tracking-widest text-[#70706B]">Book AUM</div>
              <div className="text-lg font-light text-[#1A1A1A] mt-0.5">
                ${(totalAum / 1e6).toFixed(1)}M
              </div>
              <div className="text-[10px] text-[#70706B] mt-0.5">20 Accounts</div>
            </div>

            <div className="bg-[#FDFDFB] border border-[#E5E5E1] p-3.5 rounded-sm text-center shadow-2xs">
              <div className="text-[10px] uppercase tracking-widest text-[#70706B]">Critical Actions</div>
              <div className="text-lg font-light text-[#B91C1C] mt-0.5">
                {criticalItems.length}
              </div>
              <div className="text-[10px] text-[#B91C1C] mt-0.5 font-medium">Require Call</div>
            </div>

            <div className="bg-[#FDFDFB] border border-[#E5E5E1] p-3.5 rounded-sm text-center shadow-2xs">
              <div className="text-[10px] uppercase tracking-widest text-[#70706B]">Margin Alerts</div>
              <div className="text-lg font-light text-[#C5A059] mt-0.5">
                {marginAlerts.length}
              </div>
              <div className="text-[10px] text-[#8C6D23] mt-0.5">Lombard LTV</div>
            </div>

            <div className="bg-[#FDFDFB] border border-[#E5E5E1] p-3.5 rounded-sm text-center shadow-2xs">
              <div className="text-[10px] uppercase tracking-widest text-[#70706B]">Mandate Drift</div>
              <div className="text-lg font-light text-[#1A1A1A] mt-0.5">
                {governanceBreaches.length}
              </div>
              <div className="text-[10px] text-[#70706B] mt-0.5">Exclusion Check</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 border border-[#E5E5E1] rounded-sm shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Clients (20)" },
            { id: "needs-action", label: `Needs Action (${criticalItems.length + highItems.length})` },
            { id: "critical", label: `Critical Only (${criticalItems.length})` },
            { id: "margin", label: `Margin Alerts (${marginAlerts.length})` },
            { id: "mandate", label: "Mandate / ESG" },
            { id: "tax", label: "Tax Domicile" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-3 py-1 text-xs uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                filterType === btn.id
                  ? "bg-[#1A1A1A] text-white font-semibold shadow-xs"
                  : "bg-[#FDFDFB] text-[#70706B] border border-[#E5E5E1] hover:text-[#1A1A1A] hover:border-[#D1D1CC] font-medium"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <select
            aria-label="Filter by Desk"
            value={bookingCentreFilter}
            onChange={(e) => setBookingCentreFilter(e.target.value)}
            className="text-xs bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm px-2.5 py-1.5 text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
          >
            <option value="all">All Desks (SG &amp; HK)</option>
            <option value="Singapore">Singapore Desk</option>
            <option value="Hong Kong">Hong Kong Desk</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#70706B] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search client or trigger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm pl-8 pr-3 py-1.5 text-[#1A1A1A] placeholder-[#70706B] focus:outline-none focus:border-[#C5A059] w-48"
            />
          </div>
        </div>
      </div>

      {/* Priority Client Queue Cards */}
      <div className="space-y-3">
        {filteredList.map((item, index) => {
          const { client, urgencyLevel, primaryTriggers, recommendedAction, ytdReturnPct } = item;
          const isCritical = urgencyLevel === "Critical";
          const isHigh = urgencyLevel === "High";

          return (
            <div
              key={client.client_id}
              className={`bg-white rounded-sm border transition-all hover:border-[#D1D1CC] shadow-xs p-5 ${
                isCritical
                  ? "border-l-4 border-l-[#B91C1C] border-y-[#E5E5E1] border-r-[#E5E5E1]"
                  : isHigh
                  ? "border-l-4 border-l-[#C5A059] border-y-[#E5E5E1] border-r-[#E5E5E1]"
                  : "border-[#E5E5E1]"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Client Demographics */}
                <div className="flex items-start space-x-3.5 min-w-[280px]">
                  <div
                    className={`w-9 h-9 rounded-sm flex flex-col items-center justify-center font-bold text-xs shrink-0 ${
                      isCritical
                        ? "bg-[#B91C1C] text-white"
                        : isHigh
                        ? "bg-[#C5A059] text-white"
                        : "bg-[#F4F4F1] text-[#1A1A1A] border border-[#E5E5E1]"
                    }`}
                  >
                    <span className="text-[8px] uppercase tracking-wider font-mono opacity-80">Rank</span>
                    <span className="text-xs font-bold leading-none">#{index + 1}</span>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3
                        onClick={() => onSelectClient(client.client_id)}
                        className="text-base font-semibold text-[#1A1A1A] hover:text-[#C5A059] cursor-pointer transition-colors"
                      >
                        {client.client_name}
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#FDFDFB] text-[#70706B] border border-[#E5E5E1]">
                        {client.wealth_band}
                      </span>
                      <span className="text-xs text-[#70706B]">
                        {client.booking_centre} Desk
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-[#70706B] mt-1">
                      <span>AUM: <strong className="text-[#1A1A1A]">${(client.total_aum_usd / 1e6).toFixed(1)}M</strong></span>
                      <span className="text-[#E5E5E1]">•</span>
                      <span className={`font-semibold flex items-center ${ytdReturnPct >= 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"}`}>
                        {ytdReturnPct >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                        {ytdReturnPct >= 0 ? "+" : ""}{ytdReturnPct.toFixed(1)}% YTD
                      </span>
                      <span className="text-[#E5E5E1]">•</span>
                      <span>Risk: {client.risk_profile}</span>
                    </div>
                  </div>
                </div>

                {/* Center: Issue & Recommended Action in Plain English */}
                <div className="flex-1 lg:px-6 border-y lg:border-y-0 lg:border-x border-[#F0F0EE] py-2 lg:py-0 space-y-1.5">
                  <div className="text-xs">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-[#70706B] block">
                      Why Attention is Needed
                    </span>
                    <p className="text-[#1A1A1A] font-medium leading-relaxed">
                      {primaryTriggers[0] || "Routine portfolio review & strategic rebalancing check."}
                    </p>
                  </div>

                  <div className="text-xs text-[#70706B]">
                    <span className="font-semibold text-[#1A1A1A]">Recommended Action: </span>
                    <span>{recommendedAction}</span>
                  </div>
                </div>

                {/* Right: Primary Action Button */}
                <div className="lg:w-48 shrink-0 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onSelectClient(client.client_id)}
                    className="w-full py-2 px-3 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded-sm text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer text-center flex items-center justify-center space-x-1.5 shadow-xs"
                  >
                    <span>Open Briefing</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#C5A059]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredList.length === 0 && (
          <div className="bg-white rounded-sm p-10 text-center text-[#70706B] border border-[#E5E5E1]">
            <CheckCircle2 className="w-8 h-8 mx-auto text-[#70706B] mb-2" />
            <p className="text-sm font-medium text-[#1A1A1A]">No clients match this filter.</p>
            <button
              onClick={() => {
                setFilterType("all");
                setBookingCentreFilter("all");
                setSearchQuery("");
              }}
              className="mt-2 text-xs uppercase tracking-wider font-semibold text-[#C5A059] hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
