import { PuzzlePieceCount } from '../types';

/**
 * Mathematical Jigsaw Puzzle Generator supporting 4, 6, 8, and 9 interlocking pieces.
 * Creates authentic jigsaw puzzle tabs and blanks that connect 100% seamlessly
 * without gaps to form one continuous, complete painting.
 */

export interface PieceGridConfig {
  count: PuzzlePieceCount;
  cols: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
  label: string;
  badge: string;
  description: string;
}

export const BOARD_WIDTH = 900;
export const BOARD_HEIGHT = 600;

export const PIECE_CONFIGS: Record<PuzzlePieceCount, PieceGridConfig> = {
  4: {
    count: 4,
    cols: 2,
    rows: 2,
    tileWidth: 450,
    tileHeight: 300,
    label: '4 Mảnh (2 × 2)',
    badge: 'Nhanh & Dễ',
    description: 'Phù hợp lớp 1-2 hoặc khởi động nhanh',
  },
  6: {
    count: 6,
    cols: 3,
    rows: 2,
    tileWidth: 300,
    tileHeight: 300,
    label: '6 Mảnh (3 × 2)',
    badge: 'Vừa phải',
    description: 'Trận đấu nhanh gọn, mảnh ghép vuông vắn dễ ghép',
  },
  8: {
    count: 8,
    cols: 4,
    rows: 2,
    tileWidth: 225,
    tileHeight: 300,
    label: '8 Mảnh (4 × 2)',
    badge: 'Khuyên dùng',
    description: 'Tiêu chuẩn cho tiết học 8 lượt chơi đối kháng',
  },
  9: {
    count: 9,
    cols: 3,
    rows: 3,
    tileWidth: 300,
    tileHeight: 200,
    label: '9 Mảnh (3 × 3)',
    badge: 'Thử thách',
    description: 'Ghép tranh 9 mảnh truyền thống có mảnh trung tâm',
  },
};

// Default constants for backward compatibility
export const JIGSAW_COLS = 4;
export const JIGSAW_ROWS = 2;
export const JIGSAW_TOTAL = 8;
export const TILE_WIDTH = BOARD_WIDTH / JIGSAW_COLS;
export const TILE_HEIGHT = BOARD_HEIGHT / JIGSAW_ROWS;

/**
 * Generates an SVG path segment for an edge with optional jigsaw tab/blank.
 * When dir === 0: straight line.
 * When dir === 1: tab bulging to the right of travel direction.
 * When dir === -1: blank cutting into the piece.
 */
function generateEdgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dir: number
): string {
  if (dir === 0) {
    return `L ${x2} ${y2}`;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  // Normal vector pointing to the right of travel direction
  const nx = -uy * dir;
  const ny = ux * dir;

  // Classic bulbous jigsaw tab proportions
  const hRatio = len > 350 ? 0.18 : 0.22;
  const h = len * hRatio; // Tab height/depth
  const s = len * 0.04; // Neck squeeze

  const pt = (u: number, n: number) => {
    const px = x1 + ux * (u * len) + nx * n;
    const py = y1 + uy * (u * len) + ny * n;
    return `${px.toFixed(2)} ${py.toFixed(2)}`;
  };

  // Build cubic bezier curve for a classic jigsaw knob
  const pA = pt(0.36, 0);
  const c1 = pt(0.38, 0);
  const c2 = pt(0.36, -s);
  const pB = pt(0.38, h * 0.25);

  const c3 = pt(0.40, h * 0.95);
  const c4 = pt(0.44, h * 1.08);
  const pC = pt(0.50, h * 1.08); // Apex of tab

  const c5 = pt(0.56, h * 1.08);
  const c6 = pt(0.60, h * 0.95);
  const pD = pt(0.62, h * 0.25);

  const c7 = pt(0.64, -s);
  const c8 = pt(0.62, 0);
  const pE = pt(0.64, 0);

  return `L ${pA} C ${c1}, ${c2}, ${pB} C ${c3}, ${c4}, ${pC} C ${c5}, ${c6}, ${pD} C ${c7}, ${c8}, ${pE} L ${x2} ${y2}`;
}

export interface JigsawPieceGeometry {
  id: number;
  col: number;
  row: number;
  pathData: string;
  // Bounding box including protruding tabs
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  // Center of base tile (for guide dots / labels)
  centerX: number;
  centerY: number;
  // Base tile coordinates (without tabs)
  tileX: number;
  tileY: number;
}

/**
 * Computes exact SVG paths and bounding boxes for any piece count configuration (4, 6, 8, 9)
 */
export function getJigsawPiecesGeometry(count: PuzzlePieceCount = 8): JigsawPieceGeometry[] {
  const config = PIECE_CONFIGS[count] || PIECE_CONFIGS[8];
  const { cols, rows, tileWidth, tileHeight } = config;

  // Interlocking tab directions
  const hEdges: number[][] = [];
  for (let r = 0; r < rows - 1; r++) {
    const rowEdges: number[] = [];
    for (let c = 0; c < cols; c++) {
      rowEdges.push((r + c) % 2 === 0 ? 1 : -1);
    }
    hEdges.push(rowEdges);
  }

  const vEdges: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const colEdges: number[] = [];
    for (let c = 0; c < cols - 1; c++) {
      colEdges.push((r + c) % 2 === 0 ? 1 : -1);
    }
    vEdges.push(colEdges);
  }

  const pieces: JigsawPieceGeometry[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const id = row * cols + col;
      const x = col * tileWidth;
      const y = row * tileHeight;

      // Top edge
      const topDir = row === 0 ? 0 : -hEdges[row - 1][col];

      // Right edge
      const rightDir = col === cols - 1 ? 0 : vEdges[row][col];

      // Bottom edge
      const bottomDir = row === rows - 1 ? 0 : hEdges[row][col];

      // Left edge
      const leftDir = col === 0 ? 0 : -vEdges[row][col - 1];

      // Build path
      let d = `M ${x} ${y} `;
      d += generateEdgePath(x, y, x + tileWidth, y, topDir) + ' ';
      d += generateEdgePath(x + tileWidth, y, x + tileWidth, y + tileHeight, rightDir) + ' ';
      d += generateEdgePath(x + tileWidth, y + tileHeight, x, y + tileHeight, bottomDir) + ' ';
      d += generateEdgePath(x, y + tileHeight, x, y, leftDir) + ' ';
      d += 'Z';

      // Estimate bounding box including tabs
      const tabSlack = Math.round(Math.max(tileWidth, tileHeight) * 0.28);
      const minX = Math.max(0, x - tabSlack);
      const minY = Math.max(0, y - tabSlack);
      const maxX = Math.min(BOARD_WIDTH, x + tileWidth + tabSlack);
      const maxY = Math.min(BOARD_HEIGHT, y + tileHeight + tabSlack);

      pieces.push({
        id,
        col,
        row,
        pathData: d,
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: x + tileWidth / 2,
        centerY: y + tileHeight / 2,
        tileX: x,
        tileY: y,
      });
    }
  }

  return pieces;
}

// Precomputed geometries for all supported counts
export const JIGSAW_GEOMETRIES: Record<PuzzlePieceCount, JigsawPieceGeometry[]> = {
  4: getJigsawPiecesGeometry(4),
  6: getJigsawPiecesGeometry(6),
  8: getJigsawPiecesGeometry(8),
  9: getJigsawPiecesGeometry(9),
};

export function getGeometryForCount(count: PuzzlePieceCount): JigsawPieceGeometry[] {
  return JIGSAW_GEOMETRIES[count] || JIGSAW_GEOMETRIES[8];
}

// Singleton cache for backward compatibility
export const JIGSAW_GEOMETRY = JIGSAW_GEOMETRIES[8];

