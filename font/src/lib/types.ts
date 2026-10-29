export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export type DrawingTool = 'brush' | 'chisel' | 'line' | 'eraser';

export interface Stroke {
  id: string;
  points: Point[];
  width: number;
  tool: DrawingTool;
  color?: string;
  isCustomPath?: boolean;
  usePressure?: boolean;
}

export interface BezierCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface ContourPath {
  commands: BezierCommand[];
}

export interface GlyphData {
  char: string;
  name: string;
  unicode: number;
  strokes: Stroke[];
  advanceWidth: number; // in font units (default ~600)
  leftSideBearing: number; // in font units (default ~50)
  baselineOffset: number; // in font units (default 0)
  isModified?: boolean;
}

export interface FontMetrics {
  unitsPerEm: number; // default 1000
  ascender: number; // default 800
  descender: number; // default -200
  capHeight: number; // default 700
  xHeight: number; // default 500
}

export interface FontMetadata {
  familyName: string;
  styleName: string;
  designer: string;
  version: string;
  description: string;
  copyright: string;
}

export type CharacterCategory = 'all' | 'uppercase' | 'lowercase' | 'numbers' | 'punctuation';
