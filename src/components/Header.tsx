import React, { useState } from "react";
import {
  Shield,
  AlertTriangle,
  User,
  Settings,
  LogOut,
  CheckCircle2,
  Lock,
  ChevronDown,
  Globe,
  Bell,
  Sliders,
} from "lucide-react";
import { PriorityClientItem } from "../types";

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

  // Profile & Settings modal / popover state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeBookingDesk, setActiveBookingDesk] = useState<"Singapore" | "Hong Kong" | "All">("All");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<"active" | "locked">("active");

  return (
    <header className="bg-white text-[#1A1A1A] border-b border-[#E5E5E1] sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Brand & Identity: JUJUBE OS by Julius Baer */}
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-sm bg-[#1A1A1A] text-[#C5A059] flex items-center justify-center font-bold text-xs tracking-wider shadow-xs">
              JB
            </div>
            <div className="flex items-baseline space-x-1.5">
              <h1 className="text-base font-semibold tracking-wider uppercase text-[#1A1A1A]">
                JUJUBE OS
              </h1>
              <span className="text-xs text-[#70706B] font-normal">by</span>
              <span className="text-xs font-semibold text-[#1A1A1A] tracking-tight">Julius Baer</span>
            </div>
          </div>

          {/* Top Right: User Profile Icon & Login/Settings for RM Priscilla Ong */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2.5 bg-[#FDFDFB] hover:bg-[#F4F4F1] border border-[#E5E5E1] hover:border-[#D1D1CC] rounded-full pl-1.5 pr-3 py-1 transition-all cursor-pointer shadow-2xs group"
              title="Relationship Manager Profile & Settings"
            >
              {/* Profile Avatar Icon */}
              <div className="w-7 h-7 rounded-full bg-[#1A1A1A] text-[#C5A059] flex items-center justify-center font-bold text-xs shadow-2xs ring-1 ring-[#C5A059]/40">
                PO
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-[#1A1A1A] group-hover:text-[#C5A059] transition-colors leading-tight flex items-center space-x-1">
                  <span>Priscilla Ong</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A39]"></span>
                </div>
                <div className="text-[10px] text-[#70706B] font-mono leading-tight">Senior RM • Asia Desk</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#70706B] group-hover:text-[#1A1A1A] transition-transform" />
            </button>

            {/* Profile & Settings Dropdown Popover */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md border border-[#E5E5E1] shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-start justify-between pb-3 border-b border-[#F0F0EE]">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[#1A1A1A] text-[#C5A059] flex items-center justify-center font-bold text-sm shadow-xs ring-2 ring-[#C5A059]/50">
                      PO
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#1A1A1A]">Priscilla Ong</h4>
                      <p className="text-[11px] text-[#70706B]">Executive Director, Senior RM</p>
                      <span className="inline-flex items-center space-x-1 text-[9px] font-mono text-[#2D8A39] bg-[#E6F4EA] px-1.5 py-0.2 rounded-2xs mt-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Authenticated Session</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProfileMenu(false)}
                    className="text-[#70706B] hover:text-[#1A1A1A] text-xs cursor-pointer p-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Desk & Portfolio Quick Stats */}
                <div className="py-3 border-b border-[#F0F0EE] space-y-2 text-xs">
                  <div className="flex justify-between text-[#70706B]">
                    <span>Assigned Book AUM:</span>
                    <strong className="text-[#1A1A1A] font-mono">USD ${(totalBookAum / 1e6).toFixed(1)}M</strong>
                  </div>
                  <div className="flex justify-between text-[#70706B]">
                    <span>Managed Accounts:</span>
                    <span className="text-[#1A1A1A] font-mono">{priorityList.length} Institutional / UHNW</span>
                  </div>
                  <div className="flex justify-between text-[#70706B]">
                    <span>Compliance Clearance:</span>
                    <span className="text-[#2D8A39] font-medium">MAS &amp; FINMA Active</span>
                  </div>
                </div>

                {/* Settings Controls */}
                <div className="py-3 border-b border-[#F0F0EE] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#70706B] flex items-center space-x-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Primary Booking Desk</span>
                    </span>
                    <select
                      aria-label="Primary Booking Desk"
                      value={activeBookingDesk}
                      onChange={(e) => setActiveBookingDesk(e.target.value as any)}
                      className="bg-[#FDFDFB] border border-[#E5E5E1] rounded-xs px-2 py-1 text-[11px] text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
                    >
                      <option value="All">All Desks</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Hong Kong">Hong Kong</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#70706B] flex items-center space-x-1.5">
                      <Bell className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Lombard &amp; Risk Alerts</span>
                    </span>
                    <button
                      onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-xs cursor-pointer font-semibold ${
                        notificationsEnabled
                          ? "bg-[#E6F4EA] text-[#2D8A39] border border-[#CEEAD6]"
                          : "bg-[#F4F4F1] text-[#70706B] border border-[#E5E5E1]"
                      }`}
                    >
                      {notificationsEnabled ? "Enabled" : "Muted"}
                    </button>
                  </div>
                </div>

                {/* Login / Lock / Sign Out Actions */}
                <div className="pt-3 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSessionStatus(sessionStatus === "active" ? "locked" : "active");
                      setShowProfileMenu(false);
                    }}
                    className="text-xs text-[#70706B] hover:text-[#1A1A1A] flex items-center space-x-1 cursor-pointer font-medium"
                  >
                    <Lock className="w-3 h-3 text-[#C5A059]" />
                    <span>{sessionStatus === "active" ? "Lock Terminal" : "Unlock Terminal"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                    }}
                    className="px-3 py-1 bg-[#F4F4F1] hover:bg-[#E5E5E1] text-[#1A1A1A] text-xs font-semibold rounded-sm flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3 h-3 text-[#70706B]" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Simplified Navigation */}
        <nav className="flex space-x-2 mt-3 pt-2.5 border-t border-[#F0F0EE] overflow-x-auto">
          {[
            {
              id: "visual",
              label: "Visual Client Intelligence",
              badge: "Visual-First",
            },
            {
              id: "workbench",
              label: "RM Workbench",
            },
            {
              id: "explanations",
              label: "Portfolio Explanations",
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#1A1A1A] text-white font-semibold shadow-xs"
                    : "text-[#70706B] hover:text-[#1A1A1A] hover:bg-[#FDFDFB] font-medium"
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-xs font-bold ${
                      isActive ? "bg-[#C5A059] text-white" : "bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]"
                    }`}
                  >
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
