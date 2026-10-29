'use client';

import React, { useState } from 'react';
import {
  Download,
  Settings,
  Sparkles,
  Trash2,
  FileText,
  FileCode,
  Archive,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FontMetadata } from '@/lib/types';
import { downloadTTF, downloadWOFF2, downloadWebfontZip } from '@/lib/fontCompiler';

interface HeaderProps {
  metadata: FontMetadata;
  onOpenSettings: () => void;
  onLoadTemplates: () => void;
  onClearAll: () => void;
  ttfBuffer: ArrayBuffer | null;
  modifiedCount: number;
  totalCount: number;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  previewOpen?: boolean;
  onTogglePreview?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metadata,
  onOpenSettings,
  onLoadTemplates,
  onClearAll,
  ttfBuffer,
  modifiedCount,
  totalCount,
  sidebarOpen = true,
  onToggleSidebar,
  previewOpen = true,
  onTogglePreview,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const fireCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.2 },
        colors: ['#38bdf8', '#818cf8', '#c084fc', '#34d399', '#f472b6'],
      });
    } catch {
      // ignore if confetti blocked
    }
  };

  const handleDownloadTTF = () => {
    if (!ttfBuffer) return;
    downloadTTF(ttfBuffer, metadata.familyName);
    fireCelebration();
    setDropdownOpen(false);
  };

  const handleDownloadWOFF2 = async () => {
    if (!ttfBuffer) return;
    setIsExporting(true);
    try {
      await downloadWOFF2(ttfBuffer, metadata.familyName);
      fireCelebration();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'WOFF2 download failed';
      alert(msg);
    } finally {
      setIsExporting(false);
      setDropdownOpen(false);
    }
  };

  const handleDownloadZip = async () => {
    if (!ttfBuffer) return;
    setIsExporting(true);
    try {
      await downloadWebfontZip(ttfBuffer, metadata);
      fireCelebration();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webfont package download failed';
      alert(msg);
    } finally {
      setIsExporting(false);
      setDropdownOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
      {/* Brand & Panel Toggles */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Toggle Left Sidebar (Glyphs) button for iPad / Desktop */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`min-w-[38px] min-h-[38px] p-2 rounded-xl border transition-all flex items-center justify-center ${
              sidebarOpen
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
            title={sidebarOpen ? 'Hide Glyph Sidebar' : 'Show Glyph Sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
        )}

        <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-indigo-500/20 text-white font-bold text-base sm:text-lg shrink-0">
          <span className="translate-y-[-1px]">G</span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-100 flex items-center gap-1.5">
              <span>GlyphCraft</span>
              <span className="hidden sm:inline">Studio</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
            </h1>
            <span className="text-zinc-600 hidden sm:inline">•</span>
            <button
              onClick={onOpenSettings}
              className="hidden sm:flex text-xs font-medium text-zinc-400 hover:text-zinc-100 items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-800/60"
              title="Click to edit font family and author metadata"
            >
              <span>{metadata.familyName || 'CustomCraft'}</span>
              <span className="text-zinc-500 text-[10px]">({metadata.styleName})</span>
              <Settings className="w-3 h-3 text-zinc-500" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {modifiedCount} drawn / {totalCount} ready
            </span>
          </div>
        </div>
      </div>

      {/* Actions & Export Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onLoadTemplates}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700/80 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors shadow-sm min-h-[38px]"
          title="Auto-fill missing characters with clean geometric skeleton strokes"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Starter Glyphs</span>
        </button>

        <button
          onClick={onClearAll}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-rose-950/40 hover:border-rose-900 text-zinc-400 hover:text-rose-300 text-xs transition-colors min-h-[38px]"
          title="Clear all drawn strokes"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="min-w-[38px] min-h-[38px] p-2 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center"
          title="Font Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Fullscreen Button for iPad */}
        <button
          onClick={toggleFullscreen}
          className="hidden sm:flex min-w-[38px] min-h-[38px] p-2 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors items-center justify-center"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (iPad Canvas Mode)'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Toggle Right Preview button */}
        {onTogglePreview && (
          <button
            onClick={onTogglePreview}
            className={`min-w-[38px] min-h-[38px] p-2 rounded-xl border transition-all flex items-center justify-center ${
              previewOpen
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
            title={previewOpen ? 'Hide Preview Panel' : 'Show Preview Panel'}
          >
            {previewOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
          </button>
        )}

        {/* Export Split Dropdown */}
        <div className="relative">
          <div className="flex items-center rounded-xl shadow-lg shadow-indigo-500/10 overflow-hidden border border-indigo-600/50 bg-gradient-to-r from-indigo-600 to-violet-600">
            <button
              onClick={handleDownloadTTF}
              disabled={!ttfBuffer || isExporting}
              className="min-h-[38px] flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-white font-medium text-xs hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-50"
              title="Download TrueType Font (.ttf)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Download</span>
              <span>.TTF</span>
            </button>
            <div className="w-[1px] h-6 bg-indigo-500/50" />
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="min-h-[38px] px-2 py-1.5 text-white/90 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
              title="Export Formats & Webfont Kit"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export Dropdown Menu */}
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Export Font Binary
              </div>

              <button
                onClick={handleDownloadTTF}
                disabled={!ttfBuffer}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-xl text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="flex flex-col">
                  <span>TrueType Font (.ttf)</span>
                  <span className="text-[10px] text-zinc-400">Desktop & installable font</span>
                </div>
              </button>

              <button
                onClick={handleDownloadWOFF2}
                disabled={!ttfBuffer || isExporting}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-xl text-xs font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="flex flex-col">
                  <span>Web Open Font (.woff2)</span>
                  <span className="text-[10px] text-zinc-400">Ultra-compressed modern web font</span>
                </div>
              </button>

              <div className="my-1 border-t border-zinc-800" />

              <button
                onClick={handleDownloadZip}
                disabled={!ttfBuffer || isExporting}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-xl text-xs font-medium text-indigo-300 hover:bg-indigo-950/40 hover:text-indigo-200 transition-colors"
              >
                <Archive className="w-4 h-4 text-indigo-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold">Webfont Kit (.zip)</span>
                  <span className="text-[10px] text-zinc-400">TTF + WOFF2 + CSS + HTML demo</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
