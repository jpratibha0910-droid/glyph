'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, RotateCcw, Copy, Wand2, Plus, Minus } from 'lucide-react';
import { GlyphData } from '@/lib/types';
import { CHARACTERS } from '@/lib/constants';
import { canvasToFont } from '@/lib/vectorizer';

interface MetricsControlsProps {
  currentChar: string;
  glyph: GlyphData;
  onUpdateGlyph: (glyph: GlyphData) => void;
  onCopyFromChar: (sourceChar: string) => void;
}

export const MetricsControls: React.FC<MetricsControlsProps> = ({
  currentChar,
  glyph,
  onUpdateGlyph,
  onCopyFromChar,
}) => {
  const [copySourceChar, setCopySourceChar] = useState<string>('A');
  const [showCopyModal, setShowCopyModal] = useState<boolean>(false);

  const charDef = CHARACTERS.find((c) => c.char === currentChar);
  const defaultAdvance = charDef?.defaultAdvance ?? 600;
  const defaultLSB = charDef?.defaultLSB ?? 50;

  const handleResetMetrics = () => {
    onUpdateGlyph({
      ...glyph,
      advanceWidth: defaultAdvance,
      leftSideBearing: defaultLSB,
      baselineOffset: 0,
      isModified: true,
    });
  };

  const handleAutoFit = () => {
    const allPoints = (glyph.strokes || []).flatMap((s) => s.points);
    if (allPoints.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    allPoints.forEach((p) => {
      const fontPt = canvasToFont(p.x, p.y, glyph.baselineOffset);
      if (fontPt.x < minX) minX = fontPt.x;
      if (fontPt.x > maxX) maxX = fontPt.x;
    });

    const lsb = Math.max(30, Math.min(100, Math.round(minX)));
    const glyphWidth = Math.max(100, Math.round(maxX - minX));
    const advance = glyphWidth + lsb + 60; // 60 right margin

    onUpdateGlyph({
      ...glyph,
      advanceWidth: Math.max(200, advance),
      leftSideBearing: lsb,
      isModified: true,
    });
  };

  const adjustBaseline = (delta: number) => {
    const nextVal = Math.max(-150, Math.min(150, (glyph.baselineOffset || 0) + delta));
    onUpdateGlyph({ ...glyph, baselineOffset: nextVal, isModified: true });
  };

  const adjustLSB = (delta: number) => {
    const nextVal = Math.max(0, Math.min(250, (glyph.leftSideBearing || 50) + delta));
    onUpdateGlyph({ ...glyph, leftSideBearing: nextVal, isModified: true });
  };

  const adjustAdvance = (delta: number) => {
    const nextVal = Math.max(200, Math.min(1200, (glyph.advanceWidth || 600) + delta));
    onUpdateGlyph({ ...glyph, advanceWidth: nextVal, isModified: true });
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-3 p-3.5 sm:p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl shadow-xl backdrop-blur-sm select-none">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-indigo-400 shrink-0" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Metrics & Spacing • &apos;{currentChar}&apos;
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleAutoFit}
            className="min-h-[34px] flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 transition-colors"
            title="Auto calculate advance width based on strokes"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto Fit</span>
          </button>
          <button
            onClick={() => setShowCopyModal(!showCopyModal)}
            className="min-h-[34px] flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 transition-colors"
            title="Copy strokes from another glyph"
          >
            <Copy className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Clone From...</span>
            <span className="sm:hidden">Clone</span>
          </button>
          <button
            onClick={handleResetMetrics}
            className="min-w-[34px] min-h-[34px] p-2 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-center"
            title="Reset metrics to standard values"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Copy Modal Inline dropdown */}
      {showCopyModal && (
        <div className="mb-3 p-3 bg-zinc-950 border border-indigo-500/30 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-zinc-400">Copy strokes from:</span>
          <select
            value={copySourceChar}
            onChange={(e) => setCopySourceChar(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono"
          >
            {CHARACTERS.map((c) => (
              <option key={c.char} value={c.char}>
                {c.char} ({c.name})
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              onCopyFromChar(copySourceChar);
              setShowCopyModal(false);
            }}
            className="min-h-[36px] px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-xs transition-colors shadow-md shadow-indigo-600/20"
          >
            Apply Clone
          </button>
        </div>
      )}

      {/* Sliders Grid with iPad Stepper Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Baseline Offset */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-400 font-medium">Baseline Offset</span>
            <span className="font-mono text-zinc-300 font-semibold">{glyph.baselineOffset || 0} U</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustBaseline(-5)}
              className="min-w-[28px] min-h-[28px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center"
              title="Nudge down 5 units"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="range"
              min={-150}
              max={150}
              step={5}
              value={glyph.baselineOffset || 0}
              onChange={(e) =>
                onUpdateGlyph({
                  ...glyph,
                  baselineOffset: Number(e.target.value),
                  isModified: true,
                })
              }
              className="w-full accent-amber-400 cursor-pointer h-2 rounded-lg bg-zinc-800"
            />
            <button
              onClick={() => adjustBaseline(5)}
              className="min-w-[28px] min-h-[28px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center"
              title="Nudge up 5 units"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="text-[10px] text-zinc-500">Vertical baseline shift</span>
        </div>

        {/* Left Side-Bearing (LSB) */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-sky-400 font-medium">Left Side-Bearing</span>
            <span className="font-mono text-zinc-300 font-semibold">{glyph.leftSideBearing || 50} U</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustLSB(-5)}
              className="min-w-[28px] min-h-[28px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center"
              title="Nudge left 5 units"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="range"
              min={0}
              max={200}
              step={5}
              value={glyph.leftSideBearing || 50}
              onChange={(e) =>
                onUpdateGlyph({
                  ...glyph,
                  leftSideBearing: Number(e.target.value),
                  isModified: true,
                })
              }
              className="w-full accent-sky-400 cursor-pointer h-2 rounded-lg bg-zinc-800"
            />
            <button
              onClick={() => adjustLSB(5)}
              className="min-w-[28px] min-h-[28px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center"
              title="Nudge right 5 units"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="text-[10px] text-zinc-500">Left margin spacing</span>
        </div>

        {/* Advance Width */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-indigo-400 font-medium">Advance Width</span>
            <span className="font-mono text-zinc-300 font-semibold">{glyph.advanceWidth || 600} U</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustAdvance(-10)}
              className="min-w-[28px] min-h-[28px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center"
              title="Nudge advance down 10 units"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="range"
              min={200}
              max={1200}
              step={10}
              value={glyph.advanceWidth || 600}
              onChange={(e) =>
                onUpdateGlyph({
                  ...glyph,
                  advanceWidth: Number(e.target.value),
                  isModified: true,
                })
              }
              className="w-full accent-indigo-400 cursor-pointer h-2 rounded-lg bg-zinc-800"
            />
            <button
              onClick={() => adjustAdvance(10)}
              className="min-w-[28px] min-h-[28px] rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center"
              title="Nudge advance up 10 units"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <span className="text-[10px] text-zinc-500">Total glyph cell width</span>
        </div>
      </div>
    </div>
  );
};
