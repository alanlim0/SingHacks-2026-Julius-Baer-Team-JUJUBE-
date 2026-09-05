import React, { useState } from "react";
import {
  Zap,
  FileText,
  PhoneCall,
  FileCheck,
  ExternalLink,
  X,
  Check,
  Copy,
  Sparkles,
  Clock,
  Shield,
  Send,
  Download,
  AlertCircle,
} from "lucide-react";
import { Client, RMNote } from "../types";

interface RMQuickActionMenuProps {
  client: Client;
  onLogCall: (note: RMNote) => void;
  onDraftReview: () => void;
}

export const RMQuickActionMenu: React.FC<RMQuickActionMenuProps> = ({
  client,
  onLogCall,
  onDraftReview,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"nda" | "call" | "review" | null>(null);

  // Call log form state
  const [callChannel, setCallChannel] = useState<"Phone Call" | "In-Person Meeting" | "Zoom Briefing" | "Secured Messaging">("Phone Call");
  const [callNote, setCallNote] = useState("");
  const [callSentiment, setCallSentiment] = useState<"Positive" | "Neutral" | "Cautious">("Positive");
  const [callFollowUp, setCallFollowUp] = useState("Send Lombard facility renewal & revised SAA rebalancing proposal");
  const [callSaved, setCallSaved] = useState(false);

  // NDA generator state
  const [ndaLaw, setNdaLaw] = useState<"Singapore Law (SIAC)" | "Swiss Law (Zurich)" | "English Law">("Singapore Law (SIAC)");
  const [ndaDuration, setNdaDuration] = useState("24 Months");
  const [ndaCopied, setNdaCopied] = useState(false);
  const [ndaIndexed, setNdaIndexed] = useState(false);

  // Quick action triggers
  const handleTriggerNDA = () => {
    setActiveModal("nda");
    setIsOpen(false);
  };

  const handleTriggerLogCall = () => {
    setCallNote(
      `Reviewed Q3 allocation for ${client.client_name}. Client affirmed risk appetite for credit facility and requested updated term sheet for private credit syndicate co-investment.`
    );
    setActiveModal("call");
    setIsOpen(false);
  };

  const handleTriggerDraftReview = () => {
    onDraftReview();
    setActiveModal("review");
    setIsOpen(false);
  };

  const submitCallLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callNote.trim()) return;

    const newNote: RMNote = {
      note_id: `note-${Date.now()}`,
      client_id: client.client_id,
      note_date: "2026-09-04",
      rm_id: "RM-0842",
      rm_name: "Priscilla Ong",
      channel: `${callChannel} [${callSentiment}]`,
      note: `${callNote.trim()} | Action Item: ${callFollowUp}`,
    };

    onLogCall(newNote);
    setCallSaved(true);
    setTimeout(() => {
      setCallSaved(false);
      setActiveModal(null);
      setCallNote("");
    }, 1200);
  };

  const generatedNDAText = `
INSTITUTIONAL MUTUAL NON-DISCLOSURE & CONFIDENTIALITY AGREEMENT (VDR-2026-CONF)
Date: 4 September 2026
Governing Law & Jurisdiction: ${ndaLaw}
Confidentiality Period: ${ndaDuration}

BETWEEN:
1. BANQUE JULIUS BAER & CO. LTD., SINGAPORE / ZURICH BRANCH
2. ${client.client_name.toUpperCase()} (Client ID: ${client.client_id}, Domicile: ${client.tax_domicile})

1. PERMITTED PURPOSE:
The Parties intend to disclose Proprietary Information solely for evaluating bilateral private wealth credit arrangements, Lombard facility terms, private market syndications, and due diligence accessed via the Julius Baer Secure Virtual Data Room (VDR).

2. FORENSIC WATERMARKING & ACCESS RESTRICTIONS:
All digital assets provided in the VDR remain subject to dynamic session-specific watermarking (${client.client_id}@juliusbaer.secure). Unauthorized distribution, copying, screen captures, or automated extraction is strictly prohibited.

3. GOVERNING LAW:
This Agreement and any non-contractual obligations arising out of or in connection with it shall be governed by and construed in accordance with ${ndaLaw}.

SIGNED FOR AND ON BEHALF OF:
Banque Julius Baer & Co. Ltd.: Priscilla Ong (Executive Director)
Client Representative: ${client.client_name}
  `.trim();

  const handleCopyNDA = () => {
    navigator.clipboard.writeText(generatedNDAText);
    setNdaCopied(true);
    setTimeout(() => setNdaCopied(false), 2000);
  };

  const handleIndexToVDR = () => {
    setNdaIndexed(true);
    setTimeout(() => {
      setNdaIndexed(false);
      setActiveModal(null);
    }, 1200);
  };

  return (
    <>
      {/* Floating Speed-Dial Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        {/* Expanded Quick Action Menu Popover */}
        {isOpen && (
          <div className="mb-3 w-72 bg-white rounded-md border border-[#E5E5E1] shadow-xl p-2.5 space-y-1 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="px-2.5 py-1.5 border-b border-[#F0F0EE] flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-[#C5A059]" />
                <span className="text-[11px] uppercase tracking-widest font-semibold text-[#1A1A1A]">
                  RM Quick Actions
                </span>
              </div>
              <span className="text-[9px] font-mono text-[#70706B] bg-[#F4F4F1] px-1.5 py-0.5 rounded-xs">
                {client.client_id}
              </span>
            </div>

            <div className="pt-1 space-y-1">
              <button
                onClick={handleTriggerNDA}
                className="w-full text-left px-2.5 py-2 hover:bg-[#FAF7F0] rounded-sm transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-sm bg-[#FAF7F0] group-hover:bg-[#E9DFCB] flex items-center justify-center text-[#8C6D23] transition-colors">
                    <FileCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1A1A1A]">Generate NDA</div>
                    <div className="text-[10px] text-[#70706B]">Bilateral confidentiality terms</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#C5A059] group-hover:translate-x-0.5 transition-transform">
                  1-Click →
                </span>
              </button>

              <button
                onClick={handleTriggerDraftReview}
                className="w-full text-left px-2.5 py-2 hover:bg-[#FAF7F0] rounded-sm transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-sm bg-[#FAF7F0] group-hover:bg-[#E9DFCB] flex items-center justify-center text-[#8C6D23] transition-colors">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1A1A1A]">Draft Portfolio Review</div>
                    <div className="text-[10px] text-[#70706B]">Macro &amp; Lombard briefing memo</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#C5A059] group-hover:translate-x-0.5 transition-transform">
                  1-Click →
                </span>
              </button>

              <button
                onClick={handleTriggerLogCall}
                className="w-full text-left px-2.5 py-2 hover:bg-[#FAF7F0] rounded-sm transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-sm bg-[#FAF7F0] group-hover:bg-[#E9DFCB] flex items-center justify-center text-[#8C6D23] transition-colors">
                    <PhoneCall className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#1A1A1A]">Log Call / Meeting</div>
                    <div className="text-[10px] text-[#70706B]">Record sentiment &amp; actions</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#C5A059] group-hover:translate-x-0.5 transition-transform">
                  1-Click →
                </span>
              </button>
            </div>
          </div>
        )}

        {/* The Trigger Pill Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-11 px-4 rounded-full font-medium text-xs flex items-center space-x-2 shadow-lg transition-all cursor-pointer select-none ${
            isOpen
              ? "bg-[#1A1A1A] text-white ring-2 ring-[#C5A059]"
              : "bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white border border-[#C5A059]/40 hover:border-[#C5A059]"
          }`}
          title="Quick Action Menu for Relationship Managers"
        >
          <div className="w-5 h-5 rounded-full bg-[#C5A059] text-[#1A1A1A] flex items-center justify-center">
            {isOpen ? <X className="w-3 h-3" /> : <Zap className="w-3 h-3 fill-current" />}
          </div>
          <span className="tracking-wide">Quick Action</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A39] animate-pulse"></span>
        </button>
      </div>

      {/* MODAL 1: GENERATE NDA */}
      {activeModal === "nda" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-[#E5E5E1] shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-[#C5A059]" />
                <div>
                  <h3 className="text-sm font-semibold text-[#1A1A1A]">
                    Automated Bilateral NDA Generator
                  </h3>
                  <p className="text-[11px] text-[#70706B]">
                    Instant institutional non-disclosure agreement for {client.client_name} ({client.client_id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#70706B] hover:text-[#1A1A1A] text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* NDA Parameters */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-[#70706B] mb-1">
                  Governing Jurisdiction
                </label>
                <select
                  aria-label="Governing Jurisdiction"
                  value={ndaLaw}
                  onChange={(e) => setNdaLaw(e.target.value as any)}
                  className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="Singapore Law (SIAC)">Singapore Law (SIAC)</option>
                  <option value="Swiss Law (Zurich)">Swiss Law (Zurich)</option>
                  <option value="English Law">English Law</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-[#70706B] mb-1">
                  Confidentiality Term
                </label>
                <select
                  aria-label="Confidentiality Term"
                  value={ndaDuration}
                  onChange={(e) => setNdaDuration(e.target.value)}
                  className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="12 Months">12 Months</option>
                  <option value="24 Months">24 Months (Standard)</option>
                  <option value="36 Months">36 Months</option>
                  <option value="Perpetual">Perpetual (Proprietary IP)</option>
                </select>
              </div>
            </div>

            {/* Generated Document Preview */}
            <div className="p-3 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] text-[11px] font-mono text-[#333333] whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
              {generatedNDAText}
            </div>

            <div className="p-3 bg-[#FAF7F0] rounded-sm border border-[#E9DFCB] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-[#8C6D23]">
                <Shield className="w-4 h-4 shrink-0" />
                <span>Forensic dynamic watermark will be applied upon VDR indexing.</span>
              </div>
              <span className="text-[10px] font-mono text-[#8C6D23] font-bold">SOC 2 / ISO 27001</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleCopyNDA}
                className="px-3 py-1.5 border border-[#E5E5E1] hover:bg-[#F4F4F1] text-[#1A1A1A] text-xs font-semibold rounded-sm flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                {ndaCopied ? <Check className="w-3.5 h-3.5 text-[#2D8A39]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{ndaCopied ? "Copied to Clipboard!" : "Copy Agreement"}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-[#70706B] hover:text-[#1A1A1A] cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleIndexToVDR}
                  disabled={ndaIndexed}
                  className="px-3.5 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white text-xs font-semibold rounded-sm flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {ndaIndexed ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#2D8A39]" />
                      <span>Archived to Client Record</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Save &amp; Archive to Client Record</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG CALL / MEETING */}
      {activeModal === "call" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={submitCallLog}
            className="bg-white rounded-md border border-[#E5E5E1] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
              <div className="flex items-center space-x-2">
                <PhoneCall className="w-5 h-5 text-[#C5A059]" />
                <div>
                  <h3 className="text-sm font-semibold text-[#1A1A1A]">Log Relationship Manager Interaction</h3>
                  <p className="text-[11px] text-[#70706B]">
                    Document client meeting for {client.client_name} ({client.client_id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-[#70706B] hover:text-[#1A1A1A] text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {callSaved && (
              <div className="p-3 bg-[#E6F4EA] border border-[#CEEAD6] text-xs text-[#2D8A39] rounded-sm flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0" />
                <span className="font-semibold">Meeting note logged and synced to audit history!</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-semibold text-[#70706B] mb-1">
                  Interaction Channel
                </label>
                <select
                  aria-label="Interaction Channel"
                  value={callChannel}
                  onChange={(e) => setCallChannel(e.target.value as any)}
                  className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="Phone Call">Phone Call (Secured)</option>
                  <option value="In-Person Meeting">In-Person Meeting</option>
                  <option value="Zoom Briefing">Zoom Briefing</option>
                  <option value="Secured Messaging">Secured Messaging / Chat</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-[#70706B] mb-1">
                  Client Sentiment
                </label>
                <select
                  aria-label="Client Sentiment"
                  value={callSentiment}
                  onChange={(e) => setCallSentiment(e.target.value as any)}
                  className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="Positive">Positive / High Conviction</option>
                  <option value="Neutral">Neutral / Evaluating</option>
                  <option value="Cautious">Cautious / Risk-Averse</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-[#70706B] mb-1">
                Meeting &amp; Advisory Notes
              </label>
              <textarea
                aria-label="Meeting & Advisory Notes"
                rows={3}
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                placeholder="Key discussion points, allocation feedback, Lombard facility requests..."
                className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-[#70706B] mb-1">
                Follow-Up Action Item
              </label>
              <input
                aria-label="Follow-Up Action Item"
                type="text"
                value={callFollowUp}
                onChange={(e) => setCallFollowUp(e.target.value)}
                className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#F0F0EE]">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 text-xs text-[#70706B] hover:text-[#1A1A1A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white text-xs font-semibold rounded-sm flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Save to Client Record</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: REVIEW CONFIRMATION TOAST */}
      {activeModal === "review" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md border border-[#E5E5E1] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-sm bg-[#FAF7F0] border border-[#E9DFCB] flex items-center justify-center text-[#8C6D23]">
                <Sparkles className="w-5 h-5 text-[#C5A059]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Advisory Review Generated</h3>
                <p className="text-xs text-[#70706B]">
                  Workspace switched to the Advisory Briefing tab with full portfolio attribution &amp; trade rationales.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] text-xs space-y-1">
              <div className="flex justify-between font-mono text-[10px] text-[#70706B]">
                <span>Client AUM</span>
                <span className="font-semibold text-[#1A1A1A]">USD ${(client.total_aum_usd / 1e6).toFixed(1)}M</span>
              </div>
              <div className="flex justify-between font-mono text-[10px] text-[#70706B]">
                <span>Mandate</span>
                <span className="font-semibold text-[#1A1A1A]">{client.risk_profile}</span>
              </div>
              <div className="flex justify-between font-mono text-[10px] text-[#70706B]">
                <span>Booking Centre</span>
                <span className="font-semibold text-[#1A1A1A]">{client.booking_centre}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-[#1A1A1A] text-white text-xs font-semibold rounded-sm cursor-pointer hover:bg-[#333333]"
              >
                View Briefing Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
