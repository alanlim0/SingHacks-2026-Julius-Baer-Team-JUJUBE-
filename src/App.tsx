import React, { useState, useMemo } from "react";
import { Header } from "./components/Header";
import { VisualClientDashboard } from "./components/VisualClientDashboard";
import { RMIntelligenceWorkbench } from "./components/RMIntelligenceWorkbench";
import { IntelligentPortfolioExplanations } from "./components/IntelligentPortfolioExplanations";

import {
  getPriorityRankings,
} from "./utils/intelligenceEngine";

export default function App() {
  const priorityList = useMemo(() => getPriorityRankings(), []);
  const defaultClient = priorityList[0]?.client.client_id || "CL-0002";

  // Visual-first as default: "visual" | "workbench" | "explanations"
  const [activeTab, setActiveTab] = useState<string>("visual");
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClient);

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-[#1A1A1A] flex flex-col font-sans antialiased selection:bg-[#C5A059]/20">
      {/* Julius Baer Global Header */}
      <Header
        priorityList={priorityList}
        selectedClientId={selectedClientId}
        onSelectClient={setSelectedClientId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* VISUAL-FIRST: Visual AUM, Actions Needed, Upselling Opportunities */}
        {activeTab === "visual" && (
          <VisualClientDashboard
            selectedClientId={selectedClientId}
            onSelectClient={handleSelectClient}
          />
        )}

        {/* RM Workbench */}
        {activeTab === "workbench" && (
          <RMIntelligenceWorkbench
            priorityList={priorityList}
            selectedClientId={selectedClientId}
            onSelectClient={handleSelectClient}
          />
        )}

        {/* Intelligent Portfolio Explanations */}
        {activeTab === "explanations" && (
          <IntelligentPortfolioExplanations
            selectedClientId={selectedClientId}
          />
        )}
      </main>

      {/* Clean Calm Executive Footer */}
      <footer className="bg-white border-t border-[#E5E5E1] py-4 px-6 text-center text-[#70706B] text-xs mt-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#1A1A1A] tracking-wider uppercase">JUJUBE OS</span>
            <span className="text-[#70706B]">•</span>
            <span className="text-[#70706B]">Julius Baer Wealth Management</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-[#70706B]">
            <span className="font-medium text-[#1A1A1A]">1. Visual AUM</span>
            <span>•</span>
            <span className="font-medium text-[#1A1A1A]">2. Actions Needed</span>
            <span>•</span>
            <span className="font-medium text-[#1A1A1A]">3. Upselling Opportunities</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
