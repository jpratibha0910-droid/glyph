'use client';

import React, { useState } from 'react';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize,
  Sparkles,
  Layers,
  Grid,
} from 'lucide-react';
import { SAMPLE_PANGRAMS, CHARACTERS } from '@/lib/constants';

interface LivePreviewProps {
  fontFamilyName: string;
  blobUrl: string | null;
  modifiedCount: number;
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  fontFamilyName,
  blobUrl,
  modifiedCount,
}) => {
  const [activeTab, setActiveTab] = useState<'playground' | 'waterfall' | 'matrix'>('playground');
  const [previewText, setPreviewText] = useState<string>(
    'The quick brown fox jumps over the lazy dog! 0123456789'
  );
  const [fontSize, setFontSize] = useState<number>(36);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [lineHeight, setLineHeight] = useState<number>(1.3);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [theme, setTheme] = useState<'dark' | 'paper' | 'neon' | 'matrix'>('dark');

  const themeStyles = {
    dark: 'bg-zinc-950 text-white border-zinc-800',
    paper: 'bg-[#faf8f5] text-[#1c1917] border-[#e7e5e4]',
    neon: 'bg-[#050510] text-[#38bdf8] border-[#1e1b4b] [text-shadow:0_0_12px_rgba(56,189,248,0.5)]',
    matrix: 'bg-[#050a05] text-[#34d399] border-[#064e3b] [text-shadow:0_0_10px_rgba(52,211,153,0.5)]',
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/70 border-l border-zinc-800/80 p-3 select-none">
      {/* Header and View Tabs */}
      <div className="flex items-center justify-between gap-1 mb-2.5">
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 text-[11px] w-full">
          <button
            onClick={() => setActiveTab('playground')}
            className={`flex-1 py-1 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'playground'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-indigo-400" />
            <span>Playground</span>
          </button>
          <button
            onClick={() => setActiveTab('waterfall')}
            className={`flex-1 py-1 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'waterfall'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Waterfall</span>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex-1 py-1 px-2 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'matrix'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-emerald-400" />
            <span>Specimen</span>
          </button>
        </div>
      </div>

      {/* Pangram Preset Dropdown */}
      {activeTab === 'playground' && (
        <div className="mb-2.5 flex items-center gap-1.5">
          <select
            onChange={(e) => setPreviewText(e.target.value)}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Choose Sample Pangram...</option>
            {SAMPLE_PANGRAMS.map((p, idx) => (
              <option key={idx} value={p.text}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Typography Controls Bar */}
      <div className="mb-2.5 p-2 bg-zinc-900/80 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Font Size */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 text-[10px]">Size:</span>
          <input
            type="range"
            min={16}
            max={96}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-16 accent-indigo-500 cursor-pointer"
          />
          <span className="font-mono text-zinc-300 text-[10px] w-7">{fontSize}px</span>
        </div>

        {/* Letter Spacing */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 text-[10px]">Tracking:</span>
          <input
            type="range"
            min={-3}
            max={14}
            value={letterSpacing}
            onChange={(e) => setLetterSpacing(Number(e.target.value))}
            className="w-14 accent-indigo-500 cursor-pointer"
          />
          <span className="font-mono text-zinc-300 text-[10px] w-6">{letterSpacing}px</span>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => setTextAlign('left')}
            className={`p-1 rounded ${
              textAlign === 'left' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => setTextAlign('center')}
            className={`p-1 rounded ${
              textAlign === 'center' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlignCenter className="w-3 h-3" />
          </button>
          <button
            onClick={() => setTextAlign('right')}
            className={`p-1 rounded ${
              textAlign === 'right' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlignRight className="w-3 h-3" />
          </button>
        </div>

        {/* Themes */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setTheme('dark')}
            className={`w-3.5 h-3.5 rounded-full bg-zinc-950 border ${
              theme === 'dark' ? 'border-indigo-400 scale-110' : 'border-zinc-700'
            }`}
            title="Dark mode"
          />
          <button
            onClick={() => setTheme('paper')}
            className={`w-3.5 h-3.5 rounded-full bg-[#fef9c3] border ${
              theme === 'paper' ? 'border-amber-600 scale-110' : 'border-zinc-400'
            }`}
            title="Paper mode"
          />
          <button
            onClick={() => setTheme('neon')}
            className={`w-3.5 h-3.5 rounded-full bg-[#0369a1] border ${
              theme === 'neon' ? 'border-cyan-400 scale-110' : 'border-zinc-700'
            }`}
            title="Cyberpunk Neon"
          />
          <button
            onClick={() => setTheme('matrix')}
            className={`w-3.5 h-3.5 rounded-full bg-[#065f46] border ${
              theme === 'matrix' ? 'border-emerald-400 scale-110' : 'border-zinc-700'
            }`}
            title="Terminal Emerald"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`flex-1 overflow-y-auto rounded-2xl border p-4 shadow-inner transition-colors ${themeStyles[theme]}`}
      >
        {activeTab === 'playground' && (
          <div className="h-full flex flex-col">
            <textarea
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              spellCheck={false}
              placeholder="Type anything here to test your custom font in real time..."
              style={{
                fontFamily: `'${fontFamilyName}', sans-serif`,
                fontSize: `${fontSize}px`,
                letterSpacing: `${letterSpacing}px`,
                lineHeight: lineHeight,
                textAlign: textAlign,
              }}
              className="w-full flex-1 bg-transparent resize-none border-none outline-none focus:outline-none transition-all placeholder:text-zinc-600"
            />
            <div className="pt-2 border-t border-zinc-800/40 text-[10px] text-zinc-400 flex items-center justify-between font-mono">
              <span>Font: {fontFamilyName}</span>
              <span>Live @font-face Blob active</span>
            </div>
          </div>
        )}

        {activeTab === 'waterfall' && (
          <div
            className="flex flex-col gap-4"
            style={{ fontFamily: `'${fontFamilyName}', sans-serif` }}
          >
            {[72, 54, 40, 28, 20, 15].map((size) => (
              <div key={size} className="border-b border-zinc-800/40 pb-2">
                <span className="text-[10px] font-mono text-zinc-400 block mb-1">
                  {size}px
                </span>
                <p
                  style={{
                    fontSize: `${size}px`,
                    letterSpacing: `${letterSpacing}px`,
                    lineHeight: 1.2,
                  }}
                  className="break-words"
                >
                  {size >= 40
                    ? 'GlyphCraft Studio'
                    : 'The quick brown fox jumps over the lazy dog. 0123456789'}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'matrix' && (
          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              Complete Character Set
            </div>
            <div
              className="grid grid-cols-4 sm:grid-cols-6 gap-2"
              style={{ fontFamily: `'${fontFamilyName}', sans-serif` }}
            >
              {CHARACTERS.map((item) => (
                <div
                  key={item.char}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-black/20 border border-white/5"
                >
                  <span className="text-3xl font-normal mb-1">{item.char}</span>
                  <span className="text-[9px] font-mono opacity-40">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
