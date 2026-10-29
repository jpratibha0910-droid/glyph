'use client';

import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { CHARACTERS, CharDefinition } from '@/lib/constants';
import { GlyphData, CharacterCategory } from '@/lib/types';

interface CharacterPickerProps {
  selectedChar: string;
  onSelectChar: (char: string) => void;
  glyphs: Record<string, GlyphData>;
}

export const CharacterPicker: React.FC<CharacterPickerProps> = ({
  selectedChar,
  onSelectChar,
  glyphs,
}) => {
  const [category, setCategory] = useState<CharacterCategory>('all');
  const [search, setSearch] = useState('');

  const filteredChars = CHARACTERS.filter((item) => {
    if (category !== 'all' && item.category !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.char.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.unicode.toString(16).includes(q)
      );
    }
    return true;
  });

  const currentIndex = CHARACTERS.findIndex((c) => c.char === selectedChar);

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectChar(CHARACTERS[currentIndex - 1].char);
    } else {
      onSelectChar(CHARACTERS[CHARACTERS.length - 1].char);
    }
  };

  const handleNext = () => {
    if (currentIndex < CHARACTERS.length - 1) {
      onSelectChar(CHARACTERS[currentIndex + 1].char);
    } else {
      onSelectChar(CHARACTERS[0].char);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/70 border-r border-zinc-800/80 p-3 select-none">
      {/* Category Tabs */}
      <div className="flex items-center justify-between gap-1 mb-2.5">
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-lg border border-zinc-800 text-[11px] w-full">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'uppercase', label: 'A–Z' },
              { id: 'lowercase', label: 'a–z' },
              { id: 'numbers', label: '0–9' },
              { id: 'punctuation', label: 'Sym' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
              className={`flex-1 py-1 px-1 rounded-md font-medium transition-all text-center ${
                category === tab.id
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Sequential Controls */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search glyph..."
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg pl-8 pr-2 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <button
          onClick={handlePrev}
          title="Previous Glyph (Left Arrow)"
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleNext}
          title="Next Glyph (Right Arrow)"
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Glyphs Grid */}
      <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 gap-1.5 content-start scrollbar-thin scrollbar-thumb-zinc-800">
        {filteredChars.map((item) => {
          const isSelected = item.char === selectedChar;
          const glyphData = glyphs[item.char];
          const hasCustomStrokes = glyphData?.isModified && glyphData?.strokes?.length > 0;
          const hasStrokes = glyphData?.strokes?.length > 0;

          return (
            <button
              key={item.char}
              onClick={() => onSelectChar(item.char)}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center group ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                  : 'border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              {/* Character display */}
              <span className="text-xl font-medium tracking-tight h-7 flex items-center justify-center font-mono">
                {item.char}
              </span>

              {/* Hex / Unicode Subtitle */}
              <span className="text-[9px] font-mono text-zinc-400 group-hover:text-zinc-300 transition-colors">
                U+{item.unicode.toString(16).toUpperCase().padStart(4, '0')}
              </span>

              {/* Status Indicator Dot */}
              <div className="absolute top-1 right-1">
                {hasCustomStrokes ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block" title="Custom Drawn" />
                ) : hasStrokes ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/80 block" title="Template Active" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 block" title="Empty" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
