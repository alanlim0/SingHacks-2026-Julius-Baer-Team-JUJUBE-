import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Shield,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  CheckCircle2,
  Eye,
  AlertCircle,
  AlertTriangle,
  FileText,
  Clock,
} from "lucide-react";
import { VDRDocument, VDRDataRoom } from "../types";
import { getDaysUntilExpiration, isDocumentExpiringSoon } from "../utils/vdrEngine";

interface PapermarkViewerModalProps {
  document: VDRDocument | null;
  dataRoom: VDRDataRoom;
  onClose: () => void;
  viewerEmail?: string;
  viewerIp?: string;
}

export const PapermarkViewerModal: React.FC<PapermarkViewerModalProps> = ({
  document,
  dataRoom,
  onClose,
  viewerEmail = "alanlimkw@gmail.com",
  viewerIp = "192.168.1.104",
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [ndaAccepted, setNdaAccepted] = useState<boolean>(true);
  const [showNdaGate, setShowNdaGate] = useState<boolean>(false);
  const [timeSpent, setTimeSpent] = useState<number>(0);

  useEffect(() => {
    setCurrentPage(1);
    setTimeSpent(0);
  }, [document?.id]);

  // Timer tracking active reading
  useEffect(() => {
    if (!document || showNdaGate) return;
    const timer = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [document, showNdaGate]);

  if (!document) return null;

  const totalPages = document.pages.length || 1;
  const activePageData = document.pages.find((p) => p.pageNumber === currentPage) || document.pages[0];
  const watermarkText = `CONFIDENTIAL • ${viewerEmail} • IP ${viewerIp} • ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;

  // Expiration calculation
  const daysRemaining = document.expiresAt ? getDaysUntilExpiration(document.expiresAt, "2026-09-04") : null;
  const isExpiring = daysRemaining !== null && daysRemaining <= 30;
  const isCritical = daysRemaining !== null && daysRemaining <= 7;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#1A1A1A] w-full max-w-5xl h-[90vh] rounded-sm border border-[#333333] shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Papermark Top Bar */}
        <div className="h-14 px-4 bg-[#111111] border-b border-[#2A2A2A] flex items-center justify-between shrink-0">
          {/* Brand & Document Name */}
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex items-center space-x-1.5 px-2 py-1 rounded-xs bg-[#222222] border border-[#333333] text-[10px] font-mono uppercase tracking-widest text-[#C5A059]">
              <Shield className="w-3 h-3 text-[#C5A059]" />
              <span>Papermark Secure VDR</span>
            </div>
            <span className="text-xs text-[#666666] hidden sm:inline">|</span>
            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-medium text-white truncate max-w-md">
                {document.title}
              </h3>
              <span className="text-[10px] text-[#888888] font-mono hidden sm:inline">
                {document.fileName} • v{document.version}
              </span>
            </div>
          </div>

          {/* Controls: Zoom, Pagination, Download, Close */}
          <div className="flex items-center space-x-2 shrink-0 text-xs">
            {/* Page Counter */}
            <div className="flex items-center space-x-1 bg-[#222222] border border-[#333333] px-2 py-1 rounded-sm text-xs">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="hover:text-[#C5A059] disabled:opacity-30 cursor-pointer p-0.5"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] px-1">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="hover:text-[#C5A059] disabled:opacity-30 cursor-pointer p-0.5"
                aria-label="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom */}
            <div className="hidden sm:flex items-center space-x-1 bg-[#222222] border border-[#333333] px-1.5 py-1 rounded-sm text-xs">
              <button
                onClick={() => setZoom((z) => Math.max(75, z - 10))}
                className="hover:text-white text-[#888888] p-0.5 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[10px] w-8 text-center text-[#AAAAAA]">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(150, z + 10))}
                className="hover:text-white text-[#888888] p-0.5 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Download Button */}
            <button
              disabled={!document.downloadAllowed}
              className={`p-1.5 rounded-sm border transition-colors flex items-center space-x-1 text-xs ${
                document.downloadAllowed
                  ? "bg-[#222222] hover:bg-[#333333] border-[#444444] text-white cursor-pointer"
                  : "bg-[#181818] border-[#2A2A2A] text-[#555555] cursor-not-allowed"
              }`}
              title={document.downloadAllowed ? "Download File" : "Downloads restricted by Data Room Administrator"}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[10px] uppercase font-semibold tracking-wider">
                {document.downloadAllowed ? "Download" : "Restricted"}
              </span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 bg-[#222222] hover:bg-[#B91C1C] border border-[#333333] rounded-sm text-white transition-colors cursor-pointer"
              aria-label="Close Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NDA Gate Screen (if active) */}
        {showNdaGate && !ndaAccepted ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#161616]">
            <div className="max-w-xl w-full bg-[#1F1F1F] border border-[#333333] p-8 rounded-sm shadow-xl space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-sm bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059]">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Non-Disclosure Agreement Required</h3>
                  <p className="text-xs text-[#888888]">Please accept terms to unlock data room documentation</p>
                </div>
              </div>

              <div className="p-4 bg-[#141414] border border-[#2A2A2A] rounded-sm text-xs font-mono text-[#CCCCCC] max-h-48 overflow-y-auto leading-relaxed whitespace-pre-line">
                {dataRoom.ndaText}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[#777777]">Authenticated as: {viewerEmail}</span>
                <button
                  onClick={() => {
                    setNdaAccepted(true);
                    setShowNdaGate(false);
                  }}
                  className="px-4 py-2 bg-[#C5A059] hover:bg-[#D4AF37] text-black font-semibold text-xs rounded-sm transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>I Accept &amp; Enter Data Room</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Document Viewer Canvas with Dynamic Forensic Watermark */
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#181818] flex justify-center items-start relative select-none">
            <div
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
              className="w-full max-w-3xl min-h-[750px] bg-white text-[#1A1A1A] p-8 sm:p-12 rounded-xs shadow-2xl relative transition-transform duration-100 overflow-hidden"
            >
              {/* Dynamic Diagonal Forensic Watermark Overlays */}
              {document.watermarkEnabled && (
                <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden opacity-12 rotate-[-25deg] scale-110">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-widest text-[#991B1B] whitespace-nowrap select-none py-4 text-center"
                    >
                      {watermarkText} • FOR REVIEW ONLY • STRICTLY PROPRIETARY
                    </div>
                  ))}
                </div>
              )}

              {/* Document Expiration Warning Banner */}
              {isExpiring && (
                <div
                  className={`mb-5 p-3.5 rounded-xs border flex items-center justify-between text-xs ${
                    isCritical
                      ? "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
                      : "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${isCritical ? "text-[#DC2626]" : "text-[#D97706]"}`} />
                    <div>
                      <span className="font-bold">
                        {isCritical ? "CRITICAL EXPIRATION WARNING: " : "COMPLIANCE EXPIRATION NOTICE: "}
                      </span>
                      <span>
                        This document expires in <strong>{daysRemaining} days</strong> on <strong>{document.expiresAt}</strong>. Recertification or signed renewal required.
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-2xs text-[10px] font-bold uppercase tracking-wider shrink-0 ml-2 ${
                      isCritical ? "bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]" : "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
                    }`}
                  >
                    {daysRemaining} Days Left
                  </span>
                </div>
              )}

              {/* Document Header */}
              <div className="border-b border-[#E5E5E1] pb-4 mb-6 flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#8C6D23] font-semibold block">
                    BANK JULIUS BÄR — VIRTUAL DATA ROOM VAULT
                  </span>
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#1A1A1A] mt-1">
                    {document.title}
                  </h1>
                  <span className="text-xs text-[#70706B] font-mono mt-0.5 block">
                    Ref: {document.id} • Page {currentPage} of {totalPages}: {activePageData?.title || ""}
                  </span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-xs text-[9px] font-mono uppercase tracking-wider bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] font-bold">
                    CONFIDENTIAL
                  </span>
                </div>
              </div>

              {/* Document Page Body Content */}
              <div className="space-y-4 text-xs sm:text-sm text-[#222222] leading-relaxed min-h-[480px]">
                <div className="p-4 bg-[#FDFDFB] border border-[#E5E5E1] rounded-xs font-medium text-[#1A1A1A]">
                  Section: {activePageData?.title || "Page Content"}
                </div>
                <div className="p-6 bg-white border border-[#E5E5E1] rounded-xs whitespace-pre-line font-serif text-sm leading-relaxed text-[#1A1A1A]">
                  {activePageData?.content || "No page content available."}
                </div>
              </div>

              {/* Document Footer */}
              <div className="mt-8 pt-4 border-t border-[#E5E5E1] flex items-center justify-between text-[10px] text-[#70706B] font-mono">
                <span>Data Room ID: {dataRoom.slug}</span>
                <span>Protected by Papermark AES-256</span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Status Bar */}
        <div className="h-10 px-4 bg-[#111111] border-t border-[#2A2A2A] flex items-center justify-between text-[11px] text-[#888888] font-mono shrink-0">
          <div className="flex items-center space-x-3">
            <span className="flex items-center text-[#2D8A39]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D8A39] mr-1.5 animate-pulse" />
              Live Viewer Session
            </span>
            <span className="text-[#555555]">•</span>
            <span>Viewer: {viewerEmail}</span>
            <span className="text-[#555555] hidden sm:inline">•</span>
            <span className="hidden sm:inline">Active Time: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s</span>
          </div>

          <div className="flex items-center space-x-3">
            {document.watermarkEnabled && (
              <span className="text-[#C5A059] flex items-center text-[10px] uppercase tracking-wider">
                <Shield className="w-3 h-3 mr-1" /> Dynamic Watermark Active
              </span>
            )}
            <button
              onClick={() => setShowNdaGate(!showNdaGate)}
              className="hover:text-white transition-colors cursor-pointer text-[10px] uppercase tracking-wider text-[#666666]"
            >
              NDA Status: {ndaAccepted ? "Signed" : "Pending"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
