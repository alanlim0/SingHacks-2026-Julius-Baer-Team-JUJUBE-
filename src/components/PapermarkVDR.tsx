import React, { useState, useMemo } from "react";
import {
  Shield,
  FileText,
  Link as LinkIcon,
  BarChart2,
  Lock,
  Upload,
  Plus,
  Eye,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  Search,
  ExternalLink,
  MessageSquare,
  Clock,
  Sparkles,
  Users,
  Send,
  Download,
  Folder,
  Layers,
  ChevronRight,
  Info,
  Sliders,
  CheckSquare,
  Square,
  Globe,
} from "lucide-react";
import { VDRDataRoom, VDRDocument, VDRFolder, VDRLink, VDRViewerEvent, VDRQnAItem } from "../types";
import {
  getVDRDataRooms,
  createVDRShareLink,
  uploadVDRDocument,
  getDaysUntilExpiration,
  isDocumentExpiringSoon,
} from "../utils/vdrEngine";
import { PapermarkViewerModal } from "./PapermarkViewerModal";

interface PapermarkVDRProps {
  onSelectClient?: (clientId: string) => void;
}

export const PapermarkVDR: React.FC<PapermarkVDRProps> = ({ onSelectClient }) => {
  const dataRooms = useMemo(() => getVDRDataRooms(), []);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(dataRooms[0].id);
  const activeRoom = useMemo(
    () => dataRooms.find((r) => r.id === selectedRoomId) || dataRooms[0],
    [dataRooms, selectedRoomId]
  );

  // Tabs: "folders" | "links" | "analytics" | "qna" | "audit" | "copilot"
  const [activeTab, setActiveTab] = useState<"folders" | "links" | "analytics" | "qna" | "audit" | "copilot">("folders");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Viewer Modal State
  const [viewingDoc, setViewingDoc] = useState<VDRDocument | null>(null);
  const [simulatedViewerEmail, setSimulatedViewerEmail] = useState<string>("alanlimkw@gmail.com");

  // Create Link Modal State
  const [showCreateLinkModal, setShowCreateLinkModal] = useState<boolean>(false);
  const [linkName, setLinkName] = useState<string>("");
  const [linkSlug, setLinkSlug] = useState<string>("");
  const [linkRequireEmail, setLinkRequireEmail] = useState<boolean>(true);
  const [linkRequireNda, setLinkRequireNda] = useState<boolean>(true);
  const [linkWatermark, setLinkWatermark] = useState<boolean>(true);
  const [linkAllowDownload, setLinkAllowDownload] = useState<boolean>(false);
  const [linkPasswordProtected, setLinkPasswordProtected] = useState<boolean>(false);
  const [linkPassword, setLinkPassword] = useState<string>("");
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadFolderId, setUploadFolderId] = useState<string>(activeRoom.folders[0]?.id || "fld-01");
  const [uploadFileType, setUploadFileType] = useState<"pdf" | "xlsx" | "docx">("pdf");
  const [uploadSummary, setUploadSummary] = useState<string>("");

  // Copilot State
  const [copilotQuestion, setCopilotQuestion] = useState<string>("");
  const [copilotHistory, setCopilotHistory] = useState<
    { role: "user" | "assistant"; text: string; citations?: string[]; source?: string }[]
  >([
    {
      role: "assistant",
      text: `Hello, I am your Papermark AI Data Room Copilot. I have indexed all ${activeRoom.totalDocuments} documents in the '${activeRoom.name}'. Ask me anything about Lombard advance rates, mandate exclusions, valuation multiples, or co-investment terms.`,
      citations: ["doc-01", "doc-02"],
      source: "gemini-3.1-flash-lite",
    },
  ]);
  const [isCopilotLoading, setIsCopilotLoading] = useState<boolean>(false);

  // Q&A State
  const [newQuestion, setNewQuestion] = useState<string>("");
  const [replyingQnaId, setReplyingQnaId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");

  // Expiration Filter & Category Filter States
  const [filterExpiringOnly, setFilterExpiringOnly] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Calculated Expiring Documents within 30 days of 2026-09-04
  const expiringDocuments = useMemo(() => {
    return activeRoom.documents
      .map((doc) => {
        const days = getDaysUntilExpiration(doc.expiresAt, "2026-09-04");
        return {
          doc,
          daysRemaining: days,
          isExpiringSoon: days !== null && days <= 30,
        };
      })
      .filter((item) => item.isExpiringSoon)
      .sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999));
  }, [activeRoom.documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return activeRoom.documents.filter((doc) => {
      if (filterExpiringOnly) {
        const days = getDaysUntilExpiration(doc.expiresAt, "2026-09-04");
        if (days === null || days > 30) return false;
      }
      if (categoryFilter !== "all" && doc.docCategory !== categoryFilter) {
        return false;
      }
      if (selectedFolderId !== "all" && doc.folderId !== selectedFolderId) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.fileName.toLowerCase().includes(q) ||
          doc.summary.toLowerCase().includes(q) ||
          (doc.docCategory && doc.docCategory.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [activeRoom.documents, selectedFolderId, searchQuery, filterExpiringOnly, categoryFilter]);

  // Selected document for analytics breakdown
  const [selectedAnalyticsDocId, setSelectedAnalyticsDocId] = useState<string>(activeRoom.documents[0]?.id || "");
  const analyticsDoc = useMemo(
    () => activeRoom.documents.find((d) => d.id === selectedAnalyticsDocId) || activeRoom.documents[0],
    [activeRoom.documents, selectedAnalyticsDocId]
  );

  // Copy Link Handler
  const handleCopyLink = (link: VDRLink) => {
    navigator.clipboard.writeText(link.url);
    setCopiedLinkId(link.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  // Submit New Link
  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkName || !linkSlug) return;
    createVDRShareLink(activeRoom.id, {
      name: linkName,
      slug: linkSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      expiresAt: "2026-10-15",
      requireEmail: linkRequireEmail,
      requireNda: linkRequireNda,
      watermarkEnabled: linkWatermark,
      allowDownload: linkAllowDownload,
      passwordProtected: linkPasswordProtected,
      password: linkPasswordProtected ? linkPassword : undefined,
    });
    setShowCreateLinkModal(false);
    setLinkName("");
    setLinkSlug("");
    setActiveTab("links");
  };

  // Submit Upload Document
  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle) return;
    uploadVDRDocument(activeRoom.id, {
      folderId: uploadFolderId,
      title: uploadTitle,
      fileName: `${uploadTitle.replace(/\s+/g, "_")}.${uploadFileType}`,
      fileType: uploadFileType,
      fileSizeBytes: 3500000,
      pageCount: 3,
      uploadedBy: "Priscilla Ong (Senior RM)",
      watermarkEnabled: true,
      downloadAllowed: false,
      status: "Active",
      summary: uploadSummary || "Confidential documentation uploaded to Papermark Data Room.",
      pages: [
        {
          pageNumber: 1,
          title: "Document Overview",
          content: `BANK JULIUS BÄR — CONFIDENTIAL VDR ARCHIVE\n\nTitle: ${uploadTitle}\nStatus: Approved for client/investor due diligence.\n\nSummary:\n${uploadSummary || "Proprietary financial and governance documentation."}`,
          avgTimeSpentSeconds: 30,
        },
        {
          pageNumber: 2,
          title: "Detailed Terms & Conditions",
          content: "All figures, covenants, and representations herein are subject to Julius Baer Investment Guidelines (2026 Edition).\n\nAccess is restricted under Papermark dynamic watermarking.",
          avgTimeSpentSeconds: 60,
        },
      ],
    });
    setShowUploadModal(false);
    setUploadTitle("");
    setUploadSummary("");
  };

  // Submit Copilot Query
  const handleSendCopilot = async (questionText?: string) => {
    const q = questionText || copilotQuestion;
    if (!q.trim()) return;

    const newHistory = [...copilotHistory, { role: "user" as const, text: q }];
    setCopilotHistory(newHistory);
    setCopilotQuestion("");
    setIsCopilotLoading(true);

    try {
      const res = await fetch("/api/chat-vdr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          roomName: activeRoom.name,
          viewerEmail: simulatedViewerEmail,
          conversationHistory: newHistory.slice(-6),
          documents: activeRoom.documents.map((d) => ({
            id: d.id,
            title: d.title,
            fileName: d.fileName,
            folderId: d.folderId,
            summary: d.summary,
            pages: d.pages.map((p) => ({
              pageNumber: p.pageNumber,
              title: p.title,
              content: p.content,
            })),
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setCopilotHistory([
        ...newHistory,
        {
          role: "assistant",
          text: data.reply,
          citations: data.citations && data.citations.length > 0 ? data.citations : ["doc-01"],
          source: data.source || "gemini-3.1-flash-lite",
        },
      ]);
    } catch (err) {
      console.warn("Papermark VDR copilot error, applying semantic search fallback:", err);
      // Fallback to local semantic scan
      const lower = q.toLowerCase();
      const match = activeRoom.documents.find(
        (d) =>
          d.title.toLowerCase().includes(lower) ||
          d.pages.some((p) => p.content.toLowerCase().includes(lower))
      );

      let answer = "";
      let cites = ["doc-01"];
      if (match) {
        answer = `Found relevant reference in '${match.title}' (${match.id}):\n\n${match.pages[0]?.content.slice(0, 320)}...\n\n[Grounded in Papermark VDR Index]`;
        cites = [match.id];
      } else {
        answer = `Papermark VDR index analyzed across all ${activeRoom.totalDocuments} documents. For specific inquiries, you may ask about Lombard credit triggers (80% margin call), ESG exclusions (RTX defense screens), or Project Meridian valuation ($115M pre-money).`;
      }

      setCopilotHistory([
        ...newHistory,
        {
          role: "assistant",
          text: answer,
          citations: cites,
          source: "semantic_indexer",
        },
      ]);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  // Submit Answer to Q&A
  const handleAnswerQnA = (qnaId: string) => {
    if (!replyText.trim()) return;
    const item = activeRoom.qnaItems.find((q) => q.id === qnaId);
    if (item) {
      item.status = "Answered";
      item.answer = replyText;
      item.answeredBy = "Priscilla Ong (Senior RM)";
      item.answeredAt = "2026-09-04 21:50";
    }
    setReplyingQnaId(null);
    setReplyText("");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Papermark VDR Identity */}
      <div className="bg-white p-6 sm:p-8 rounded-sm border border-[#E5E5E1] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-semibold text-[#C5A059] uppercase tracking-widest mb-1.5">
              <Shield className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Papermark Virtual Data Room (VDR)</span>
              <span className="text-[#70706B]">• Bank Julius Bär Private Banking</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-light text-[#1A1A1A] tracking-tight">
              {activeRoom.name}
            </h2>
            <p className="text-xs sm:text-sm text-[#70706B] mt-1.5 max-w-3xl leading-relaxed">
              Secure document vault powered by Papermark. Protect confidential wealth mandates, credit deeds,
              and private equity term sheets with viewer-specific dynamic watermarking, mandatory NDAs, and page-by-page analytics.
            </p>
          </div>

          {/* Action Buttons: New Link & Upload */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
            <button
              onClick={() => {
                setViewingDoc(activeRoom.documents[0]);
              }}
              className="px-3.5 py-2 rounded-sm text-xs uppercase tracking-wider font-semibold bg-[#FAF7F0] hover:bg-[#F2ECE0] text-[#8C6D23] border border-[#E9DFCB] transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Preview Viewer Experience</span>
            </button>

            <button
              onClick={() => setShowCreateLinkModal(true)}
              className="px-3.5 py-2 rounded-sm text-xs uppercase tracking-wider font-semibold bg-[#1A1A1A] hover:bg-[#333333] text-white transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
            >
              <LinkIcon className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Create Share Link</span>
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3.5 py-2 rounded-sm text-xs uppercase tracking-wider font-semibold bg-white hover:bg-[#FDFDFB] text-[#1A1A1A] border border-[#E5E5E1] transition-colors cursor-pointer flex items-center space-x-1.5 shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-[#70706B]" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* 5 Metric Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-[#F0F0EE]">
          <div className="bg-[#FDFDFB] border border-[#E5E5E1] p-3.5 rounded-sm">
            <span className="text-[10px] uppercase tracking-widest text-[#70706B] block">Indexed Documents</span>
            <span className="text-lg font-light text-[#1A1A1A] mt-0.5 block">
              {activeRoom.totalDocuments} Files
            </span>
            <span className="text-[10px] text-[#70706B]">{activeRoom.totalSizeMb} MB Total Size</span>
          </div>

          <button
            onClick={() => {
              setActiveTab("folders");
              setFilterExpiringOnly((prev) => !prev);
            }}
            className={`text-left p-3.5 rounded-sm border transition-all cursor-pointer shadow-2xs ${
              filterExpiringOnly
                ? "bg-[#92400E] text-white border-[#78350F]"
                : "bg-[#FFFBEB] border-[#FDE68A] hover:bg-[#FEF3C7] text-[#92400E]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase tracking-widest font-bold block ${filterExpiringOnly ? "text-white" : "text-[#92400E]"}`}>
                Expiring (&lt;30 Days)
              </span>
              <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
            </div>
            <span className={`text-lg font-semibold mt-0.5 block ${filterExpiringOnly ? "text-white" : "text-[#92400E]"}`}>
              {expiringDocuments.length} Flagged
            </span>
            <span className={`text-[10px] block truncate ${filterExpiringOnly ? "text-white/80" : "text-[#B45309]"}`}>
              {filterExpiringOnly ? "Active filter applied" : "NDAs, KYC & Valuations"}
            </span>
          </button>

          <div className="bg-[#FDFDFB] border border-[#E5E5E1] p-3.5 rounded-sm">
            <span className="text-[10px] uppercase tracking-widest text-[#70706B] block">Total Views</span>
            <span className="text-lg font-light text-[#1A1A1A] mt-0.5 block">
              {activeRoom.totalViews} Sessions
            </span>
            <span className="text-[10px] text-[#2D8A39] font-medium">100% Watermarked</span>
          </div>

          <div className="bg-[#FDFDFB] border border-[#E5E5E1] p-3.5 rounded-sm">
            <span className="text-[10px] uppercase tracking-widest text-[#70706B] block">Avg Completion</span>
            <span className="text-lg font-light text-[#1A1A1A] mt-0.5 block">
              {activeRoom.avgCompletionPct}%
            </span>
            <span className="text-[10px] text-[#70706B]">Page-by-Page Reading</span>
          </div>

          <div className="bg-[#FDFDFB] border border-[#E5E5E1] p-3.5 rounded-sm col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase tracking-widest text-[#70706B] block">Active Links</span>
            <span className="text-lg font-light text-[#C5A059] mt-0.5 block">
              {activeRoom.links.length} Links
            </span>
            <span className="text-[10px] text-[#70706B]">NDA &amp; Watermark Enforced</span>
          </div>
        </div>

        {/* Clean VDR Navigation Tabs */}
        <div className="flex space-x-1 mt-6 pt-3 border-t border-[#F0F0EE] overflow-x-auto">
          {[
            { id: "folders", label: "Documents & Folders", icon: Folder, count: activeRoom.totalDocuments },
            { id: "links", label: "Secure Share Links", icon: LinkIcon, count: activeRoom.links.length },
            { id: "analytics", label: "Page-by-Page Analytics", icon: BarChart2 },
            { id: "qna", label: "Due Diligence Q&A", icon: MessageSquare, count: activeRoom.qnaItems.length },
            { id: "audit", label: "Audit Trail", icon: Clock },
            { id: "copilot", label: "Papermark AI Copilot", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs uppercase tracking-wider rounded-sm transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[#1A1A1A] text-white font-semibold shadow-xs"
                    : "text-[#70706B] hover:text-[#1A1A1A] hover:bg-[#FDFDFB] font-medium"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#C5A059]" : "text-[#70706B]"}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-xs text-[9px] ${
                      isActive ? "bg-[#333333] text-[#C5A059]" : "bg-[#F4F4F1] text-[#70706B]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.id === "folders" && expiringDocuments.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-xs text-[9px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] flex items-center space-x-0.5">
                    <AlertTriangle className="w-2.5 h-2.5 text-[#B45309]" />
                    <span>{expiringDocuments.length} Expiring</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: Documents & Folders */}
      {activeTab === "folders" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Folder Hierarchy */}
          <div className="lg:col-span-4 bg-white p-5 rounded-sm border border-[#E5E5E1] shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F0EE]">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-[#70706B]">
                Auto-Indexed Folders
              </span>
              <span className="text-xs text-[#70706B] font-mono">{activeRoom.folders.length} Folders</span>
            </div>

            <div className="space-y-1 text-xs">
              {/* Quick Expiring Filter Button in Sidebar */}
              <button
                onClick={() => {
                  setSelectedFolderId("all");
                  setFilterExpiringOnly(true);
                  setCategoryFilter("all");
                }}
                className={`w-full text-left px-3 py-2 rounded-sm transition-colors cursor-pointer flex items-center justify-between ${
                  filterExpiringOnly
                    ? "bg-[#92400E] text-white font-semibold shadow-xs"
                    : "bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Expiring Soon (&lt;30 Days)</span>
                </div>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-xs bg-white/90 text-[#92400E]">
                  {expiringDocuments.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setSelectedFolderId("all");
                  setFilterExpiringOnly(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-sm transition-colors cursor-pointer flex items-center justify-between ${
                  selectedFolderId === "all" && !filterExpiringOnly
                    ? "bg-[#1A1A1A] text-white font-semibold"
                    : "hover:bg-[#FDFDFB] text-[#1A1A1A]"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Indexed Documents</span>
                </div>
                <span className="font-mono text-[11px] opacity-80">{activeRoom.documents.length}</span>
              </button>

              {activeRoom.folders.map((fld) => {
                const isSelected = selectedFolderId === fld.id && !filterExpiringOnly;
                const folderExpiringCount = activeRoom.documents.filter(
                  (d) => d.folderId === fld.id && isDocumentExpiringSoon(d, "2026-09-04", 30)
                ).length;

                return (
                  <button
                    key={fld.id}
                    onClick={() => {
                      setSelectedFolderId(fld.id);
                      setFilterExpiringOnly(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-sm transition-colors cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-[#1A1A1A] text-white font-semibold"
                        : "hover:bg-[#FDFDFB] text-[#1A1A1A]"
                    }`}
                  >
                    <div className="flex items-start space-x-2 truncate">
                      <span className="font-mono text-[10px] text-[#C5A059] mt-0.5">{fld.indexCode}</span>
                      <div className="truncate">
                        <div className="truncate">{fld.name}</div>
                        <div
                          className={`text-[10px] truncate ${
                            isSelected ? "text-white/70" : "text-[#70706B]"
                          }`}
                        >
                          {fld.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                      {folderExpiringCount > 0 && (
                        <span
                          title={`${folderExpiringCount} document(s) expiring within 30 days`}
                          className="px-1.5 py-0.2 rounded-xs text-[9px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]"
                        >
                          {folderExpiringCount} due
                        </span>
                      )}
                      {fld.restricted && (
                        <Lock className={`w-3 h-3 ${isSelected ? "text-[#C5A059]" : "text-[#70706B]"}`} />
                      )}
                      <span className="font-mono text-[10px]">{fld.documentsCount}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Document Table */}
          <div className="lg:col-span-8 bg-white rounded-sm border border-[#E5E5E1] shadow-xs overflow-hidden">
            {/* Expiration Notification Banner */}
            {expiringDocuments.length > 0 && (
              <div className="m-4 p-4 rounded-sm bg-[#FFFBEB] border border-[#FDE68A] text-xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-[#FEF3C7] border border-[#FCD34D] flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-3 h-3 text-[#B45309]" />
                    </div>
                    <span className="font-semibold text-[#92400E]">
                      Compliance Alert: {expiringDocuments.length} Documents Expiring Within 30 Days
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                      Auto-Flagged
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setFilterExpiringOnly(!filterExpiringOnly)}
                      className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold transition-colors cursor-pointer flex items-center space-x-1 ${
                        filterExpiringOnly
                          ? "bg-[#92400E] text-white"
                          : "bg-white text-[#92400E] border border-[#FCD34D] hover:bg-[#FEF3C7]"
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>{filterExpiringOnly ? "Show All Files" : "Filter Expiring Only"}</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-[#B45309]/90 leading-relaxed">
                  Confidential legal and compliance documents (including Bilateral NDAs and Annual KYC Profiles) are nearing expiration. Julius Bär VDR policy requires recertification or renewal before the expiration date to maintain active investor room access.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {expiringDocuments.map(({ doc, daysRemaining }) => {
                    const isCritical = (daysRemaining ?? 30) <= 7;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => setViewingDoc(doc)}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xs text-[10px] border transition-colors cursor-pointer ${
                          isCritical
                            ? "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B] hover:bg-[#FEE2E2]"
                            : "bg-white border-[#FCD34D] text-[#78350F] hover:bg-[#FEF3C7]"
                        }`}
                        title="Click to preview watermarked document"
                      >
                        <span className="font-bold uppercase tracking-wider text-[9px] px-1 py-0.2 bg-black/5 rounded-2xs">
                          {doc.docCategory || "Doc"}
                        </span>
                        <span className="font-medium truncate max-w-[180px]">{doc.title}</span>
                        <span
                          className={`font-mono font-bold px-1 rounded-2xs ${
                            isCritical ? "bg-[#FECACA] text-[#991B1B]" : "bg-[#FEF3C7] text-[#92400E]"
                          }`}
                        >
                          {daysRemaining}d left
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-4 border-b border-[#F0F0EE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
                  {filterExpiringOnly
                    ? "Expiring Documents (<30 Days)"
                    : selectedFolderId === "all"
                    ? "All Indexed Documents"
                    : activeRoom.folders.find((f) => f.id === selectedFolderId)?.name}
                </h3>
                <p className="text-[11px] text-[#70706B] mt-0.5">
                  Click any document to test the Papermark viewer with dynamic forensic watermarking.
                </p>
              </div>

              {/* Filter pills & Search input */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-1 bg-[#F4F4F1] p-0.5 rounded-sm text-[10px]">
                  <button
                    onClick={() => {
                      setFilterExpiringOnly(false);
                      setCategoryFilter("all");
                    }}
                    className={`px-2 py-1 rounded-xs transition-colors cursor-pointer font-medium ${
                      !filterExpiringOnly && categoryFilter === "all"
                        ? "bg-white text-[#1A1A1A] shadow-2xs font-semibold"
                        : "text-[#70706B] hover:text-[#1A1A1A]"
                    }`}
                  >
                    All ({activeRoom.documents.length})
                  </button>
                  <button
                    onClick={() => {
                      setFilterExpiringOnly(true);
                      setCategoryFilter("all");
                    }}
                    className={`px-2 py-1 rounded-xs transition-colors cursor-pointer flex items-center space-x-1 font-medium ${
                      filterExpiringOnly
                        ? "bg-[#92400E] text-white shadow-2xs font-semibold"
                        : "text-[#92400E] hover:bg-[#FEF3C7]"
                    }`}
                  >
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>Expiring ({expiringDocuments.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      setFilterExpiringOnly(false);
                      setCategoryFilter(categoryFilter === "NDA" ? "all" : "NDA");
                    }}
                    className={`px-2 py-1 rounded-xs transition-colors cursor-pointer font-medium ${
                      categoryFilter === "NDA"
                        ? "bg-[#1A1A1A] text-white shadow-2xs font-semibold"
                        : "text-[#70706B] hover:text-[#1A1A1A]"
                    }`}
                  >
                    NDAs
                  </button>
                  <button
                    onClick={() => {
                      setFilterExpiringOnly(false);
                      setCategoryFilter(categoryFilter === "KYC" ? "all" : "KYC");
                    }}
                    className={`px-2 py-1 rounded-xs transition-colors cursor-pointer font-medium ${
                      categoryFilter === "KYC"
                        ? "bg-[#1A1A1A] text-white shadow-2xs font-semibold"
                        : "text-[#70706B] hover:text-[#1A1A1A]"
                    }`}
                  >
                    KYC
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#70706B] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search files in VDR..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm pl-8 pr-3 py-1.5 text-[#1A1A1A] placeholder-[#70706B] focus:outline-none focus:border-[#C5A059] w-40 sm:w-44"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5E1] bg-[#FDFDFB] text-[#70706B] text-[10px] uppercase tracking-widest font-semibold">
                    <th className="py-2.5 px-4">Document Title</th>
                    <th className="py-2.5 px-3">Compliance &amp; Expiry</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Security Policy</th>
                    <th className="py-2.5 px-3 text-right">Views</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EE]">
                  {filteredDocuments.map((doc) => {
                    const daysRemaining = getDaysUntilExpiration(doc.expiresAt, "2026-09-04");
                    const isExpiring = daysRemaining !== null && daysRemaining <= 30;
                    const isCritical = daysRemaining !== null && daysRemaining <= 7;

                    return (
                      <tr key={doc.id} className="hover:bg-[#FDFDFB] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-start space-x-2">
                            <div className="flex-1">
                              <div
                                onClick={() => setViewingDoc(doc)}
                                className="font-medium text-[#1A1A1A] hover:text-[#C5A059] cursor-pointer transition-colors"
                              >
                                {doc.title}
                              </div>
                              <div className="text-[10px] text-[#70706B] font-mono mt-0.5">
                                {doc.fileName} • {(doc.fileSizeBytes / 1e6).toFixed(1)} MB • v{doc.version}
                              </div>

                              {/* Notification badge right under title */}
                              {isExpiring && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-xs text-[10px] font-bold border ${
                                      isCritical
                                        ? "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA] animate-pulse"
                                        : "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]"
                                    }`}
                                  >
                                    <AlertTriangle className={`w-3 h-3 ${isCritical ? "text-[#DC2626]" : "text-[#D97706]"}`} />
                                    <span>
                                      {isCritical ? "Critical: Expires in " : "Expiring Soon: "}
                                      {daysRemaining} days ({doc.expiresAt})
                                    </span>
                                  </span>
                                  {doc.docCategory && (
                                    <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-bold uppercase tracking-wider bg-[#F4F4F1] text-[#70706B] border border-[#E5E5E1]">
                                      {doc.docCategory}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Compliance & Expiry Column */}
                        <td className="py-3 px-3">
                          {doc.expiresAt ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-[#70706B]" />
                                <span className="font-mono text-[11px] text-[#1A1A1A] font-medium">{doc.expiresAt}</span>
                              </div>
                              {isExpiring ? (
                                <span
                                  className={`inline-block text-[9px] font-bold uppercase tracking-wider ${
                                    isCritical ? "text-[#B91C1C]" : "text-[#B45309]"
                                  }`}
                                >
                                  {daysRemaining} days remaining
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#2D8A39] font-medium">Valid</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#70706B] italic">Permanent</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-xs text-[9px] uppercase tracking-wider font-mono font-bold bg-[#F4F4F1] text-[#1A1A1A] border border-[#E5E5E1]">
                            {doc.fileType}
                          </span>
                          <div className="text-[10px] text-[#70706B] font-mono mt-0.5">{doc.pageCount} pgs</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex flex-wrap items-center gap-1">
                            {doc.watermarkEnabled && (
                              <span className="px-1.5 py-0.5 rounded-xs text-[9px] uppercase font-semibold bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]">
                                Watermarked
                              </span>
                            )}
                            {!doc.downloadAllowed && (
                              <span className="px-1.5 py-0.5 rounded-xs text-[9px] uppercase font-semibold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                                No Download
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-medium text-[#1A1A1A]">
                          {doc.viewCount} views
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setViewingDoc(doc)}
                            className="px-2.5 py-1 rounded-sm text-[11px] uppercase tracking-wider font-semibold bg-[#1A1A1A] hover:bg-[#333333] text-white transition-colors cursor-pointer inline-flex items-center space-x-1 shadow-2xs"
                          >
                            <Eye className="w-3 h-3 text-[#C5A059]" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDocuments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#70706B]">
                        No documents match your query or filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Secure Share Links */}
      {activeTab === "links" && (
        <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F0EE]">
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
                Active Papermark Share Links
              </h3>
              <p className="text-xs text-[#70706B] mt-0.5">
                Every link enforces customizable recipient authentication, NDA acceptance, and forensic watermarking.
              </p>
            </div>
            <button
              onClick={() => setShowCreateLinkModal(true)}
              className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white rounded-sm text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Create New Link</span>
            </button>
          </div>

          <div className="space-y-3">
            {activeRoom.links.map((link) => (
              <div
                key={link.id}
                className="p-4 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-[#1A1A1A]">{link.name}</span>
                    <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono bg-[#E6F4EA] text-[#2D8A39] border border-[#CEEAD6] font-semibold uppercase">
                      Active
                    </span>
                  </div>
                  <div className="font-mono text-[#70706B] text-[11px] flex items-center space-x-1">
                    <Globe className="w-3 h-3 text-[#C5A059]" />
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#1A1A1A] hover:underline"
                    >
                      {link.url}
                    </a>
                  </div>
                  {/* Security Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {link.requireEmail && (
                      <span className="px-2 py-0.5 rounded-xs text-[9px] font-semibold bg-white border border-[#E5E5E1] text-[#70706B]">
                        Email Capture
                      </span>
                    )}
                    {link.requireNda && (
                      <span className="px-2 py-0.5 rounded-xs text-[9px] font-semibold bg-[#FAF7F0] border border-[#E9DFCB] text-[#8C6D23]">
                        NDA Gate
                      </span>
                    )}
                    {link.watermarkEnabled && (
                      <span className="px-2 py-0.5 rounded-xs text-[9px] font-semibold bg-[#FAF7F0] border border-[#E9DFCB] text-[#8C6D23]">
                        Forensic Watermark
                      </span>
                    )}
                    {link.passwordProtected && (
                      <span className="px-2 py-0.5 rounded-xs text-[9px] font-semibold bg-white border border-[#E5E5E1] text-[#70706B]">
                        Password: {link.password}
                      </span>
                    )}
                    {!link.allowDownload && (
                      <span className="px-2 py-0.5 rounded-xs text-[9px] font-semibold bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]">
                        No Download
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right text-[11px] text-[#70706B]">
                    <div>
                      Views: <strong className="text-[#1A1A1A]">{link.viewsCount}</strong>
                    </div>
                    <div>Expires: {link.expiresAt || "Never"}</div>
                  </div>

                  <button
                    onClick={() => handleCopyLink(link)}
                    className="px-3 py-1.5 bg-white hover:bg-[#F4F4F1] text-[#1A1A1A] border border-[#E5E5E1] rounded-sm font-semibold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    {copiedLinkId === link.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#2D8A39]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Page-by-Page Viewer Analytics */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Document Selector & Heatmap Header */}
          <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F0EE]">
              <div>
                <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
                  Page-by-Page Reader Engagement
                </h3>
                <p className="text-xs text-[#70706B] mt-0.5">
                  See exactly which pages investors and clients spend the most time reviewing.
                </p>
              </div>

              <select
                aria-label="Select Document for Analytics"
                value={selectedAnalyticsDocId}
                onChange={(e) => setSelectedAnalyticsDocId(e.target.value)}
                className="bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm px-3 py-1.5 text-xs text-[#1A1A1A] font-medium focus:outline-none focus:border-[#C5A059] cursor-pointer"
              >
                {activeRoom.documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} ({d.pageCount} pgs)
                  </option>
                ))}
              </select>
            </div>

            {/* Page Heatmap Distribution Bar Chart */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] uppercase tracking-widest text-[#70706B] font-semibold block">
                Time Spent Per Page Breakdown ({analyticsDoc.title})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {analyticsDoc.pages.map((pg) => {
                  const isPeak = pg.avgTimeSpentSeconds > 100;
                  return (
                    <div
                      key={pg.pageNumber}
                      className={`p-3.5 rounded-sm border ${
                        isPeak
                          ? "bg-[#FAF7F0] border-[#E9DFCB]"
                          : "bg-[#FDFDFB] border-[#E5E5E1]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-[#70706B]">
                        <span className="font-mono font-bold text-[#1A1A1A]">Page {pg.pageNumber}</span>
                        {isPeak && (
                          <span className="text-[9px] font-semibold uppercase text-[#8C6D23] bg-white px-1.5 py-0.5 rounded-xs border border-[#E9DFCB]">
                            High Interest
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-[#1A1A1A] mt-1">
                        {pg.avgTimeSpentSeconds}s avg
                      </div>
                      <div className="text-[10px] text-[#70706B] mt-1 truncate" title={pg.title}>
                        {pg.title}
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="h-1.5 bg-[#E5E5E1] rounded-xs mt-2 overflow-hidden">
                        <div
                          className={`h-full ${isPeak ? "bg-[#C5A059]" : "bg-[#1A1A1A]"}`}
                          style={{ width: `${Math.min((pg.avgTimeSpentSeconds / 180) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Visitor Log Table */}
          <div className="bg-white rounded-sm border border-[#E5E5E1] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#F0F0EE]">
              <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
                Viewer Activity Log &amp; Digital Watermark Signatures
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5E1] bg-[#FDFDFB] text-[#70706B] text-[10px] uppercase tracking-widest font-semibold">
                    <th className="py-2.5 px-4">Viewer Email</th>
                    <th className="py-2.5 px-3">Location &amp; Device</th>
                    <th className="py-2.5 px-3">Document</th>
                    <th className="py-2.5 px-3 text-right">Time Spent</th>
                    <th className="py-2.5 px-3 text-right">Completion</th>
                    <th className="py-2.5 px-4 text-center">NDA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EE]">
                  {activeRoom.viewers.map((v) => (
                    <tr key={v.id} className="hover:bg-[#FDFDFB] transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-[#1A1A1A]">
                        {v.viewerEmail}
                      </td>
                      <td className="py-3 px-3 text-[#70706B]">
                        <div>{v.viewerLocation}</div>
                        <div className="text-[10px] font-mono">{v.viewerIp} • {v.viewerDevice}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-[#1A1A1A] max-w-xs truncate">
                        {v.documentTitle}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#1A1A1A]">
                        {Math.floor(v.durationSeconds / 60)}m {v.durationSeconds % 60}s
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-[#2D8A39]">
                        {v.completionPct}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono uppercase font-bold bg-[#E6F4EA] text-[#2D8A39] border border-[#CEEAD6]">
                          Signed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Due Diligence Q&A */}
      {activeTab === "qna" && (
        <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F0EE]">
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
                Due Diligence Question &amp; Answer Threads
              </h3>
              <p className="text-xs text-[#70706B] mt-0.5">
                Centralized channel for institutional clients, auditors, and investors to request clarification.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {activeRoom.qnaItems.map((qna) => (
              <div key={qna.id} className="p-4 bg-[#FDFDFB] rounded-sm border border-[#E5E5E1] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded-xs text-[9px] uppercase font-semibold tracking-wider ${
                        qna.status === "Answered"
                          ? "bg-[#E6F4EA] text-[#2D8A39] border border-[#CEEAD6]"
                          : "bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]"
                      }`}
                    >
                      {qna.status}
                    </span>
                    <span className="font-mono text-[#70706B]">{qna.askedByEmail}</span>
                    <span className="text-[#70706B]">• {qna.askedAt}</span>
                  </div>
                  {qna.documentTitle && (
                    <span className="text-[10px] text-[#8C6D23] bg-[#FAF7F0] px-2 py-0.5 rounded-xs border border-[#E9DFCB]">
                      Ref: {qna.documentTitle}
                    </span>
                  )}
                </div>

                <p className="text-[#1A1A1A] font-medium leading-relaxed">{qna.question}</p>

                {qna.answer ? (
                  <div className="p-3 bg-white rounded-sm border border-[#E5E5E1] space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#70706B]">
                      <span className="font-semibold text-[#1A1A1A]">Official Response by {qna.answeredBy}</span>
                      <span>{qna.answeredAt}</span>
                    </div>
                    <p className="text-[#1A1A1A] leading-relaxed">{qna.answer}</p>
                  </div>
                ) : replyingQnaId === qna.id ? (
                  <div className="space-y-2 pt-2">
                    <textarea
                      aria-label="Your Answer"
                      rows={2}
                      placeholder="Type official relationship manager reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full bg-white border border-[#E5E5E1] rounded-sm p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAnswerQnA(qna.id)}
                        className="px-3 py-1 bg-[#1A1A1A] text-white text-xs font-semibold rounded-sm cursor-pointer"
                      >
                        Publish Response
                      </button>
                      <button
                        onClick={() => setReplyingQnaId(null)}
                        className="px-3 py-1 bg-white border border-[#E5E5E1] text-[#70706B] text-xs rounded-sm cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyingQnaId(qna.id)}
                    className="text-xs uppercase tracking-wider font-semibold text-[#C5A059] hover:underline cursor-pointer"
                  >
                    + Reply to this Question
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Audit Trail */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-sm border border-[#E5E5E1] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#F0F0EE] flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[#70706B] font-semibold">
                Tamper-Evident VDR Audit Trail
              </h3>
              <p className="text-xs text-[#70706B] mt-0.5">
                Cryptographically logged records of every document access, NDA execution, and permission change.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-sm text-[10px] font-mono bg-[#FAF7F0] text-[#8C6D23] border border-[#E9DFCB]">
              SOC 2 Type II Certified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5E1] bg-[#FDFDFB] text-[#70706B] text-[10px] uppercase tracking-widest font-semibold">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-3">Actor / Email</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-4">Details</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3 text-center">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0EE]">
                {activeRoom.auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FDFDFB] transition-colors">
                    <td className="py-3 px-4 font-mono text-[#70706B]">{log.timestamp}</td>
                    <td className="py-3 px-3 font-medium text-[#1A1A1A]">{log.userOrEmail}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono font-bold bg-[#F4F4F1] text-[#1A1A1A] border border-[#E5E5E1]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#1A1A1A]">{log.details}</td>
                    <td className="py-3 px-3 font-mono text-[#70706B]">{log.ipAddress}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-mono font-semibold bg-[#E6F4EA] text-[#2D8A39]">
                        {log.riskRating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: Papermark AI Copilot */}
      {activeTab === "copilot" && (
        <div className="bg-white p-6 rounded-sm border border-[#E5E5E1] shadow-xs flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EE]">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-sm bg-[#1A1A1A] text-[#C5A059] flex items-center justify-center text-xs font-bold font-mono">
                AI
              </div>
              <div>
                <h3 className="text-xs font-semibold text-[#1A1A1A]">Papermark VDR Intelligence Copilot</h3>
                <span className="text-[10px] text-[#70706B] block">
                  Grounding: All {activeRoom.totalDocuments} indexed files in {activeRoom.name}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-xs text-[10px] font-mono bg-[#E6F4EA] text-[#2D8A39] border border-[#CEEAD6]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A39] animate-pulse" />
                <span>Gemini AI Connected</span>
              </span>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="py-2.5 flex flex-wrap gap-1.5 border-b border-[#F0F0EE]">
            {[
              "What is the Lombard facility margin threshold?",
              "Which defense companies are excluded under ESG policy?",
              "What are the Series B terms for Project Meridian?",
              "Show advance rates for sovereign bonds vs equities",
            ].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendCopilot(prompt)}
                className="text-[10px] bg-[#FDFDFB] hover:bg-[#F4F4F1] text-[#70706B] hover:text-[#1A1A1A] border border-[#E5E5E1] px-2.5 py-1 rounded-sm transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 text-xs">
            {copilotHistory.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-sm p-3.5 text-xs leading-relaxed ${
                      isUser
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#FDFDFB] text-[#1A1A1A] border border-[#E5E5E1]"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <div className="mt-2 pt-2 border-t border-[#E5E5E1]/60 flex flex-wrap items-center justify-between gap-2 text-[9px] text-[#70706B]">
                      {msg.citations && msg.citations.length > 0 ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="uppercase tracking-widest font-semibold">Citations:</span>
                          {msg.citations.map((cId) => {
                            const cDoc = activeRoom.documents.find((d) => d.id === cId);
                            return (
                              <span
                                key={cId}
                                onClick={() => cDoc && setViewingDoc(cDoc)}
                                className="px-1.5 py-0.5 bg-white border border-[#E5E5E1] rounded-xs text-[#8C6D23] hover:underline cursor-pointer"
                              >
                                {cDoc?.title || cId}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <div />
                      )}
                      {msg.source && !isUser && (
                        <span className="font-mono text-[8.5px] text-[#70706B] bg-white border border-[#E5E5E1] px-1.5 py-0.5 rounded-xs">
                          {msg.source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {isCopilotLoading && (
              <div className="flex justify-start">
                <div className="bg-[#FDFDFB] text-[#70706B] border border-[#E5E5E1] rounded-sm p-2.5 text-xs flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-ping" />
                  <span>Searching VDR indexed vector embeddings...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="pt-3 border-t border-[#F0F0EE]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCopilot();
              }}
              className="flex space-x-2"
            >
              <input
                type="text"
                placeholder="Ask any due diligence question across VDR files..."
                value={copilotQuestion}
                onChange={(e) => setCopilotQuestion(e.target.value)}
                className="flex-1 bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm px-3 py-2 text-xs text-[#1A1A1A] placeholder-[#70706B] focus:outline-none focus:border-[#C5A059]"
              />
              <button
                type="submit"
                className="p-2 bg-[#1A1A1A] text-[#C5A059] hover:bg-[#2A2A2A] rounded-sm transition-colors cursor-pointer"
                aria-label="Send Query"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE LINK MODAL */}
      {showCreateLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-md rounded-sm border border-[#E5E5E1] shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F0EE]">
              <h3 className="font-semibold text-sm text-[#1A1A1A]">Create Secure Papermark Link</h3>
              <button
                onClick={() => setShowCreateLinkModal(false)}
                className="text-[#70706B] hover:text-[#1A1A1A] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLink} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#70706B] mb-1">
                  Link Name / Purpose
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Due Diligence Access for Dr. Chen"
                  value={linkName}
                  onChange={(e) => {
                    setLinkName(e.target.value);
                    if (!linkSlug) {
                      setLinkSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                    }
                  }}
                  className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#70706B] mb-1">
                  Custom Slug (URL)
                </label>
                <div className="flex items-center bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm px-2 py-1.5 font-mono text-xs">
                  <span className="text-[#70706B]">papermark.io/d/</span>
                  <input
                    type="text"
                    required
                    value={linkSlug}
                    onChange={(e) => setLinkSlug(e.target.value)}
                    className="flex-1 bg-transparent focus:outline-none text-[#1A1A1A]"
                  />
                </div>
              </div>

              {/* Security Toggles */}
              <div className="space-y-2 pt-2 border-t border-[#F0F0EE]">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkWatermark}
                    onChange={(e) => setLinkWatermark(e.target.checked)}
                  />
                  <span>Enforce Dynamic Forensic Watermark (Email, IP, Date)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkRequireNda}
                    onChange={(e) => setLinkRequireNda(e.target.checked)}
                  />
                  <span>Require Digital NDA Signature Before Access</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkRequireEmail}
                    onChange={(e) => setLinkRequireEmail(e.target.checked)}
                  />
                  <span>Require Email Verification</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkAllowDownload}
                    onChange={(e) => setLinkAllowDownload(e.target.checked)}
                  />
                  <span>Allow PDF Downloads (Leave unchecked for view-only)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkPasswordProtected}
                    onChange={(e) => setLinkPasswordProtected(e.target.checked)}
                  />
                  <span>Protect with Passcode</span>
                </label>

                {linkPasswordProtected && (
                  <input
                    type="text"
                    placeholder="Enter link password..."
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2 text-xs text-[#1A1A1A] mt-1"
                  />
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#F0F0EE]">
                <button
                  type="button"
                  onClick={() => setShowCreateLinkModal(false)}
                  className="px-3 py-1.5 border border-[#E5E5E1] rounded-sm text-[#70706B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white font-semibold rounded-sm cursor-pointer shadow-xs"
                >
                  Create &amp; Copy Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-md rounded-sm border border-[#E5E5E1] shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0F0EE]">
              <h3 className="font-semibold text-sm text-[#1A1A1A]">Upload to Data Room</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-[#70706B] hover:text-[#1A1A1A] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#70706B] mb-1">
                  Target Folder
                </label>
                <select
                  value={uploadFolderId}
                  onChange={(e) => setUploadFolderId(e.target.value)}
                  className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2 text-xs text-[#1A1A1A]"
                >
                  {activeRoom.folders.map((fld) => (
                    <option key={fld.id} value={fld.id}>
                      {fld.indexCode} {fld.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#70706B] mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 2026 Facility Renewal Term Sheet"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2 text-xs text-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#70706B] mb-1">
                  File Format
                </label>
                <div className="flex space-x-2">
                  {(["pdf", "xlsx", "docx"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setUploadFileType(fmt)}
                      className={`flex-1 py-1.5 border rounded-sm text-center uppercase font-mono font-semibold ${
                        uploadFileType === fmt
                          ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                          : "bg-[#FDFDFB] text-[#70706B] border-[#E5E5E1]"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#70706B] mb-1">
                  Executive Summary / Brief Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe the contents of this confidential file..."
                  value={uploadSummary}
                  onChange={(e) => setUploadSummary(e.target.value)}
                  className="w-full bg-[#FDFDFB] border border-[#E5E5E1] rounded-sm p-2 text-xs text-[#1A1A1A]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#F0F0EE]">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 border border-[#E5E5E1] rounded-sm text-[#70706B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1A1A1A] hover:bg-[#333333] text-white font-semibold rounded-sm cursor-pointer shadow-xs"
                >
                  Index &amp; Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN PAPERMARK DOCUMENT VIEWER MODAL */}
      <PapermarkViewerModal
        document={viewingDoc}
        dataRoom={activeRoom}
        onClose={() => setViewingDoc(null)}
        viewerEmail={simulatedViewerEmail}
        viewerIp="192.168.1.104"
      />
    </div>
  );
};
