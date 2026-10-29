'use client';

import React, { useState } from 'react';
import { X, Settings2, Check } from 'lucide-react';
import { FontMetadata, FontMetrics } from '@/lib/types';

interface FontSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: FontMetadata;
  onSaveMetadata: (newMeta: FontMetadata) => void;
  metrics: FontMetrics;
  onSaveMetrics: (newMetrics: FontMetrics) => void;
}

export const FontSettingsModal: React.FC<FontSettingsModalProps> = ({
  isOpen,
  onClose,
  metadata,
  onSaveMetadata,
  metrics,
  onSaveMetrics,
}) => {
  const [formData, setFormData] = useState<FontMetadata>(metadata);
  const [metricsData, setMetricsData] = useState<FontMetrics>(metrics);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveMetadata(formData);
    onSaveMetrics(metricsData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold">Font Settings & Metadata</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Font Family Name
              </label>
              <input
                type="text"
                required
                value={formData.familyName}
                onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Style / Weight
              </label>
              <input
                type="text"
                value={formData.styleName}
                onChange={(e) => setFormData({ ...formData, styleName: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Designer / Author
              </label>
              <input
                type="text"
                value={formData.designer}
                onChange={(e) => setFormData({ ...formData, designer: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Version String
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Typography Global Metrics */}
          <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2.5">
              OpenType Global Metrics
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[10px] text-zinc-400 mb-0.5">Units Per Em</label>
                <input
                  type="number"
                  value={metricsData.unitsPerEm}
                  disabled
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-400 font-mono text-xs cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-0.5">Ascender</label>
                <input
                  type="number"
                  value={metricsData.ascender}
                  onChange={(e) =>
                    setMetricsData({ ...metricsData, ascender: Number(e.target.value) })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-xs focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 mb-0.5">Descender</label>
                <input
                  type="number"
                  value={metricsData.descender}
                  onChange={(e) =>
                    setMetricsData({ ...metricsData, descender: Number(e.target.value) })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-xs focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-2 flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
