import React, { useMemo } from "react";
import { Shield, AlertTriangle, Users, Wallet, Clock, Search, ChevronRight } from "lucide-react";
import { PriorityClientItem } from "../types";
import { getExpiringVDRDocuments } from "../utils/vdrEngine";

interface HeaderProps {
  priorityList: PriorityClientItem[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  priorityList,
  selectedClientId,
  onSelectClient,
  activeTab,
  setActiveTab,
}) => {
  const totalBookAum = priorityList.reduce((sum, item) => sum + item.client.total_aum_usd, 0);
  const criticalCount = priorityList.filter((item) => item.urgencyLevel === "Critical").length;
  const highCount = priorityList.filter((item) => item.urgencyLevel === "High").length;
  const selectedItem = priorityList.find((p) => p.client.client_id === selectedClientId);

  // Calculate VDR documents within 30 days of expiration (NDAs, KYC profiles, facilities)
  const expiringVdrDocs = useMemo(() => getExpiringVDRDocuments("2026-09-04", 30), []);
  const expiringVdrCount = expiringVdrDocs.length;

  return (
    <header className="bg-white text-[#1A1A1A] border-b border-[#E5E5E1] sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Brand & Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-sm bg-[#1A1A1A] text-[#C5A059] flex items-center justify-center font-bold text-xs tracking-wider shadow-xs">
              JB
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-semibold tracking-tighter uppercase text-[#1A1A1A]">
                  Julius Bär
                </h1>
                <span className="text-[#70706B] text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-sm bg-[#F4F4F1] border border-[#E5E5E1]">
                  Wealth Intelligence
                </span>
                <span className="text-xs text-[#70706B] hidden md:inline">
                  • RM Priscilla Ong (Asia Desk)
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats & Client Switcher */}
          <div className="flex items-center space-x-3 text-xs">
            <div className="text-[#70706B] hidden lg:block">
              Book AUM: <strong className="text-[#1A1A1A]">USD {(totalBookAum / 1e6).toFixed(1)}M</strong> ({priorityList.length} Clients)
            </div>

            {/* Client Fast Switcher */}
            <div className="relative">
              <div className="flex items-center bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm px-2.5 py-1.5 shadow-2xs hover:border-[#D1D1CC] transition-colors">
                <Search className="w-3.5 h-3.5 text-[#70706B] mr-1.5" />
                <select
                  aria-label="Select Client"
                  value={selectedClientId}
                  onChange={(e) => {
                    onSelectClient(e.target.value);
                    if (activeTab === "priority") {
                      setActiveTab("client");
                    }
                  }}
                  className="bg-transparent text-xs text-[#1A1A1A] font-medium focus:outline-none cursor-pointer pr-1"
                >
                  {priorityList.map((item) => (
                    <option key={item.client.client_id} value={item.client.client_id} className="bg-white text-[#1A1A1A]">
                      {item.urgencyLevel === "Critical" ? "● " : item.urgencyLevel === "High" ? "▲ " : "  "}
                      {item.client.client_name} ({item.client.client_id}) — ${(item.client.total_aum_usd / 1e6).toFixed(1)}M
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex space-x-2 mt-3 pt-2.5 border-t border-[#F0F0EE] overflow-x-auto">
          {[
            {
              id: "priority",
              label: "Priority Agenda",
              badge: criticalCount + highCount > 0 ? `${criticalCount + highCount} Actions` : undefined,
              badgeColor: criticalCount > 0 ? "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]" : "bg-[#FAF7F0] text-[#8C6D23] border-[#E9DFCB]",
            },
            {
              id: "client",
              label: selectedItem ? `Client: ${selectedItem.client.client_name}` : "Client Workspace",
            },
            {
              id: "vdr",
              label: "Papermark VDR",
              badge: expiringVdrCount > 0 ? `${expiringVdrCount} Expiring` : "Vault",
              badgeColor: expiringVdrCount > 0
                ? "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D] font-bold"
                : "bg-[#FAF7F0] text-[#8C6D23] border-[#E9DFCB]",
            },
            {
              id: "radar",
              label: "Desk Risk Radar",
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 text-xs uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#1A1A1A] text-white font-semibold shadow-xs"
                    : "text-[#70706B] hover:text-[#1A1A1A] hover:bg-[#FDFDFB] font-medium"
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-semibold border ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
