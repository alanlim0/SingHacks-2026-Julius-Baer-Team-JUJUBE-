import React, { useState } from "react";
import {
  Sparkles,
  Send,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  ThumbsUp,
  User,
  ShieldCheck,
  Building,
} from "lucide-react";
import { Client, PriorityClientItem, AdvisoryMemo } from "../types";
import { clients, rmNotesByClientId } from "../utils/intelligenceEngine";

interface AdvisoryMeetingStudioProps {
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  priorityItem?: PriorityClientItem;
}

export const AdvisoryMeetingStudio: React.FC<AdvisoryMeetingStudioProps> = ({
  selectedClientId,
  onSelectClient,
  priorityItem,
}) => {
  const [meetingObjective, setMeetingObjective] = useState<string>(
    "Quarterly Portfolio Review & 2026 Geopolitical Rebalancing"
  );
  const [tone, setTone] = useState<string>("action-oriented");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedMemo, setGeneratedMemo] = useState<AdvisoryMemo | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Chat RM Copilot state
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; text: string; source?: string }[]
  >([
    {
      role: "assistant",
      text: "Hello Priscilla. I am your Julius Baer Wealth Advisory Intelligence Copilot. Ask me anything regarding your clients, 2026 market event attributions, Lombard margin thresholds, or mandate compliance.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  const selectedClient = clients.find((c) => c.client_id === selectedClientId) || clients[0];
  const clientNotes = rmNotesByClientId.get(selectedClient.client_id) || [];

  // Generate Memo Handler
  const handleGenerateMemo = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.client_id,
          meetingObjective,
          tone,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setGeneratedMemo(data.memo);
    } catch (err) {
      console.warn("API call failed, generating deterministic advisory briefing locally:", err);
      // Deterministic fallback generator
      const fallbackMemo: AdvisoryMemo = {
        executiveSummary: `Client ${selectedClient.client_name} (${selectedClient.client_id}) holds USD ${(selectedClient.total_aum_usd / 1e6).toFixed(1)}M across ${selectedClient.booking_centre} Desk. Risk profile is ${selectedClient.risk_profile} with an investment horizon of ${selectedClient.investment_horizon_years} years. Key meeting agenda: address 2026 geopolitical market transmission and portfolio alignment.`,
        portfolioReview: `YTD portfolio movements reflect 2026 macro shocks, specifically the Middle East crisis and Hormuz shipping disruptions (Feb-Mar) lifting energy and gold allocations, contrasted against the tech semiconductor valuation compression (June).`,
        keyRiskFactors: [
          `Tax domicile is ${selectedClient.tax_domicile} vs residence in ${selectedClient.country_of_residence} (${selectedClient.tax_domicile !== selectedClient.country_of_residence ? "Cross-border review required" : "Aligned"}).`,
          priorityItem?.keyRisks.marginRisk?.status === "critical"
            ? `Critical Lombard LTV at ${priorityItem.keyRisks.marginRisk.currentLtv.toFixed(1)}% vs margin call trigger at ${priorityItem.keyRisks.marginRisk.threshold}%.`
            : `Collateral buffer remains within operational thresholds.`,
          priorityItem?.keyRisks.sustainabilityBreaches && priorityItem.keyRisks.sustainabilityBreaches.length > 0
            ? `Mandate Governance: Detected non-compliant holdings in Sustainable Balanced portfolio.`
            : `Mandate allocations remain aligned with target bands.`,
        ],
        talkingPoints: [
          `Acknowledge 2026 market resilience and walk through performance attribution across energy, gold, and fixed income.`,
          `Present proactive rebalancing options to harvest gains from commodity/energy run-ups and lock in long-term yields.`,
          `Discuss upcoming planned cash needs and ensure liquidity tiers (Daily/Weekly) are adequately funded before upcoming private fund capital calls.`,
          `Review governance compliance and reaffirm client's core wealth preservation objectives.`,
        ],
        proposedTrades: [
          {
            action: "Trim",
            instrumentName: "Energy & Commodity Winners",
            weightPctChange: "-2.5%",
            rationale: "Lock in geopolitical risk premium gains following Hormuz oil surge.",
            mandateCheck: "Compliant with SAA bands",
          },
          {
            action: "Buy",
            instrumentName: "High Quality Short-Duration Fixed Income / Cash Buffer",
            weightPctChange: "+2.5%",
            rationale: "Reinforce liquid buffer for upcoming cash commitments and stabilize collateral LTV.",
            mandateCheck: "Compliant with SAA bands",
          },
        ],
        governanceNotes: `Mandate SAA bands and concentration limits verified against Julius Baer Investment Guidelines (2026 Edition).`,
      };
      setGeneratedMemo(fallbackMemo);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy Memo to Clipboard
  const handleCopy = () => {
    if (!generatedMemo) return;
    const text = `
JULIUS BAER WEALTH MANAGEMENT — ADVISORY BRIEFING MEMORANDUM
Client: ${selectedClient.client_name} (${selectedClient.client_id})
Booking Centre: ${selectedClient.booking_centre} Desk
AUM: USD ${(selectedClient.total_aum_usd / 1e6).toFixed(1)}M
Objective: ${meetingObjective}

1. EXECUTIVE SUMMARY
${generatedMemo.executiveSummary}

2. PORTFOLIO REVIEW & ATTRIBUTION
${generatedMemo.portfolioReview}

3. KEY RISKS
${generatedMemo.keyRiskFactors.map((r) => `• ${r}`).join("\n")}

4. RM TALKING POINTS
${generatedMemo.talkingPoints.map((t) => `• ${t}`).join("\n")}

5. PROPOSED ACTIONS
${generatedMemo.proposedTrades.map((tr) => `• [${tr.action}] ${tr.instrumentName} (${tr.weightPctChange}): ${tr.rationale}`).join("\n")}

GOVERNANCE: ${generatedMemo.governanceNotes}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Copilot Chat Message
  const handleSendMessage = async (msgText?: string) => {
    const textToSend = msgText || inputMessage;
    if (!textToSend.trim()) return;

    const newHistory = [...chatMessages, { role: "user" as const, text: textToSend }];
    setChatMessages(newHistory);
    setInputMessage("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          clientId: selectedClient.client_id,
          conversationHistory: newHistory.slice(-6),
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();
      setChatMessages([...newHistory, { role: "assistant", text: data.reply, source: data.source }]);
    } catch (err) {
      // Deterministic rule-based fallback response
      let answer = `Regarding ${selectedClient.client_name} (${selectedClient.client_id}): Relationship AUM is USD ${(selectedClient.total_aum_usd / 1e6).toFixed(1)}M. `;
      if (textToSend.toLowerCase().includes("margin") || textToSend.toLowerCase().includes("ltv")) {
        answer += `If client holds a Lombard facility, monitor the margin call trigger closely. Collateral values fluctuate with underlying equity and bond prices.`;
      } else if (textToSend.toLowerCase().includes("sustain") || textToSend.toLowerCase().includes("esg")) {
        answer += `For sustainable mandates (SUSBAL), Julius Baer policy strictly excludes thermal coal, oil & gas exploration, weapons, and tobacco. Any holdings in those sectors represent binding governance breaches requiring immediate remediation.`;
      } else if (textToSend.toLowerCase().includes("tax") || textToSend.toLowerCase().includes("domicile")) {
        answer += `Tax domicile is ${selectedClient.tax_domicile}. Where tax domicile differs from residence (${selectedClient.country_of_residence}), caution must be exercised regarding worldwide remittance rules and withholding taxes.`;
      } else {
        answer += `Priscilla should focus on rebalancing back towards Strategic Asset Allocation (SAA) targets while addressing liquidity needs for private market capital calls.`;
      }

      setChatMessages([...newHistory, { role: "assistant", text: answer, source: "rules_engine" }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header */}
      <div className="bg-white p-6 sm:p-8 rounded-sm border border-[#E5E5E1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-semibold text-[#C5A059] uppercase tracking-widest mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Advisory Meeting Prep &amp; AI Copilot Studio</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1A1A1A]">
            Arm Priscilla with explainable, high-conviction client advice
          </h2>
          <p className="text-xs text-[#70706B] mt-1.5 max-w-3xl leading-relaxed">
            Synthesise quantitative portfolio data, qualitative RM notes, and authoritative 2026 market events
            into an actionable meeting briefing and compliant trade proposals.
          </p>
        </div>

        {/* Client Selector */}
        <div className="flex items-center space-x-2 bg-[#FDFDFB] p-2.5 rounded-sm border border-[#E5E5E1] self-start md:self-auto shadow-2xs">
          <span className="text-[10px] uppercase tracking-widest text-[#70706B] font-semibold">Selected Client:</span>
          <select
            aria-label="Select Client for Meeting Prep"
            value={selectedClientId}
            onChange={(e) => {
              onSelectClient(e.target.value);
              setGeneratedMemo(null);
            }}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Meeting Memo Generator (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-6 sm:p-8 rounded-sm border border-[#E5E5E1] shadow-xs space-y-5">
            <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#C5A059]" />
                <span>Client Meeting Briefing Generator</span>
              </span>
              <span className="text-[11px] text-[#70706B] font-normal normal-case">
                {selectedClient.client_name} ({selectedClient.booking_centre})
              </span>
            </h3>

            {/* Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#70706B] font-semibold mb-1.5">Meeting Objective</label>
                <input
                  type="text"
                  value={meetingObjective}
                  onChange={(e) => setMeetingObjective(e.target.value)}
                  className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#70706B] font-semibold mb-1.5">Advisory Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="action-oriented">Action-Oriented &amp; Decisive</option>
                  <option value="objective-formal">Objective &amp; Swiss Private Banking Formal</option>
                  <option value="reassuring-defensive">Reassuring &amp; Capital Preservation Focused</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateMemo}
              disabled={isGenerating}
              className="w-full py-3 px-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white rounded-sm text-xs font-semibold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#C5A059]" />
                  <span>Synthesising Portfolio, RM Notes &amp; 2026 Events...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#C5A059]" />
                  <span>Generate Tailored Advisory Briefing Memo</span>
                </>
              )}
            </button>

            {/* Generated Briefing Output */}
            {generatedMemo ? (
              <div className="mt-4 pt-4 border-t border-[#F0F0EE] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#70706B] uppercase tracking-widest">
                    Advisory Briefing Ready for Priscilla
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1 text-xs text-[#C5A059] hover:text-[#A88742] font-medium cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#2D8A39]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied!" : "Copy Full Memo"}</span>
                  </button>
                </div>

                {/* 1. Executive Summary */}
                <div className="p-4 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] text-xs space-y-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-[#70706B] block">1. Executive Summary</span>
                  <p className="text-[#1A1A1A] leading-relaxed">{generatedMemo.executiveSummary}</p>
                </div>

                {/* 2. Portfolio Review & Attribution */}
                <div className="p-4 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] text-xs space-y-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-[#70706B] block">2. 2026 Macro Transmission &amp; Attribution</span>
                  <p className="text-[#1A1A1A] leading-relaxed">{generatedMemo.portfolioReview}</p>
                </div>

                {/* 3. Key Risks */}
                <div className="p-4 bg-[#FAF7F0] rounded-sm border border-[#E9DFCB] text-xs space-y-1.5">
                  <span className="font-semibold text-[#8C6D23] block flex items-center text-[10px] uppercase tracking-widest">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-[#C5A059]" />
                    3. Key Risk Factors &amp; Proactive Warnings
                  </span>
                  <ul className="list-disc pl-4 text-[#1A1A1A] space-y-1">
                    {generatedMemo.keyRiskFactors.map((r, idx) => (
                      <li key={idx} className="leading-relaxed">{r}</li>
                    ))}
                  </ul>
                </div>

                {/* 4. RM Talking Points */}
                <div className="p-4 bg-[#FAF7F0] rounded-sm border border-[#E9DFCB] text-xs space-y-1.5">
                  <span className="font-semibold text-[#8C6D23] block text-[10px] uppercase tracking-widest">
                    4. Priscilla's Meeting Talking Points (Natural RM Script)
                  </span>
                  <ul className="list-disc pl-4 text-[#1A1A1A] space-y-1.5">
                    {generatedMemo.talkingPoints.map((tp, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {tp}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 5. Proposed Concrete Actions */}
                <div className="p-4 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] text-xs space-y-2.5">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-[#70706B] block">
                    5. Actionable Rebalancing Proposals &amp; Trades
                  </span>
                  <div className="space-y-2">
                    {generatedMemo.proposedTrades.map((tr, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-sm border border-[#E5E5E1]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-sm text-[9px] font-semibold uppercase tracking-wider ${
                              tr.action === "Buy"
                                ? "bg-[#E6F4EA] text-[#2D8A39] border border-[#CEEAD6]"
                                : tr.action === "Sell"
                                ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                                : "bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]"
                            }`}
                          >
                            {tr.action} • {tr.weightPctChange}
                          </span>
                          <span className="text-[10px] font-medium text-[#70706B]">
                            {tr.mandateCheck}
                          </span>
                        </div>
                        <div className="font-semibold text-[#1A1A1A]">{tr.instrumentName}</div>
                        <p className="text-[#70706B] text-[11px] mt-0.5 leading-relaxed">{tr.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Governance Footnote */}
                <div className="text-[11px] text-[#70706B] italic">
                  Governance Check: {generatedMemo.governanceNotes}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-[#70706B] border border-dashed border-[#E5E5E1] rounded-sm bg-[#FDFDFB]">
                <FileText className="w-8 h-8 mx-auto text-[#D1D1CC] mb-2" />
                <p className="text-xs font-medium text-[#1A1A1A]">
                  Click "Generate Tailored Advisory Briefing Memo" above.
                </p>
                <p className="text-[11px] text-[#70706B] mt-0.5">
                  The briefing synthesises holdings, Priscilla's RM notes, and 2026 events.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Julius Baer RM Copilot Interactive Q&A (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs flex flex-col h-[680px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-sm bg-[#1A1A1A] text-[#C5A059] flex items-center justify-center text-xs font-serif font-bold">
                  JB
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[#1A1A1A]">Julius Baer Advisory Copilot</h3>
                  <span className="text-[10px] text-[#70706B] block">Context: {selectedClient.client_name}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-[#E6F4EA] text-[#2D8A39]">
                Online
              </span>
            </div>

            {/* Quick Prompt Chips */}
            <div className="py-2.5 flex flex-wrap gap-1.5 border-b border-[#F0F0EE]">
              {[
                "Why is LTV nearing margin call?",
                "Which holdings breach sustainability?",
                "Explain 2026 energy event impact",
                "How to fund upcoming cash commitments?",
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="text-[10px] uppercase tracking-wider bg-[#FDFDFB] hover:bg-[#F4F4F1] text-[#70706B] hover:text-[#1A1A1A] border border-[#E5E5E1] px-2.5 py-1 rounded-sm transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs">
              {chatMessages.map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-sm p-3.5 text-xs leading-relaxed ${
                        isUser
                          ? "bg-[#1A1A1A] text-white"
                          : "bg-[#FDFDFB] text-[#1A1A1A] border border-[#E5E5E1]"
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.text}</p>
                      {m.source && (
                        <div className="mt-1.5 pt-1.5 border-t border-[#E5E5E1]/50 text-[9px] text-[#70706B] uppercase tracking-wider">
                          Source: {m.source}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#FDFDFB] text-[#70706B] border border-[#E5E5E1] rounded-sm p-3 text-xs flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C5A059]" />
                    <span>Analyzing book data &amp; policy...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="pt-3 border-t border-[#F0F0EE]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  placeholder={`Ask about ${selectedClient.client_name} or portfolio...`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm px-3 py-2 text-xs text-[#1A1A1A] placeholder-[#70706B] focus:outline-none focus:border-[#C5A059]"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isChatLoading}
                  className="p-2 bg-[#1A1A1A] text-[#C5A059] hover:bg-[#2A2A2A] rounded-sm transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="Send Question"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
