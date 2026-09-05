import React, { useState } from "react";
import {
  Search,
  X,
  ArrowUpRight,
  User,
  Building2,
  Shield,
  TrendingUp,
} from "lucide-react";
import { PriorityClientItem, EventLogEntry } from "../types";
import { ClientRiskGauge } from "./RiskMeter";

interface MorningBriefingProps {
  priorityList: PriorityClientItem[];
  eventLog: EventLogEntry[];
  onSelectClient: (clientId: string) => void;
  onOpenMeetingPrep: (clientId: string) => void;
}

export const MorningBriefing: React.FC<MorningBriefingProps> = ({
  priorityList,
  onSelectClient,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bookingCentreFilter, setBookingCentreFilter] = useState<string>("all");

  // Total Relationship AUM across book
  const totalAum = priorityList.reduce((sum, item) => sum + item.client.total_aum_usd, 0);

  // Filter clients by search query (Client Name) and optional desk
  const filteredList = priorityList.filter((item) => {
    if (bookingCentreFilter !== "all" && item.client.booking_centre !== bookingCentreFilter) {
      return false;
    }
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.client.client_name.toLowerCase().includes(q);
      const matchId = item.client.client_id.toLowerCase().includes(q);
      return matchName || matchId;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Calm Executive Header */}
      <div className="bg-white p-6 sm:p-8 border border-[#E5E5E1] rounded-sm shadow-xs text-[#1A1A1A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-semibold text-[#C5A059] tracking-widest uppercase mb-1.5">
              <span>Julius Baer Relationship Management</span>
              <span className="text-[#70706B]">• Priscilla Ong</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-[#1A1A1A] tracking-tight">
              Good morning, Priscilla.
            </h2>
            <p className="text-xs sm:text-sm text-[#70706B] mt-1.5 max-w-2xl leading-relaxed">
              Search a client name below to inspect visual AUM allocations, required actions, and tailored upselling opportunities across your <strong>${(totalAum / 1e6).toFixed(1)}M</strong> book.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-[#FDFDFB] border border-[#E5E5E1] px-4 py-3 rounded-sm shadow-2xs">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Total Book AUM</span>
              <span className="text-lg font-light text-[#1A1A1A]">${(totalAum / 1e6).toFixed(1)}M USD</span>
            </div>
            <div className="h-8 w-px bg-[#E5E5E1]" />
            <div className="text-left">
              <span className="text-[10px] uppercase tracking-wider text-[#70706B] block">Relationships</span>
              <span className="text-lg font-light text-[#1A1A1A]">{priorityList.length} Accounts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Client Name Search Bar (Queue and categories completely removed) */}
      <div className="bg-white p-4 sm:p-5 rounded-sm border border-[#E5E5E1] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Prominent Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#70706B] absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search client name (e.g. Alexander, Victoria, Jonathan, Chen, Lee)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm pl-10 pr-10 py-2.5 text-[#1A1A1A] placeholder-[#70706B] focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-[#70706B] hover:text-[#1A1A1A] cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Desk Filter */}
          <div className="flex items-center space-x-2 shrink-0">
            <Building2 className="w-4 h-4 text-[#70706B]" />
            <select
              aria-label="Filter by Booking Desk"
              value={bookingCentreFilter}
              onChange={(e) => setBookingCentreFilter(e.target.value)}
              className="text-xs bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm px-3 py-2.5 text-[#1A1A1A] focus:outline-none focus:border-[#C5A059] cursor-pointer"
            >
              <option value="all">All Booking Desks</option>
              <option value="Singapore">Singapore Desk</option>
              <option value="Hong Kong">Hong Kong Desk</option>
            </select>
          </div>
        </div>

        {/* Search Results Summary */}
        <div className="flex items-center justify-between text-xs text-[#70706B] pt-1 border-t border-[#F0F0EE]">
          <span>
            {searchQuery ? (
              <>
                Found <strong className="text-[#1A1A1A]">{filteredList.length}</strong> {filteredList.length === 1 ? "client" : "clients"} matching "{searchQuery}"
              </>
            ) : (
              <>Showing all <strong className="text-[#1A1A1A]">{filteredList.length}</strong> client relationships</>
            )}
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[#8C6D23] hover:underline cursor-pointer font-medium"
            >
              Reset Search
            </button>
          )}
        </div>
      </div>

      {/* Clean Client Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredList.map((item) => {
          const { client, ytdReturnPct } = item;
          const initials = client.client_name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("");

          return (
            <div
              key={client.client_id}
              onClick={() => onSelectClient(client.client_id)}
              className="bg-white p-5 rounded-sm border border-[#E5E5E1] hover:border-[#C5A059] transition-all shadow-xs hover:shadow-sm cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Client Header & Identity */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-sm bg-[#1A1A1A] text-[#C5A059] flex items-center justify-center font-bold text-sm tracking-wider shadow-xs shrink-0 group-hover:bg-[#C5A059] group-hover:text-white transition-colors">
                      {initials}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#1A1A1A] group-hover:text-[#8C6D23] transition-colors">
                        {client.client_name}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-[#70706B] mt-0.5">
                        <span className="font-mono text-[11px]">{client.client_id}</span>
                        <span>•</span>
                        <span>{client.booking_centre} Desk</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#FDFDFB] text-[#70706B] border border-[#E5E5E1]">
                    {client.wealth_band}
                  </span>
                </div>

                {/* Metrics Breakdown: Visual AUM & Return */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F0F0EE] text-xs">
                  <div className="p-2 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1]">
                    <span className="text-[9px] uppercase tracking-wider text-[#70706B] block">
                      AUM
                    </span>
                    <span className="font-semibold text-[#1A1A1A] text-sm block mt-0.5">
                      ${(client.total_aum_usd / 1e6).toFixed(1)}M
                    </span>
                  </div>

                  <div className="p-2 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1]">
                    <span className="text-[9px] uppercase tracking-wider text-[#70706B] block">
                      YTD Return
                    </span>
                    <span
                      className={`font-semibold text-sm block mt-0.5 ${
                        ytdReturnPct >= 0 ? "text-[#2D8A39]" : "text-[#B91C1C]"
                      }`}
                    >
                      {ytdReturnPct >= 0 ? "+" : ""}
                      {ytdReturnPct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-2 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1]">
                    <span className="text-[9px] uppercase tracking-wider text-[#70706B] block">
                      Risk Profile
                    </span>
                    <span className="font-semibold text-[#1A1A1A] text-xs block mt-1 truncate" title={client.risk_profile}>
                      {client.risk_profile}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Action */}
              <div className="pt-3 mt-3 border-t border-[#F0F0EE] flex items-center justify-between">
                <span className="text-[11px] text-[#70706B]">
                  Horizon: {client.investment_horizon_years} yrs • Domicile: {client.tax_domicile}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClient(client.client_id);
                  }}
                  className="px-3 py-1.5 bg-[#1A1A1A] group-hover:bg-[#C5A059] text-white text-xs font-semibold rounded-sm flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Open Client</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredList.length === 0 && (
          <div className="col-span-2 p-10 bg-white rounded-sm border border-[#E5E5E1] text-center space-y-3">
            <User className="w-8 h-8 text-[#70706B] mx-auto opacity-50" />
            <h4 className="text-sm font-semibold text-[#1A1A1A]">
              No clients found matching "{searchQuery}"
            </h4>
            <p className="text-xs text-[#70706B] max-w-sm mx-auto">
              Please check the spelling or clear your search to view all 20 relationship accounts.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 bg-[#1A1A1A] text-white text-xs font-semibold rounded-sm hover:bg-[#333333] transition-colors cursor-pointer shadow-xs"
            >
              Show All Clients
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
