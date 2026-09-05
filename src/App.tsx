import React, { useState, useMemo } from "react";
import { Header } from "./components/Header";
import { MorningBriefing } from "./components/MorningBriefing";
import { ClientWorkspace } from "./components/ClientWorkspace";
import { LookThroughRadar } from "./components/LookThroughRadar";
import { PapermarkVDR } from "./components/PapermarkVDR";

import {
  getPriorityRankings,
  clients,
  eventLog,
} from "./utils/intelligenceEngine";

export default function App() {
  const priorityList = useMemo(() => getPriorityRankings(), []);
  const defaultClient = priorityList[0]?.client.client_id || "CL-0002";

  // Navigation: "priority" | "client" | "vdr" | "radar"
  const [activeTab, setActiveTab] = useState<string>("priority");
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClient);

  // Active client priority details
  const selectedPriorityItem = useMemo(
    () => priorityList.find((p) => p.client.client_id === selectedClientId),
    [priorityList, selectedClientId]
  );

  // Handler for selecting client & navigating directly into their workspace
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setActiveTab("client");
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
        {activeTab === "priority" && (
          <MorningBriefing
            priorityList={priorityList}
            eventLog={eventLog}
            onSelectClient={handleSelectClient}
            onOpenMeetingPrep={handleSelectClient}
          />
        )}

        {activeTab === "client" && (
          <ClientWorkspace
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
            priorityItem={selectedPriorityItem}
            eventLog={eventLog}
            onOpenVDR={() => setActiveTab("vdr")}
          />
        )}

        {activeTab === "vdr" && (
          <PapermarkVDR onSelectClient={handleSelectClient} />
        )}

        {activeTab === "radar" && (
          <LookThroughRadar onSelectClient={handleSelectClient} />
        )}
      </main>

      {/* Footnote / Regulatory Disclaimer */}
      <footer className="bg-white border-t border-[#E5E5E1] py-4 px-6 text-[#70706B] text-xs mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] uppercase tracking-[0.15em]">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-[#1A1A1A] tracking-tighter">Bank Julius Bär &amp; Co. Ltd.</span>
            <span className="text-[#E5E5E1]">•</span>
            <span>Wealth Intelligence &amp; Papermark VDR</span>
          </div>
          <p className="text-[#70706B]">
            Internal RM Decision Support • RM Priscilla Ong (Asia Desk) • 26 Aug 2026
          </p>
        </div>
      </footer>
    </div>
  );
}

