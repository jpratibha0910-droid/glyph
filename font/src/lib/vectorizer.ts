import { Path } from 'opentype.js';
import { Point, Stroke, ContourPath, BezierCommand } from './types';
import {
  CANVAS_SIZE,
  CANVAS_LEFT_MARGIN,
  CANVAS_BASELINE_Y,
  FONT_SCALE,
  CANVAS_CAP_HEIGHT_Y,
  CANVAS_X_HEIGHT_Y,
} from './constants';

/**
 * Convert canvas pixel coordinates to font units.
 * Font system: baseline is Y=0, ascender is positive upwards, descender is negative downwards.
 */
export function canvasToFont(
  cx: number,
  cy: number,
  baselineOffset: number = 0
): { x: number; y: number } {
  const fx = (cx - CANVAS_LEFT_MARGIN) / FONT_SCALE;
  const fy = (CANVAS_BASELINE_Y - cy) / FONT_SCALE + baselineOffset;
  return {
    x: Math.round(fx),
    y: Math.round(fy),
  };
}

/**
 * Convert font units to canvas pixel coordinates.
 */
export function fontToCanvas(
  fx: number,
  fy: number,
  baselineOffset: number = 0
): { x: number; y: number } {
  const cx = CANVAS_LEFT_MARGIN + fx * FONT_SCALE;
  const cy = CANVAS_BASELINE_Y - (fy - baselineOffset) * FONT_SCALE;
  return { x: cx, y: cy };
}

/**
 * Smooth a sequence of points using Catmull-Rom or weighted moving average.
 */
export function smoothPoints(points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const smoothed: Point[] = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    smoothed.push({
      x: 0.25 * prev.x + 0.5 * curr.x + 0.25 * next.x,
      y: 0.25 * prev.y + 0.5 * curr.y + 0.25 * next.y,
      pressure: curr.pressure ?? 1,
    });
  }

  smoothed.push(points[points.length - 1]);
  return smoothed;
}

/**
 * Simplify points using Douglas-Peucker algorithm.
 */
export function simplifyPoints(points: Point[], tolerance: number = 2): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPoints(points.slice(0, index + 1), tolerance);
    const right = simplifyPoints(points.slice(index), tolerance);
    return left.slice(0, -1).concat(right);
  } else {
    return [start, end];
  }
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Expand a stroke into a closed contour path with rounded caps and bezier curve outlines.
 */
export function strokeToContour(stroke: Stroke): ContourPath {
  const rawPoints = stroke.points;
  if (!rawPoints || rawPoints.length === 0) {
    return { commands: [] };
  }

  const radius = Math.max(3, stroke.width / 2);
  const commands: BezierCommand[] = [];

  // Single dot/point case (e.g. dot on 'i' or period '.')
  if (rawPoints.length === 1) {
    const p = rawPoints[0];
    const k = radius * 0.55228474983; // circle bezier constant
    commands.push({ type: 'M', x: p.x + radius, y: p.y });
    commands.push({
      type: 'C',
      x1: p.x + radius,
      y1: p.y + k,
      x2: p.x + k,
      y2: p.y + radius,
      x: p.x,
      y: p.y + radius,
    });
    commands.push({
      type: 'C',
      x1: p.x - k,
      y1: p.y + radius,
      x2: p.x - radius,
      y2: p.y + k,
      x: p.x - radius,
      y: p.y,
    });
    commands.push({
      type: 'C',
      x1: p.x - radius,
      y1: p.y - k,
      x2: p.x - k,
      y2: p.y - radius,
      x: p.x,
      y: p.y - radius,
    });
    commands.push({
      type: 'C',
      x1: p.x + k,
      y1: p.y - radius,
      x2: p.x + radius,
      y2: p.y - k,
      x: p.x + radius,
      y: p.y,
    });
    commands.push({ type: 'Z' });
    return { commands };
  }

  const points = smoothPoints(simplifyPoints(rawPoints, 1.5));
  const n = points.length;

  if (n < 2) {
    return { commands: [] };
  }

  const baseRadius = Math.max(3, stroke.width / 2);
  const getRadiusAt = (p: Point): number => {
    if (stroke.usePressure && p.pressure !== undefined && p.pressure > 0) {
      return baseRadius * Math.max(0.3, Math.min(1.8, 0.35 + 1.25 * p.pressure));
    }
    return baseRadius;
  };

  const leftEdge: Point[] = [];
  const rightEdge: Point[] = [];

  // Calligraphy chisel mode: fixed angle offset
  const isChisel = stroke.tool === 'chisel';
  const chiselAngle = (35 * Math.PI) / 180;

  for (let i = 0; i < n; i++) {
    const pt = points[i];
    const r = getRadiusAt(pt);
    let nx = 0;
    let ny = 0;

    if (isChisel) {
      nx = r * Math.cos(chiselAngle);
      ny = r * Math.sin(chiselAngle);
      leftEdge.push({ x: pt.x - nx, y: pt.y - ny });
      rightEdge.push({ x: pt.x + nx, y: pt.y + ny });
      continue;
    }

    if (i === 0) {
      const dx = points[1].x - pt.x;
      const dy = points[1].y - pt.y;
      const len = Math.hypot(dx, dy) || 1;
      nx = (-dy / len) * r;
      ny = (dx / len) * r;
    } else if (i === n - 1) {
      const dx = pt.x - points[i - 1].x;
      const dy = pt.y - points[i - 1].y;
      const len = Math.hypot(dx, dy) || 1;
      nx = (-dy / len) * r;
      ny = (dx / len) * r;
    } else {
      const dx1 = pt.x - points[i - 1].x;
      const dy1 = pt.y - points[i - 1].y;
      const dx2 = points[i + 1].x - pt.x;
      const dy2 = points[i + 1].y - pt.y;
      const len1 = Math.hypot(dx1, dy1) || 1;
      const len2 = Math.hypot(dx2, dy2) || 1;

      const n1x = -dy1 / len1;
      const n1y = dx1 / len1;
      const n2x = -dy2 / len2;
      const n2y = dx2 / len2;

      let avgNx = (n1x + n2x) / 2;
      let avgNy = (n1y + n2y) / 2;
      const avgLen = Math.hypot(avgNx, avgNy) || 1;
      nx = (avgNx / avgLen) * r;
      ny = (avgNy / avgLen) * r;
    }

    leftEdge.push({ x: pt.x + nx, y: pt.y + ny });
    rightEdge.push({ x: pt.x - nx, y: pt.y - ny });
  }

  // Construct closed path:
  // Move to leftEdge[0]
  commands.push({ type: 'M', x: leftEdge[0].x, y: leftEdge[0].y });

  // Curve along left edge using midpoints/cubic beziers
  for (let i = 0; i < leftEdge.length - 1; i++) {
    const pCurrent = leftEdge[i];
    const pNext = leftEdge[i + 1];
    const cp1x = pCurrent.x + (pNext.x - pCurrent.x) * 0.33;
    const cp1y = pCurrent.y + (pNext.y - pCurrent.y) * 0.33;
    const cp2x = pCurrent.x + (pNext.x - pCurrent.x) * 0.67;
    const cp2y = pCurrent.y + (pNext.y - pCurrent.y) * 0.67;
    commands.push({
      type: 'C',
      x1: cp1x,
      y1: cp1y,
      x2: cp2x,
      y2: cp2y,
      x: pNext.x,
      y: pNext.y,
    });
  }

  // Round end-cap at points[n - 1] connecting leftEdge[n - 1] to rightEdge[n - 1]
  const lastCenter = points[n - 1];
  const lastLeft = leftEdge[n - 1];
  const lastRight = rightEdge[n - 1];
  const endRadius = getRadiusAt(lastCenter);

  // Semicircle end-cap via cubic bezier
  const capTangX = lastCenter.x - points[n - 2].x;
  const capTangY = lastCenter.y - points[n - 2].y;
  const capTangLen = Math.hypot(capTangX, capTangY) || 1;
  const capTipX = lastCenter.x + (capTangX / capTangLen) * endRadius;
  const capTipY = lastCenter.y + (capTangY / capTangLen) * endRadius;

  // Arc from lastLeft to capTip
  commands.push({
    type: 'C',
    x1: lastLeft.x + (capTangX / capTangLen) * (endRadius * 0.55),
    y1: lastLeft.y + (capTangY / capTangLen) * (endRadius * 0.55),
    x2: capTipX + (lastLeft.x - lastCenter.x) * 0.55,
    y2: capTipY + (lastLeft.y - lastCenter.y) * 0.55,
    x: capTipX,
    y: capTipY,
  });

  // Arc from capTip to lastRight
  commands.push({
    type: 'C',
    x1: capTipX + (lastRight.x - lastCenter.x) * 0.55,
    y1: capTipY + (lastRight.y - lastCenter.y) * 0.55,
    x2: lastRight.x + (capTangX / capTangLen) * (endRadius * 0.55),
    y2: lastRight.y + (capTangY / capTangLen) * (endRadius * 0.55),
    x: lastRight.x,
    y: lastRight.y,
  });

  // Curve back along right edge in reverse (n-1 down to 0)
  for (let i = rightEdge.length - 1; i > 0; i--) {
    const pCurrent = rightEdge[i];
    const pPrev = rightEdge[i - 1];
    const cp1x = pCurrent.x + (pPrev.x - pCurrent.x) * 0.33;
    const cp1y = pCurrent.y + (pPrev.y - pCurrent.y) * 0.33;
    const cp2x = pCurrent.x + (pPrev.x - pCurrent.x) * 0.67;
    const cp2y = pCurrent.y + (pPrev.y - pCurrent.y) * 0.67;
    commands.push({
      type: 'C',
      x1: cp1x,
      y1: cp1y,
      x2: cp2x,
      y2: cp2y,
      x: pPrev.x,
      y: pPrev.y,
    });
  }

  // Round start-cap at points[0] connecting rightEdge[0] to leftEdge[0]
  const firstCenter = points[0];
  const firstLeft = leftEdge[0];
  const firstRight = rightEdge[0];
  const startRadius = getRadiusAt(firstCenter);

  const startTangX = firstCenter.x - points[1].x;
  const startTangY = firstCenter.y - points[1].y;
  const startTangLen = Math.hypot(startTangX, startTangY) || 1;
  const startTipX = firstCenter.x + (startTangX / startTangLen) * startRadius;
  const startTipY = firstCenter.y + (startTangY / startTangLen) * startRadius;

  // Arc from firstRight to startTip
  commands.push({
    type: 'C',
    x1: firstRight.x + (startTangX / startTangLen) * (startRadius * 0.55),
    y1: firstRight.y + (startTangY / startTangLen) * (startRadius * 0.55),
    x2: startTipX + (firstRight.x - firstCenter.x) * 0.55,
    y2: startTipY + (firstRight.y - firstCenter.y) * 0.55,
    x: startTipX,
    y: startTipY,
  });

  // Arc from startTip to firstLeft
  commands.push({
    type: 'C',
    x1: startTipX + (firstLeft.x - firstCenter.x) * 0.55,
    y1: startTipY + (firstLeft.y - firstCenter.y) * 0.55,
    x2: firstLeft.x + (startTangX / startTangLen) * (startRadius * 0.55),
    y2: firstLeft.y + (startTangY / startTangLen) * (startRadius * 0.55),
    x: firstLeft.x,
    y: firstLeft.y,
  });

  commands.push({ type: 'Z' });

  return { commands };
}

/**
 * Convert an array of strokes into an opentype.Path with correct font unit scaling.
 */
export function strokesToOpenTypePath(
  strokes: Stroke[],
  baselineOffset: number = 0
): Path {
  const path = new Path();

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    const contour = strokeToContour(stroke);

    for (const cmd of contour.commands) {
      if (cmd.type === 'M' && cmd.x !== undefined && cmd.y !== undefined) {
        const pt = canvasToFont(cmd.x, cmd.y, baselineOffset);
        path.moveTo(pt.x, pt.y);
      } else if (cmd.type === 'L' && cmd.x !== undefined && cmd.y !== undefined) {
        const pt = canvasToFont(cmd.x, cmd.y, baselineOffset);
        path.lineTo(pt.x, pt.y);
      } else if (
        cmd.type === 'C' &&
        cmd.x !== undefined &&
        cmd.y !== undefined &&
        cmd.x1 !== undefined &&
        cmd.y1 !== undefined &&
        cmd.x2 !== undefined &&
        cmd.y2 !== undefined
      ) {
        const cp1 = canvasToFont(cmd.x1, cmd.y1, baselineOffset);
        const cp2 = canvasToFont(cmd.x2, cmd.y2, baselineOffset);
        const pt = canvasToFont(cmd.x, cmd.y, baselineOffset);
        path.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, pt.x, pt.y);
      } else if (
        cmd.type === 'Q' &&
        cmd.x !== undefined &&
        cmd.y !== undefined &&
        cmd.x1 !== undefined &&
        cmd.y1 !== undefined
      ) {
        const cp1 = canvasToFont(cmd.x1, cmd.y1, baselineOffset);
        const pt = canvasToFont(cmd.x, cmd.y, baselineOffset);
        path.quadraticCurveTo(cp1.x, cp1.y, pt.x, pt.y);
      } else if (cmd.type === 'Z') {
        path.close();
      }
    }
  }

  return path;
}

/**
 * Generate starter strokes for any character based on clean geometric proportions.
 * This guarantees the user has an immediate, fully functional font out of the box!
 */
export function generateStarterStrokes(char: string): Stroke[] {
  const strokes: Stroke[] = [];
  const W = 22; // default stroke width

  const left = CANVAS_LEFT_MARGIN + 30;
  const right = CANVAS_LEFT_MARGIN + 230;
  const midX = (left + right) / 2;

  const topCap = CANVAS_CAP_HEIGHT_Y + 10;
  const base = CANVAS_BASELINE_Y - 5;
  const midY = (topCap + base) / 2;
  const topX = CANVAS_X_HEIGHT_Y + 10;
  const midLowY = (topX + base) / 2;

  const s = (pts: Point[]): Stroke => ({
    id: `stroke_${Math.random().toString(36).substring(2, 9)}`,
    points: pts,
    width: W,
    tool: 'brush',
  });

  // Uppercase A-Z
  switch (char) {
    case 'A':
      strokes.push(s([{ x: left, y: base }, { x: midX, y: topCap }]));
      strokes.push(s([{ x: midX, y: topCap }, { x: right, y: base }]));
      strokes.push(s([{ x: left + 35, y: midY + 25 }, { x: right - 35, y: midY + 25 }]));
      break;
    case 'B':
      strokes.push(s([{ x: left, y: base }, { x: left, y: topCap }]));
      strokes.push(s([
        { x: left, y: topCap },
        { x: right - 20, y: topCap },
        { x: right, y: (topCap + midY) / 2 },
        { x: right - 20, y: midY },
        { x: left, y: midY },
      ]));
      strokes.push(s([
        { x: left, y: midY },
        { x: right - 10, y: midY },
        { x: right + 10, y: (midY + base) / 2 },
        { x: right - 10, y: base },
        { x: left, y: base },
      ]));
      break;
    case 'C':
      strokes.push(s([
        { x: right - 10, y: topCap + 20 },
        { x: midX, y: topCap },
        { x: left, y: midY },
        { x: midX, y: base },
        { x: right - 10, y: base - 20 },
      ]));
      break;
    case 'D':
      strokes.push(s([{ x: left, y: base }, { x: left, y: topCap }]));
      strokes.push(s([
        { x: left, y: topCap },
        { x: right - 30, y: topCap },
        { x: right + 10, y: midY },
        { x: right - 30, y: base },
        { x: left, y: base },
      ]));
      break;
    case 'E':
      strokes.push(s([{ x: left, y: base }, { x: left, y: topCap }]));
      strokes.push(s([{ x: left, y: topCap }, { x: right - 20, y: topCap }]));
      strokes.push(s([{ x: left, y: midY }, { x: right - 40, y: midY }]));
      strokes.push(s([{ x: left, y: base }, { x: right - 20, y: base }]));
      break;
    case 'F':
      strokes.push(s([{ x: left, y: base }, { x: left, y: topCap }]));
      strokes.push(s([{ x: left, y: topCap }, { x: right - 20, y: topCap }]));
      strokes.push(s([{ x: left, y: midY }, { x: right - 50, y: midY }]));
      break;
    case 'G':
      strokes.push(s([
        { x: right - 10, y: topCap + 20 },
        { x: midX, y: topCap },
        { x: left, y: midY },
        { x: midX, y: base },
        { x: right - 10, y: base },
        { x: right - 10, y: midY },
        { x: midX + 10, y: midY },
      ]));
      break;
    case 'H':
      strokes.push(s([{ x: left, y: base }, { x: left, y: topCap }]));
      strokes.push(s([{ x: right, y: base }, { x: right, y: topCap }]));
      strokes.push(s([{ x: left, y: midY }, { x: right, y: midY }]));
      break;
    case 'I':
      strokes.push(s([{ x: midX, y: base }, { x: midX, y: topCap }]));
      strokes.push(s([{ x: midX - 45, y: topCap }, { x: midX + 45, y: topCap }]));
      strokes.push(s([{ x: midX - 45, y: base }, { x: midX + 45, y: base }]));
      break;
    case 'J':
      strokes.push(s([{ x: right - 10, y: topCap }, { x: right - 10, y: base - 30 }]));
      strokes.push(s([
        { x: right - 10, y: base - 30 },
        { x: midX, y: base },
        { x: left + 10, y: base - 25 },
        { x: left + 10, y: base - 55 },
      ]));
      break;
    case 'K':
      strokes.push(s([{ x: left, y: base }, { x: left, y: topCap }]));
      strokes.push(s([{ x: right, y: topCap }, { x: left + 10, y: midY }]));
      strokes.push(s([{ x: left + 20, y: midY }, { x: right, y: base }]));
      break;
    case 'L':
      strokes.push(s([{ x: left, y: topCap }, { x: left, y: base }]));
      strokes.push(s([{ x: left, y: base }, { x: right - 20, y: base }]));
      break;
    case 'M':
      strokes.push(s([{ x: left, y: base }, { x: left, y: topCap }]));
      strokes.push(s([{ x: left, y: topCap }, { x: midX, y: midY + 40 }]));
      strokes.push(s([{ x: midX, y: midY + 40 }, { x: right, y: topCap }]));
      strokes.push(s([{ x: right, y: topCap }, { x: right, y: base }]));
      break;
    case 'N':
      strokes.push(s([{ x: left, y: base }, { x: left, y: topCap }]));
      strokes.push(s([{ x: left, y: topCap }, { x: right, y: base }]));
      strokes.push(s([{ x: right, y: base }, { x: right, y: topCap }]));
      break;
    case 'O':
      strokes.push(s([
        { x: midX, y: topCap },
        { x: left, y: midY },
        { x: midX, y: base },
        { x: right, y: midY },
        { x: midX, y: topCap },
      ]));
      break;
    case 'P':
      strokes.push(s([{ x: left, y: base }, { x: left, y: topCap }]));
      strokes.push(s([
        { x: left, y: topCap },
        { x: right - 10, y: topCap },
        { x: right + 10, y: (topCap + midY) / 2 },
        { x: right - 10, y: midY },
        { x: left, y: midY },
      ]));
      break;
    case 'Q':
      strokes.push(s([
        { x: midX, y: topCap },
        { x: left, y: midY },
        { x: midX, y: base },
        { x: right, y: midY },
        { x: midX, y: topCap },
      ]));
      strokes.push(s([{ x: midX + 10, y: midY + 40 }, { x: right + 20, y: base + 25 }]));
      break;
    case 'R':
      strokes.push(s([{ x: left, y: base }, { x: left, y: topCap }]));
      strokes.push(s([
        { x: left, y: topCap },
        { x: right - 20, y: topCap },
        { x: right, y: (topCap + midY) / 2 },
        { x: right - 20, y: midY },
        { x: left, y: midY },
      ]));
      strokes.push(s([{ x: left + 40, y: midY }, { x: right, y: base }]));
      break;
    case 'S':
      strokes.push(s([
        { x: right - 10, y: topCap + 25 },
        { x: midX, y: topCap },
        { x: left + 10, y: (topCap + midY) / 2 },
        { x: midX, y: midY },
        { x: right - 5, y: (midY + base) / 2 },
        { x: midX, y: base },
        { x: left + 5, y: base - 25 },
      ]));
      break;
    case 'T':
      strokes.push(s([{ x: left - 15, y: topCap }, { x: right + 15, y: topCap }]));
      strokes.push(s([{ x: midX, y: topCap }, { x: midX, y: base }]));
      break;
    case 'U':
      strokes.push(s([
        { x: left, y: topCap },
        { x: left, y: base - 40 },
        { x: midX, y: base },
        { x: right, y: base - 40 },
        { x: right, y: topCap },
      ]));
      break;
    case 'V':
      strokes.push(s([{ x: left, y: topCap }, { x: midX, y: base }]));
      strokes.push(s([{ x: midX, y: base }, { x: right, y: topCap }]));
      break;
    case 'W':
      strokes.push(s([{ x: left, y: topCap }, { x: left + 45, y: base }]));
      strokes.push(s([{ x: left + 45, y: base }, { x: midX, y: midY }]));
      strokes.push(s([{ x: midX, y: midY }, { x: right - 45, y: base }]));
      strokes.push(s([{ x: right - 45, y: base }, { x: right, y: topCap }]));
      break;
    case 'X':
      strokes.push(s([{ x: left, y: topCap }, { x: right, y: base }]));
      strokes.push(s([{ x: right, y: topCap }, { x: left, y: base }]));
      break;
    case 'Y':
      strokes.push(s([{ x: left, y: topCap }, { x: midX, y: midY }]));
      strokes.push(s([{ x: right, y: topCap }, { x: midX, y: midY }]));
      strokes.push(s([{ x: midX, y: midY }, { x: midX, y: base }]));
      break;
    case 'Z':
      strokes.push(s([{ x: left, y: topCap }, { x: right, y: topCap }]));
      strokes.push(s([{ x: right, y: topCap }, { x: left, y: base }]));
      strokes.push(s([{ x: left, y: base }, { x: right, y: base }]));
      break;

    // Lowercase a-z
    case 'a':
      strokes.push(s([
        { x: right - 10, y: topX + 15 },
        { x: midX, y: topX },
        { x: left + 10, y: midLowY },
        { x: midX, y: base },
        { x: right - 10, y: base },
        { x: right - 10, y: topX },
      ]));
      strokes.push(s([{ x: right - 10, y: topX }, { x: right - 10, y: base }]));
      break;
    case 'b':
      strokes.push(s([{ x: left, y: topCap }, { x: left, y: base }]));
      strokes.push(s([
        { x: left, y: topX },
        { x: right - 10, y: topX },
        { x: right, y: midLowY },
        { x: right - 10, y: base },
        { x: left, y: base },
      ]));
      break;
    case 'c':
      strokes.push(s([
        { x: right - 10, y: topX + 15 },
        { x: midX, y: topX },
        { x: left + 10, y: midLowY },
        { x: midX, y: base },
        { x: right - 10, y: base - 15 },
      ]));
      break;
    case 'd':
      strokes.push(s([{ x: right - 10, y: topCap }, { x: right - 10, y: base }]));
      strokes.push(s([
        { x: right - 10, y: topX },
        { x: left + 10, y: topX },
        { x: left, y: midLowY },
        { x: left + 10, y: base },
        { x: right - 10, y: base },
      ]));
      break;
    case 'e':
      strokes.push(s([{ x: left + 10, y: midLowY }, { x: right - 10, y: midLowY }]));
      strokes.push(s([
        { x: right - 10, y: midLowY },
        { x: right - 10, y: topX + 20 },
        { x: midX, y: topX },
        { x: left + 10, y: midLowY },
        { x: midX, y: base },
        { x: right - 5, y: base - 15 },
      ]));
      break;
    case 'f':
      strokes.push(s([
        { x: right - 15, y: topCap },
        { x: midX, y: topCap },
        { x: midX, y: base },
      ]));
      strokes.push(s([{ x: midX - 30, y: topX }, { x: midX + 30, y: topX }]));
      break;
    case 'g':
      strokes.push(s([
        { x: right - 10, y: topX },
        { x: left + 10, y: topX },
        { x: left, y: midLowY },
        { x: midX, y: base },
        { x: right - 10, y: base },
        { x: right - 10, y: topX },
      ]));
      strokes.push(s([
        { x: right - 10, y: topX },
        { x: right - 10, y: base + 60 },
        { x: midX, y: base + 85 },
        { x: left + 15, y: base + 65 },
      ]));
      break;
    case 'h':
      strokes.push(s([{ x: left, y: topCap }, { x: left, y: base }]));
      strokes.push(s([
        { x: left, y: midLowY },
        { x: midX, y: topX },
        { x: right - 10, y: topX + 25 },
        { x: right - 10, y: base },
      ]));
      break;
    case 'i':
      strokes.push(s([{ x: midX, y: topX }, { x: midX, y: base }]));
      strokes.push(s([{ x: midX, y: topX - 35 }])); // dot
      break;
    case 'j':
      strokes.push(s([
        { x: midX + 15, y: topX },
        { x: midX + 15, y: base + 60 },
        { x: midX - 15, y: base + 80 },
        { x: midX - 45, y: base + 60 },
      ]));
      strokes.push(s([{ x: midX + 15, y: topX - 35 }])); // dot
      break;
    case 'k':
      strokes.push(s([{ x: left, y: topCap }, { x: left, y: base }]));
      strokes.push(s([{ x: right - 15, y: topX }, { x: left + 10, y: midLowY + 10 }]));
      strokes.push(s([{ x: left + 15, y: midLowY + 10 }, { x: right - 15, y: base }]));
      break;
    case 'l':
      strokes.push(s([{ x: midX, y: topCap }, { x: midX, y: base - 10 }, { x: midX + 25, y: base }]));
      break;
    case 'm':
      strokes.push(s([{ x: left, y: topX }, { x: left, y: base }]));
      strokes.push(s([
        { x: left, y: topX + 15 },
        { x: (left + midX) / 2, y: topX },
        { x: midX, y: topX + 15 },
        { x: midX, y: base },
      ]));
      strokes.push(s([
        { x: midX, y: topX + 15 },
        { x: (midX + right) / 2, y: topX },
        { x: right, y: topX + 15 },
        { x: right, y: base },
      ]));
      break;
    case 'n':
      strokes.push(s([{ x: left, y: topX }, { x: left, y: base }]));
      strokes.push(s([
        { x: left, y: topX + 15 },
        { x: midX, y: topX },
        { x: right - 10, y: topX + 20 },
        { x: right - 10, y: base },
      ]));
      break;
    case 'o':
      strokes.push(s([
        { x: midX, y: topX },
        { x: left + 10, y: midLowY },
        { x: midX, y: base },
        { x: right - 10, y: midLowY },
        { x: midX, y: topX },
      ]));
      break;
    case 'p':
      strokes.push(s([{ x: left, y: topX }, { x: left, y: base + 80 }]));
      strokes.push(s([
        { x: left, y: topX },
        { x: right - 10, y: topX },
        { x: right, y: midLowY },
        { x: right - 10, y: base },
        { x: left, y: base },
      ]));
      break;
    case 'q':
      strokes.push(s([{ x: right - 10, y: topX }, { x: right - 10, y: base + 80 }]));
      strokes.push(s([
        { x: right - 10, y: topX },
        { x: left + 10, y: topX },
        { x: left, y: midLowY },
        { x: left + 10, y: base },
        { x: right - 10, y: base },
      ]));
      break;
    case 'r':
      strokes.push(s([{ x: left, y: topX }, { x: left, y: base }]));
      strokes.push(s([
        { x: left, y: topX + 25 },
        { x: midX, y: topX },
        { x: right - 15, y: topX + 20 },
      ]));
      break;
    case 's':
      strokes.push(s([
        { x: right - 10, y: topX + 15 },
        { x: midX, y: topX },
        { x: left + 15, y: (topX + midLowY) / 2 },
        { x: midX, y: midLowY },
        { x: right - 10, y: (midLowY + base) / 2 },
        { x: midX, y: base },
        { x: left + 10, y: base - 15 },
      ]));
      break;
    case 't':
      strokes.push(s([{ x: midX, y: (topCap + topX) / 2 }, { x: midX, y: base - 10 }, { x: midX + 25, y: base }]));
      strokes.push(s([{ x: midX - 30, y: topX }, { x: midX + 30, y: topX }]));
      break;
    case 'u':
      strokes.push(s([
        { x: left + 10, y: topX },
        { x: left + 10, y: base - 25 },
        { x: midX, y: base },
        { x: right - 10, y: base - 25 },
        { x: right - 10, y: topX },
      ]));
      strokes.push(s([{ x: right - 10, y: topX }, { x: right - 10, y: base }]));
      break;
    case 'v':
      strokes.push(s([{ x: left + 5, y: topX }, { x: midX, y: base }]));
      strokes.push(s([{ x: midX, y: base }, { x: right - 5, y: topX }]));
      break;
    case 'w':
      strokes.push(s([{ x: left, y: topX }, { x: left + 35, y: base }]));
      strokes.push(s([{ x: left + 35, y: base }, { x: midX, y: midLowY }]));
      strokes.push(s([{ x: midX, y: midLowY }, { x: right - 35, y: base }]));
      strokes.push(s([{ x: right - 35, y: base }, { x: right, y: topX }]));
      break;
    case 'x':
      strokes.push(s([{ x: left + 10, y: topX }, { x: right - 10, y: base }]));
      strokes.push(s([{ x: right - 10, y: topX }, { x: left + 10, y: base }]));
      break;
    case 'y':
      strokes.push(s([{ x: left + 10, y: topX }, { x: midX, y: base }]));
      strokes.push(s([
        { x: right - 10, y: topX },
        { x: midX, y: base },
        { x: left + 15, y: base + 75 },
      ]));
      break;
    case 'z':
      strokes.push(s([{ x: left + 10, y: topX }, { x: right - 10, y: topX }]));
      strokes.push(s([{ x: right - 10, y: topX }, { x: left + 10, y: base }]));
      strokes.push(s([{ x: left + 10, y: base }, { x: right - 10, y: base }]));
      break;

    // Digits 0-9
    case '0':
      strokes.push(s([
        { x: midX, y: topCap },
        { x: left + 10, y: midY },
        { x: midX, y: base },
        { x: right - 10, y: midY },
        { x: midX, y: topCap },
      ]));
      strokes.push(s([{ x: right - 25, y: topCap + 25 }, { x: left + 25, y: base - 25 }])); // slashed zero
      break;
    case '1':
      strokes.push(s([{ x: midX - 30, y: topCap + 35 }, { x: midX, y: topCap }]));
      strokes.push(s([{ x: midX, y: topCap }, { x: midX, y: base }]));
      strokes.push(s([{ x: midX - 45, y: base }, { x: midX + 45, y: base }]));
      break;
    case '2':
      strokes.push(s([
        { x: left + 10, y: topCap + 30 },
        { x: midX, y: topCap },
        { x: right - 10, y: topCap + 35 },
        { x: left + 10, y: base },
        { x: right - 5, y: base },
      ]));
      break;
    case '3':
      strokes.push(s([
        { x: left + 10, y: topCap + 20 },
        { x: midX, y: topCap },
        { x: right - 10, y: (topCap + midY) / 2 },
        { x: midX + 15, y: midY },
        { x: right - 5, y: (midY + base) / 2 },
        { x: midX, y: base },
        { x: left + 10, y: base - 25 },
      ]));
      break;
    case '4':
      strokes.push(s([{ x: right - 25, y: base }, { x: right - 25, y: topCap }]));
      strokes.push(s([
        { x: right - 25, y: topCap },
        { x: left + 10, y: midY + 30 },
        { x: right + 10, y: midY + 30 },
      ]));
      break;
    case '5':
      strokes.push(s([{ x: right - 10, y: topCap }, { x: left + 15, y: topCap }]));
      strokes.push(s([{ x: left + 15, y: topCap }, { x: left + 15, y: midY }]));
      strokes.push(s([
        { x: left + 15, y: midY },
        { x: right - 10, y: midY },
        { x: right + 5, y: (midY + base) / 2 },
        { x: midX, y: base },
        { x: left + 10, y: base - 25 },
      ]));
      break;
    case '6':
      strokes.push(s([
        { x: right - 15, y: topCap + 25 },
        { x: midX, y: topCap },
        { x: left + 10, y: midY },
        { x: midX, y: base },
        { x: right - 10, y: (midY + base) / 2 },
        { x: midX, y: midY },
        { x: left + 10, y: midY },
      ]));
      break;
    case '7':
      strokes.push(s([{ x: left + 10, y: topCap }, { x: right - 10, y: topCap }]));
      strokes.push(s([{ x: right - 10, y: topCap }, { x: left + 20, y: base }]));
      strokes.push(s([{ x: midX - 25, y: midY }, { x: midX + 25, y: midY }])); // crossbar
      break;
    case '8':
      strokes.push(s([
        { x: midX, y: topCap },
        { x: left + 15, y: (topCap + midY) / 2 },
        { x: midX, y: midY },
        { x: right - 10, y: (midY + base) / 2 },
        { x: midX, y: base },
        { x: left + 10, y: (midY + base) / 2 },
        { x: midX, y: midY },
        { x: right - 15, y: (topCap + midY) / 2 },
        { x: midX, y: topCap },
      ]));
      break;
    case '9':
      strokes.push(s([
        { x: right - 10, y: midY },
        { x: midX, y: midY },
        { x: left + 10, y: (topCap + midY) / 2 },
        { x: midX, y: topCap },
        { x: right - 10, y: (topCap + midY) / 2 },
        { x: right - 10, y: base - 25 },
        { x: midX, y: base },
        { x: left + 15, y: base - 20 },
      ]));
      break;

    // Punctuation
    case '.':
      strokes.push(s([{ x: midX, y: base - 10 }]));
      break;
    case ',':
      strokes.push(s([
        { x: midX, y: base - 10 },
        { x: midX - 10, y: base + 20 },
      ]));
      break;
    case '!':
      strokes.push(s([{ x: midX, y: topCap }, { x: midX, y: midY + 45 }]));
      strokes.push(s([{ x: midX, y: base - 10 }]));
      break;
    case '?':
      strokes.push(s([
        { x: left + 15, y: topCap + 25 },
        { x: midX, y: topCap },
        { x: right - 15, y: topCap + 25 },
        { x: midX + 10, y: midY },
        { x: midX, y: midY + 30 },
      ]));
      strokes.push(s([{ x: midX, y: base - 10 }]));
      break;
    case '-':
      strokes.push(s([{ x: left + 15, y: midLowY }, { x: right - 15, y: midLowY }]));
      break;
    case '+':
      strokes.push(s([{ x: left + 15, y: midLowY }, { x: right - 15, y: midLowY }]));
      strokes.push(s([{ x: midX, y: midLowY - 40 }, { x: midX, y: midLowY + 40 }]));
      break;
    case '=':
      strokes.push(s([{ x: left + 15, y: midLowY - 20 }, { x: right - 15, y: midLowY - 20 }]));
      strokes.push(s([{ x: left + 15, y: midLowY + 20 }, { x: right - 15, y: midLowY + 20 }]));
      break;
    case ':':
      strokes.push(s([{ x: midX, y: topX + 15 }]));
      strokes.push(s([{ x: midX, y: base - 10 }]));
      break;
    case ';':
      strokes.push(s([{ x: midX, y: topX + 15 }]));
      strokes.push(s([
        { x: midX, y: base - 10 },
        { x: midX - 10, y: base + 20 },
      ]));
      break;
    default:
      // Fallback cross/placeholder for any unspecified symbol
      strokes.push(s([{ x: left + 10, y: topCap + 10 }, { x: right - 10, y: base - 10 }]));
      strokes.push(s([{ x: right - 10, y: topCap + 10 }, { x: left + 10, y: base - 10 }]));
      break;
  }

  return strokes;
}
