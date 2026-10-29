'use client';

import React, { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { Header } from '@/components/Header';
import { CharacterPicker } from '@/components/CharacterPicker';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import { MetricsControls } from '@/components/MetricsControls';
import { LivePreview } from '@/components/LivePreview';
import { FontSettingsModal } from '@/components/FontSettingsModal';
import { GlyphData, FontMetadata, FontMetrics } from '@/lib/types';
import { CHARACTERS, DEFAULT_METADATA, DEFAULT_METRICS } from '@/lib/constants';
import { generateStarterStrokes } from '@/lib/vectorizer';
import { compileFontToTTFBuffer, registerFontFace } from '@/lib/fontCompiler';
import { PenTool, Type, Grid3X3, Sparkles } from 'lucide-react';

export default function Home() {
  // Glyph Map State
  const [glyphs, setGlyphs] = useState<Record<string, GlyphData>>({});
  const [selectedChar, setSelectedChar] = useState<string>('A');
  const [metadata, setMetadata] = useState<FontMetadata>(DEFAULT_METADATA);
  const [metrics, setMetrics] = useState<FontMetrics>(DEFAULT_METRICS);

  // Compilation & Preview State
  const [ttfBuffer, setTtfBuffer] = useState<ArrayBuffer | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // iPad & Tablet Responsive Panel States
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [previewOpen, setPreviewOpen] = useState<boolean>(true);

  // Mobile / Tablet Tab Switcher (when screen is very narrow)
  const [mobileTab, setMobileTab] = useState<'editor' | 'glyphs' | 'preview'>('editor');

  const compileTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [, startTransition] = useTransition();

  // Initialize all glyphs with starter templates so font is ready immediately
  useEffect(() => {
    const initialMap: Record<string, GlyphData> = {};
    for (const c of CHARACTERS) {
      initialMap[c.char] = {
        char: c.char,
        name: c.name,
        unicode: c.unicode,
        strokes: generateStarterStrokes(c.char),
        advanceWidth: c.defaultAdvance,
        leftSideBearing: c.defaultLSB,
        baselineOffset: 0,
        isModified: false,
      };
    }
    setGlyphs(initialMap);

    // Initial font compile
    try {
      const buffer = compileFontToTTFBuffer(initialMap, DEFAULT_METADATA, DEFAULT_METRICS);
      setTtfBuffer(buffer);
      registerFontFace(buffer, DEFAULT_METADATA.familyName).then((url) => {
        setBlobUrl(url);
      });
    } catch (e) {
      console.error('Initial font compile error:', e);
    }
  }, []);

  // Debounced font compilation whenever glyphs or metadata change
  const triggerRecompile = useCallback(
    (currentGlyphs: Record<string, GlyphData>, currentMeta: FontMetadata, currentMetrics: FontMetrics) => {
      if (compileTimeoutRef.current) {
        clearTimeout(compileTimeoutRef.current);
      }

      compileTimeoutRef.current = setTimeout(() => {
        setIsCompiling(true);
        startTransition(() => {
          try {
            const buffer = compileFontToTTFBuffer(currentGlyphs, currentMeta, currentMetrics);
            setTtfBuffer(buffer);
            registerFontFace(buffer, currentMeta.familyName).then((url) => {
              setBlobUrl(url);
              setIsCompiling(false);
            });
          } catch (err) {
            console.error('Error compiling font:', err);
            setIsCompiling(false);
          }
        });
      }, 180);
    },
    []
  );

  // Update a single glyph
  const handleUpdateGlyph = (updated: GlyphData) => {
    const nextGlyphs = {
      ...glyphs,
      [updated.char]: updated,
    };
    setGlyphs(nextGlyphs);
    triggerRecompile(nextGlyphs, metadata, metrics);
  };

  // Copy strokes and metrics from another character
  const handleCopyFromChar = (sourceChar: string) => {
    const sourceGlyph = glyphs[sourceChar];
    if (!sourceGlyph) return;

    const currentGlyph = glyphs[selectedChar] || {
      char: selectedChar,
      name: selectedChar,
      unicode: selectedChar.charCodeAt(0),
      advanceWidth: 600,
      leftSideBearing: 50,
      baselineOffset: 0,
    };

    const clonedStrokes = (sourceGlyph.strokes || []).map((s) => ({
      ...s,
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      points: s.points.map((p) => ({ ...p })),
    }));

    handleUpdateGlyph({
      ...currentGlyph,
      strokes: clonedStrokes,
      advanceWidth: sourceGlyph.advanceWidth,
      leftSideBearing: sourceGlyph.leftSideBearing,
      baselineOffset: sourceGlyph.baselineOffset,
      isModified: true,
    });
  };

  // Populate/re-populate templates
  const handleLoadTemplates = () => {
    const nextMap: Record<string, GlyphData> = { ...glyphs };
    for (const c of CHARACTERS) {
      if (!nextMap[c.char]?.isModified) {
        nextMap[c.char] = {
          char: c.char,
          name: c.name,
          unicode: c.unicode,
          strokes: generateStarterStrokes(c.char),
          advanceWidth: c.defaultAdvance,
          leftSideBearing: c.defaultLSB,
          baselineOffset: 0,
          isModified: false,
        };
      }
    }
    setGlyphs(nextMap);
    triggerRecompile(nextMap, metadata, metrics);
  };

  // Clear all glyphs
  const handleClearAll = () => {
    if (!window.confirm('Clear all drawn characters and start with a blank font?')) return;
    const nextMap: Record<string, GlyphData> = {};
    for (const c of CHARACTERS) {
      nextMap[c.char] = {
        char: c.char,
        name: c.name,
        unicode: c.unicode,
        strokes: [],
        advanceWidth: c.defaultAdvance,
        leftSideBearing: c.defaultLSB,
        baselineOffset: 0,
        isModified: true,
      };
    }
    setGlyphs(nextMap);
    triggerRecompile(nextMap, metadata, metrics);
  };

  // Active glyph data
  const currentGlyphData: GlyphData = glyphs[selectedChar] || {
    char: selectedChar,
    name: selectedChar,
    unicode: selectedChar.charCodeAt(0),
    strokes: [],
    advanceWidth: 600,
    leftSideBearing: 50,
    baselineOffset: 0,
    isModified: false,
  };

  const modifiedCount = Object.values(glyphs).filter(
    (g) => g.isModified && g.strokes && g.strokes.length > 0
  ).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 select-none">
      {/* Header Bar with Export Dropdowns & Panel Collapsers */}
      <Header
        metadata={metadata}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLoadTemplates={handleLoadTemplates}
        onClearAll={handleClearAll}
        ttfBuffer={ttfBuffer}
        modifiedCount={modifiedCount}
        totalCount={CHARACTERS.length}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((v) => !v)}
      />

      {/* Mobile Tab Navigation (< 1024px) */}
      <div className="lg:hidden flex items-center justify-around border-b border-zinc-800 bg-zinc-900/90 py-1.5 px-3 text-xs">
        <button
          onClick={() => setMobileTab('editor')}
          className={`min-h-[38px] flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl font-medium transition-colors ${
            mobileTab === 'editor' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-zinc-400'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Canvas Studio</span>
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`min-h-[38px] flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl font-medium transition-colors ${
            mobileTab === 'preview' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-zinc-400'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Live Preview</span>
        </button>
        <button
          onClick={() => setMobileTab('glyphs')}
          className={`min-h-[38px] flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl font-medium transition-colors ${
            mobileTab === 'glyphs' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-zinc-400'
          }`}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          <span>Glyphs ({CHARACTERS.length})</span>
        </button>
      </div>

      {/* Main Studio Workspace with Collapsible Drawers */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Character Picker (collapsible on desktop & iPad landscape) */}
        <div
          className={`${
            mobileTab === 'glyphs' ? 'flex' : 'hidden'
          } lg:${
            sidebarOpen ? 'flex' : 'hidden'
          } w-full lg:w-72 xl:w-80 shrink-0 h-full overflow-hidden transition-all duration-200 z-10`}
        >
          <CharacterPicker
            selectedChar={selectedChar}
            onSelectChar={(char) => {
              setSelectedChar(char);
              setMobileTab('editor'); // automatically switch to editor on mobile when char selected
            }}
            glyphs={glyphs}
          />
        </div>

        {/* Center Column: Interactive Canvas & Metrics Adjuster */}
        <div
          className={`${
            mobileTab === 'editor' ? 'flex' : 'hidden'
          } lg:flex flex-1 flex-col h-full overflow-y-auto p-3 sm:p-5 items-center justify-start scrollbar-thin scrollbar-thumb-zinc-800`}
        >
          {/* Character Quick Switcher Carousel for iPad / Touch */}
          <div className="w-full max-w-2xl mb-2 flex items-center gap-1.5 overflow-x-auto py-1.5 px-0.5 scrollbar-thin select-none">
            {CHARACTERS.map((c) => {
              const isSel = c.char === selectedChar;
              const isCustom = glyphs[c.char]?.isModified && glyphs[c.char]?.strokes?.length > 0;
              return (
                <button
                  key={c.char}
                  onClick={() => setSelectedChar(c.char)}
                  className={`min-w-[42px] h-[38px] px-2 rounded-xl border text-sm font-mono flex items-center justify-center shrink-0 relative transition-all ${
                    isSel
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                      : 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800'
                  }`}
                  title={`Select glyph '${c.char}'`}
                >
                  <span>{c.char}</span>
                  {isCustom && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1 right-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Character Title & Quick Info */}
          <div className="w-full max-w-2xl mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white bg-zinc-900 border border-zinc-800 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
                {selectedChar}
              </span>
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">
                  Glyph &apos;{selectedChar}&apos;
                </h2>
                <span className="text-xs font-mono text-zinc-500">
                  U+{selectedChar.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')} •{' '}
                  {currentGlyphData.strokes?.length || 0} contours
                </span>
              </div>
            </div>

            {/* Quick status badge */}
            <div className="flex items-center gap-2">
              {currentGlyphData.isModified ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Custom Vectorized
                </span>
              ) : (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Geometric Template
                </span>
              )}
            </div>
          </div>

          {/* In-Browser Drawing Canvas */}
          <DrawingCanvas
            currentChar={selectedChar}
            glyph={currentGlyphData}
            onUpdateGlyph={handleUpdateGlyph}
          />

          {/* Baseline & Side-Bearings Metric Controls */}
          <MetricsControls
            currentChar={selectedChar}
            glyph={currentGlyphData}
            onUpdateGlyph={handleUpdateGlyph}
            onCopyFromChar={handleCopyFromChar}
          />
        </div>

        {/* Right Column: Real-time Live Preview & Waterfall (collapsible on desktop & iPad landscape) */}
        <div
          className={`${
            mobileTab === 'preview' ? 'flex' : 'hidden'
          } lg:${
            previewOpen ? 'flex' : 'hidden'
          } w-full lg:w-80 xl:w-96 shrink-0 h-full overflow-hidden transition-all duration-200 z-10`}
        >
          <LivePreview
            fontFamilyName={metadata.familyName}
            blobUrl={blobUrl}
            modifiedCount={modifiedCount}
          />
        </div>
      </main>

      {/* Font Settings & Metadata Modal */}
      <FontSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        metadata={metadata}
        onSaveMetadata={(newMeta) => {
          setMetadata(newMeta);
          triggerRecompile(glyphs, newMeta, metrics);
        }}
        metrics={metrics}
        onSaveMetrics={(newMetrics) => {
          setMetrics(newMetrics);
          triggerRecompile(glyphs, metadata, newMetrics);
        }}
      />
    </div>
  );
}
