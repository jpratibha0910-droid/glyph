'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Paintbrush,
  PenTool,
  Minus,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Eye,
  Grid,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { Point, Stroke, DrawingTool, GlyphData } from '@/lib/types';
import {
  CANVAS_SIZE,
  CANVAS_LEFT_MARGIN,
  CANVAS_BASELINE_Y,
  CANVAS_ASCENDER_Y,
  CANVAS_CAP_HEIGHT_Y,
  CANVAS_X_HEIGHT_Y,
  CANVAS_DESCENDER_Y,
  FONT_SCALE,
} from '@/lib/constants';
import { strokeToContour, canvasToFont } from '@/lib/vectorizer';

interface DrawingCanvasProps {
  currentChar: string;
  glyph: GlyphData;
  onUpdateGlyph: (glyph: GlyphData) => void;
  onCopyFromChar?: (sourceChar: string) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  currentChar,
  glyph,
  onUpdateGlyph,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Drawing state
  const [currentTool, setCurrentTool] = useState<DrawingTool>('brush');
  const [strokeWidth, setStrokeWidth] = useState<number>(24);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activePoints, setActivePoints] = useState<Point[]>([]);

  // iPad & Stylus Optimizations
  const [usePressure, setUsePressure] = useState<boolean>(true);
  const [pencilOnlyMode, setPencilOnlyMode] = useState<boolean>(false);
  const [isPencilDetected, setIsPencilDetected] = useState<boolean>(false);
  const [gestureToast, setGestureToast] = useState<string | null>(null);

  // Zoom / View scale
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Canvas View options
  const [showGrid, setShowGrid] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [showBeziers, setShowBeziers] = useState(true);
  const [showGhost, setShowGhost] = useState(true);
  const [ghostOpacity, setGhostOpacity] = useState(0.15);

  // Guideline Dragging state
  type DragTarget = 'baseline' | 'lsb' | 'advance' | null;
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [hoverTarget, setHoverTarget] = useState<DragTarget>(null);

  // Multi-touch tracking for 2-finger Undo / 3-finger Redo (Procreate gesture)
  const touchStartTimesRef = useRef<{ count: number; time: number; moved: boolean }>({
    count: 0,
    time: 0,
    moved: false,
  });

  // Undo / Redo history
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Sync with glyph updates
  useEffect(() => {
    setHistory([glyph.strokes || []]);
    setHistoryIndex(0);
  }, [currentChar]);

  const showNotification = (msg: string) => {
    setGestureToast(msg);
    setTimeout(() => {
      setGestureToast((prev) => (prev === msg ? null : prev));
    }, 1200);
  };

  const pushHistory = (newStrokes: Stroke[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newStrokes);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    onUpdateGlyph({
      ...glyph,
      strokes: newStrokes,
      isModified: true,
    });
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateGlyph({
        ...glyph,
        strokes: prev,
        isModified: true,
      });
      showNotification('↺ Undo');
    }
  }, [historyIndex, history, glyph, onUpdateGlyph]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateGlyph({
        ...glyph,
        strokes: next,
        isModified: true,
      });
      showNotification('↻ Redo');
    }
  }, [historyIndex, history, glyph, onUpdateGlyph]);

  const handleClear = () => {
    pushHistory([]);
    showNotification('🗑 Cleared Glyph');
  };

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Derived metrics positions in canvas pixels
  const baselineY = CANVAS_BASELINE_Y - (glyph.baselineOffset || 0) * FONT_SCALE;
  const lsbX = CANVAS_LEFT_MARGIN + (glyph.leftSideBearing || 50) * FONT_SCALE;
  const advanceX = CANVAS_LEFT_MARGIN + (glyph.advanceWidth || 600) * FONT_SCALE;

  // Render canvas loop
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 1. Grid lines
    if (showGrid) {
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x <= CANVAS_SIZE; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_SIZE);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_SIZE; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_SIZE, y);
        ctx.stroke();
      }
    }

    // 2. Ghost template character for guidance
    if (showGhost && ghostOpacity > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${ghostOpacity})`;
      ctx.font = '360px "Inter", "Geist", "Arial", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(currentChar, lsbX + 20, baselineY);
      ctx.restore();
    }

    // 3. Typographic guideline visuals with Touch Grab Handles
    if (showGuides) {
      // Ascender line
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_ASCENDER_Y);
      ctx.lineTo(CANVAS_SIZE, CANVAS_ASCENDER_Y);
      ctx.stroke();

      // Cap-Height line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_CAP_HEIGHT_Y);
      ctx.lineTo(CANVAS_SIZE, CANVAS_CAP_HEIGHT_Y);
      ctx.stroke();

      // X-Height line
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_X_HEIGHT_Y);
      ctx.lineTo(CANVAS_SIZE, CANVAS_X_HEIGHT_Y);
      ctx.stroke();

      // Descender line
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_DESCENDER_Y);
      ctx.lineTo(CANVAS_SIZE, CANVAS_DESCENDER_Y);
      ctx.stroke();

      // Left Sidebearing (LSB) vertical guide
      ctx.setLineDash([]);
      ctx.lineWidth = hoverTarget === 'lsb' ? 3 : 1.5;
      ctx.strokeStyle = hoverTarget === 'lsb' ? '#38bdf8' : 'rgba(56, 189, 248, 0.6)';
      ctx.beginPath();
      ctx.moveTo(lsbX, 0);
      ctx.lineTo(lsbX, CANVAS_SIZE);
      ctx.stroke();

      // Touch Grab Handle for LSB (at top)
      ctx.fillStyle = hoverTarget === 'lsb' ? '#0284c7' : 'rgba(14, 165, 233, 0.85)';
      ctx.beginPath();
      ctx.roundRect(lsbX - 28, 4, 56, 22, 6);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`↔ LSB ${glyph.leftSideBearing || 50}`, lsbX, 18);

      // Right Sidebearing / Advance Width vertical guide
      ctx.lineWidth = hoverTarget === 'advance' ? 3 : 1.5;
      ctx.strokeStyle = hoverTarget === 'advance' ? '#818cf8' : 'rgba(129, 140, 248, 0.6)';
      ctx.beginPath();
      ctx.moveTo(advanceX, 0);
      ctx.lineTo(advanceX, CANVAS_SIZE);
      ctx.stroke();

      // Touch Grab Handle for Advance Width (at top)
      ctx.fillStyle = hoverTarget === 'advance' ? '#4f46e5' : 'rgba(99, 102, 241, 0.85)';
      ctx.beginPath();
      ctx.roundRect(advanceX - 32, 4, 64, 22, 6);
      ctx.fill();
      ctx.strokeStyle = '#818cf8';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`↔ ADV ${glyph.advanceWidth || 600}`, advanceX, 18);

      // Baseline (solid line with grab pill)
      ctx.lineWidth = hoverTarget === 'baseline' ? 3 : 1.5;
      ctx.strokeStyle = hoverTarget === 'baseline' ? '#fbbf24' : 'rgba(251, 191, 36, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, baselineY);
      ctx.lineTo(CANVAS_SIZE, baselineY);
      ctx.stroke();

      // Touch Grab Handle for Baseline (on right edge)
      ctx.fillStyle = hoverTarget === 'baseline' ? '#d97706' : 'rgba(245, 158, 11, 0.85)';
      ctx.beginPath();
      ctx.roundRect(CANVAS_SIZE - 92, baselineY - 12, 88, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`↕ BASE ${glyph.baselineOffset || 0}`, CANVAS_SIZE - 48, baselineY + 4);

      // Guide Labels
      ctx.textAlign = 'left';
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(52, 211, 153, 0.7)';
      ctx.fillText('Ascender (800)', 8, CANVAS_ASCENDER_Y - 4);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.fillText('Cap Height (700)', 8, CANVAS_CAP_HEIGHT_Y - 4);

      ctx.fillStyle = 'rgba(192, 132, 252, 0.7)';
      ctx.fillText('x-Height (500)', 8, CANVAS_X_HEIGHT_Y - 4);

      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`Baseline (${glyph.baselineOffset || 0})`, 8, baselineY - 4);

      ctx.fillStyle = 'rgba(251, 113, 133, 0.7)';
      ctx.fillText('Descender (-200)', 8, CANVAS_DESCENDER_Y + 12);
    }

    // 4. Render committed strokes & vectorized bezier curves
    const allStrokes = [...(glyph.strokes || [])];
    if (activePoints.length > 0) {
      allStrokes.push({
        id: 'active',
        points: activePoints,
        width: strokeWidth,
        tool: currentTool,
        usePressure: usePressure,
      });
    }

    for (const stroke of allStrokes) {
      if (!stroke.points || stroke.points.length === 0) continue;
      const contour = strokeToContour(stroke);

      // Render filled shape
      ctx.beginPath();
      for (const cmd of contour.commands) {
        if (cmd.type === 'M' && cmd.x !== undefined && cmd.y !== undefined) {
          ctx.moveTo(cmd.x, cmd.y);
        } else if (cmd.type === 'L' && cmd.x !== undefined && cmd.y !== undefined) {
          ctx.lineTo(cmd.x, cmd.y);
        } else if (
          cmd.type === 'C' &&
          cmd.x !== undefined &&
          cmd.y !== undefined &&
          cmd.x1 !== undefined &&
          cmd.y1 !== undefined &&
          cmd.x2 !== undefined &&
          cmd.y2 !== undefined
        ) {
          ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        } else if (
          cmd.type === 'Q' &&
          cmd.x !== undefined &&
          cmd.y !== undefined &&
          cmd.x1 !== undefined &&
          cmd.y1 !== undefined
        ) {
          ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
        } else if (cmd.type === 'Z') {
          ctx.closePath();
        }
      }

      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // 5. Bezier Curve Inspector Overlay (anchor points and handles)
      if (showBeziers) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw bezier control handles and anchors
        for (const cmd of contour.commands) {
          if (cmd.type === 'C') {
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(cmd.x1!, cmd.y1!, 2, 0, Math.PI * 2);
            ctx.arc(cmd.x2!, cmd.y2!, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#34d399';
            ctx.fillRect(cmd.x! - 2.5, cmd.y! - 2.5, 5, 5);
          } else if (cmd.type === 'M' || cmd.type === 'L') {
            ctx.fillStyle = '#34d399';
            ctx.fillRect(cmd.x! - 2.5, cmd.y! - 2.5, 5, 5);
          }
        }
      }
    }
  }, [
    glyph,
    activePoints,
    currentTool,
    strokeWidth,
    usePressure,
    showGrid,
    showGuides,
    showBeziers,
    showGhost,
    ghostOpacity,
    hoverTarget,
    currentChar,
    baselineY,
    lsbX,
    advanceX,
  ]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Pointer position helper
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Guideline proximity detector with generous touch tolerance
  const detectGuideHover = (x: number, y: number, isTouch: boolean): DragTarget => {
    const threshold = isTouch ? 28 : 14;
    // Check handles first
    if (Math.abs(y - baselineY) < threshold) return 'baseline';
    if (Math.abs(x - lsbX) < threshold) return 'lsb';
    if (Math.abs(x - advanceX) < threshold) return 'advance';
    return null;
  };

  // Multi-Touch Handlers for iPad (2-finger tap = Undo, 3-finger tap = Redo)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touchCount = e.touches.length;
    touchStartTimesRef.current = {
      count: touchCount,
      time: Date.now(),
      moved: false,
    };
  };

  const handleTouchMove = () => {
    touchStartTimesRef.current.moved = true;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const { count, time, moved } = touchStartTimesRef.current;
    const duration = Date.now() - time;

    // Detect quick stationary multi-finger tap (< 350ms)
    if (!moved && duration < 350) {
      if (count === 2) {
        e.preventDefault();
        handleUndo();
      } else if (count === 3) {
        e.preventDefault();
        handleRedo();
      }
    }
  };

  // Pointer Events
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Detect Apple Pencil
    if (e.pointerType === 'pen') {
      setIsPencilDetected(true);
    }

    // Palm rejection: If pencil-only mode is active, reject finger touches
    if (pencilOnlyMode && e.pointerType === 'touch') {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasCoords(e);

    // Check if dragging guideline
    const isTouch = e.pointerType === 'touch';
    const guideHit = detectGuideHover(x, y, isTouch);
    if (guideHit) {
      setDragTarget(guideHit);
      return;
    }

    if (currentTool === 'eraser') {
      // Erase strokes near click
      const remainingStrokes = (glyph.strokes || []).filter((s) => {
        return !s.points.some((p) => Math.hypot(p.x - x, p.y - y) < strokeWidth);
      });
      if (remainingStrokes.length !== (glyph.strokes || []).length) {
        pushHistory(remainingStrokes);
      }
      return;
    }

    setIsDrawing(true);
    // Real analog pressure from Apple Pencil (defaults to 1 for mouse)
    const rawPressure = e.pointerType === 'pen' ? (e.pressure > 0 ? e.pressure : 0.5) : 0.7;
    setActivePoints([{ x, y, pressure: rawPressure }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pencilOnlyMode && e.pointerType === 'touch') return;

    const { x, y } = getCanvasCoords(e);

    // Update hover target for cursor change
    if (!isDrawing && !dragTarget) {
      const isTouch = e.pointerType === 'touch';
      const hit = detectGuideHover(x, y, isTouch);
      setHoverTarget(hit);
    }

    // Handle Guideline Dragging
    if (dragTarget) {
      if (dragTarget === 'baseline') {
        const offset = Math.round((CANVAS_BASELINE_Y - y) / FONT_SCALE);
        onUpdateGlyph({ ...glyph, baselineOffset: offset, isModified: true });
      } else if (dragTarget === 'lsb') {
        const newLSB = Math.max(0, Math.round((x - CANVAS_LEFT_MARGIN) / FONT_SCALE));
        onUpdateGlyph({ ...glyph, leftSideBearing: newLSB, isModified: true });
      } else if (dragTarget === 'advance') {
        const newAdvance = Math.max(150, Math.round((x - CANVAS_LEFT_MARGIN) / FONT_SCALE));
        onUpdateGlyph({ ...glyph, advanceWidth: newAdvance, isModified: true });
      }
      return;
    }

    // Handle Active Drawing
    if (isDrawing) {
      const rawPressure = e.pointerType === 'pen' ? (e.pressure > 0 ? e.pressure : 0.5) : 0.7;
      if (currentTool === 'line') {
        if (activePoints.length > 0) {
          setActivePoints([activePoints[0], { x, y, pressure: rawPressure }]);
        }
      } else {
        setActivePoints((prev) => [...prev, { x, y, pressure: rawPressure }]);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragTarget) {
      setDragTarget(null);
      return;
    }

    if (isDrawing && activePoints.length > 0) {
      setIsDrawing(false);
      const newStroke: Stroke = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        points: activePoints,
        width: strokeWidth,
        tool: currentTool,
        usePressure: usePressure,
      };
      const updated = [...(glyph.strokes || []), newStroke];
      pushHistory(updated);
      setActivePoints([]);
    }
  };

  const getCursorClass = () => {
    if (dragTarget === 'baseline' || hoverTarget === 'baseline') return 'cursor-ns-resize';
    if (
      dragTarget === 'lsb' ||
      hoverTarget === 'lsb' ||
      dragTarget === 'advance' ||
      hoverTarget === 'advance'
    )
      return 'cursor-ew-resize';
    if (currentTool === 'eraser') return 'cursor-cell';
    return 'cursor-crosshair';
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto select-none">
      {/* Top Drawing Controls Toolbar (Touch-Friendly 44px min height targets) */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-zinc-900/90 border border-zinc-800 rounded-t-2xl px-3 py-2 text-xs backdrop-blur-md">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/90">
          <button
            onClick={() => setCurrentTool('brush')}
            className={`min-w-[40px] min-h-[40px] p-2 rounded-xl transition-all flex items-center justify-center ${
              currentTool === 'brush'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Brush (Smooth Vector Ribbon)"
          >
            <Paintbrush className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentTool('chisel')}
            className={`min-w-[40px] min-h-[40px] p-2 rounded-xl transition-all flex items-center justify-center ${
              currentTool === 'chisel'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Chisel Pen (Calligraphy Angle Nib)"
          >
            <PenTool className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentTool('line')}
            className={`min-w-[40px] min-h-[40px] p-2 rounded-xl transition-all flex items-center justify-center ${
              currentTool === 'line'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Straight Line Tool"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentTool('eraser')}
            className={`min-w-[40px] min-h-[40px] p-2 rounded-xl transition-all flex items-center justify-center ${
              currentTool === 'eraser'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Eraser (Tap or sweep over strokes)"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        {/* Stroke Width Slider & Apple Pencil Pressure Toggle */}
        <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800/90">
          <span className="text-[11px] text-zinc-400 font-medium">Width:</span>
          <input
            type="range"
            min={6}
            max={56}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-18 sm:w-24 accent-indigo-500 cursor-pointer h-2 rounded-lg bg-zinc-800"
          />
          <span className="text-[11px] font-mono text-zinc-300 w-6">{strokeWidth}px</span>
          <div
            className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0 shadow"
            style={{ transform: `scale(${strokeWidth / 30})` }}
          />

          {/* Pressure sensitivity toggle */}
          <div className="w-[1px] h-5 bg-zinc-800 mx-0.5" />
          <button
            onClick={() => setUsePressure(!usePressure)}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-all ${
              usePressure
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Apple Pencil / Stylus pressure sensitivity"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Pencil Pressure</span>
          </button>
        </div>

        {/* Undo / Redo / Palm Rejection */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/90">
          {/* Apple Pencil Palm Rejection Button */}
          <button
            onClick={() => {
              setPencilOnlyMode(!pencilOnlyMode);
              showNotification(
                !pencilOnlyMode ? '✏️ Apple Pencil Only (Palm Reject On)' : '🖐️ Finger + Pencil Allowed'
              );
            }}
            className={`min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-all ${
              pencilOnlyMode
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="Palm Rejection: Reject finger touches and only draw with Apple Pencil"
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden md:inline">Palm Reject</span>
          </button>

          <div className="w-[1px] h-4 bg-zinc-800" />

          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="min-w-[36px] min-h-[36px] p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 transition-colors flex items-center justify-center"
            title="Undo (or 2-Finger Tap)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="min-w-[36px] min-h-[36px] p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 transition-colors flex items-center justify-center"
            title="Redo (or 3-Finger Tap)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-800" />

          <button
            onClick={handleClear}
            className="min-w-[36px] min-h-[36px] p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors flex items-center justify-center"
            title="Clear Glyph Canvas"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className="relative w-full aspect-square border-x border-zinc-800 bg-zinc-950 shadow-2xl flex items-center justify-center overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <div
          className="w-full h-full transition-transform duration-100 origin-center flex items-center justify-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
            className={getCursorClass()}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        {/* Multi-Touch Procreate Gesture Toast HUD */}
        {gestureToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-white font-medium text-xs px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md border border-zinc-700 animate-in fade-in zoom-in-95 pointer-events-none z-30 flex items-center gap-1.5">
            <span>{gestureToast}</span>
          </div>
        )}

        {/* Dragging Guideline Pill Indicator */}
        {dragTarget && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white font-mono text-xs px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md animate-pulse border border-indigo-400/40 z-30">
            {dragTarget === 'baseline' && `Baseline Offset: ${glyph.baselineOffset} U`}
            {dragTarget === 'lsb' && `Left Side-Bearing: ${glyph.leftSideBearing} U`}
            {dragTarget === 'advance' && `Advance Width: ${glyph.advanceWidth} U`}
          </div>
        )}

        {/* Apple Pencil Status Badge on iPad */}
        {isPencilDetected && (
          <div className="absolute top-3 left-3 bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 font-mono text-[10px] px-2 py-0.5 rounded-md backdrop-blur-sm pointer-events-none z-20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Apple Pencil Active</span>
          </div>
        )}
      </div>

      {/* Bottom Canvas View & Zoom Toggles */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-zinc-900/90 border border-zinc-800 rounded-b-2xl px-3 py-2 text-xs backdrop-blur-md">
        {/* View Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all flex items-center gap-1 ${
              showGrid
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>

          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all flex items-center gap-1 ${
              showGuides
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Guides</span>
          </button>

          <button
            onClick={() => setShowBeziers(!showBeziers)}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all flex items-center gap-1 ${
              showBeziers
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Bezier Nodes</span>
          </button>

          <button
            onClick={() => setShowGhost(!showGhost)}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all flex items-center gap-1 ${
              showGhost
                ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ghost</span>
          </button>
        </div>

        {/* Zoom Controls for iPad detail work */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-zinc-400">
          <button
            onClick={() => setZoomLevel((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
            disabled={zoomLevel <= 1}
            className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] w-9 text-center text-zinc-300">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2, +(z + 0.25).toFixed(2)))}
            disabled={zoomLevel >= 2}
            className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {zoomLevel !== 1 && (
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-300"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
