/**
 * Mathematical Jigsaw Puzzle Generator for 9 interlocking pieces (3 columns x 3 rows)
 * Creates authentic jigsaw puzzle tabs and blanks that connect 100% seamlessly
 * without gaps to form one continuous, complete painting.
 */

export const JIGSAW_COLS = 3;
export const JIGSAW_ROWS = 3;
export const JIGSAW_TOTAL = 9;
export const BOARD_WIDTH = 900;
export const BOARD_HEIGHT = 600;
export const TILE_WIDTH = BOARD_WIDTH / JIGSAW_COLS; // 300
export const TILE_HEIGHT = BOARD_HEIGHT / JIGSAW_ROWS; // 200

// Horizontal interior edges:
// [row 0-1 border (y=200), row 1-2 border (y=400)]
// +1 = tab bulges downward, -1 = tab bulges upward
const H_EDGES = [
  [1, -1, 1],   // between row 0 and 1 for col 0, 1, 2
  [-1, 1, -1],  // between row 1 and 2 for col 0, 1, 2
];

// Vertical interior edges:
// For rows 0, 1, 2 between (col 0,1) and (col 1,2)
// +1 = tab bulges rightward, -1 = tab bulges leftward
const V_EDGES = [
  [1, -1],  // row 0
  [-1, 1],  // row 1
  [1, -1],  // row 2
];

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
  const h = len * 0.22; // Tab height/depth
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
 * Precomputes the exact SVG path and geometry for all 9 jigsaw pieces.
 */
export function getJigsawPiecesGeometry(): JigsawPieceGeometry[] {
  const pieces: JigsawPieceGeometry[] = [];

  for (let row = 0; row < JIGSAW_ROWS; row++) {
    for (let col = 0; col < JIGSAW_COLS; col++) {
      const id = row * JIGSAW_COLS + col;
      const x = col * TILE_WIDTH;
      const y = row * TILE_HEIGHT;

      // Top edge (from (x,y) to (x+w, y))
      // If row === 0, border is straight (dir = 0)
      // Else dir is -H_EDGES[row - 1][col]
      const topDir = row === 0 ? 0 : -H_EDGES[row - 1][col];

      // Right edge (from (x+w, y) to (x+w, y+h))
      // If col === JIGSAW_COLS - 1, border is straight
      // Else dir is V_EDGES[row][col]
      const rightDir = col === JIGSAW_COLS - 1 ? 0 : V_EDGES[row][col];

      // Bottom edge (from (x+w, y+h) to (x, y+h))
      // If row === JIGSAW_ROWS - 1, border is straight
      // Else dir is H_EDGES[row][col]
      const bottomDir = row === JIGSAW_ROWS - 1 ? 0 : H_EDGES[row][col];

      // Left edge (from (x, y+h) to (x, y))
      // If col === 0, border is straight
      // Else reverse of right edge of col-1, so dir is -V_EDGES[row][col - 1]
      const leftDir = col === 0 ? 0 : -V_EDGES[row][col - 1];

      // Build path
      let d = `M ${x} ${y} `;
      d += generateEdgePath(x, y, x + TILE_WIDTH, y, topDir) + ' ';
      d += generateEdgePath(x + TILE_WIDTH, y, x + TILE_WIDTH, y + TILE_HEIGHT, rightDir) + ' ';
      d += generateEdgePath(x + TILE_WIDTH, y + TILE_HEIGHT, x, y + TILE_HEIGHT, bottomDir) + ' ';
      d += generateEdgePath(x, y + TILE_HEIGHT, x, y, leftDir) + ' ';
      d += 'Z';

      // Estimate bounding box including tabs (~55px extra for tabs)
      const tabSlack = 55;
      const minX = Math.max(0, x - tabSlack);
      const minY = Math.max(0, y - tabSlack);
      const maxX = Math.min(BOARD_WIDTH, x + TILE_WIDTH + tabSlack);
      const maxY = Math.min(BOARD_HEIGHT, y + TILE_HEIGHT + tabSlack);

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
        centerX: x + TILE_WIDTH / 2,
        centerY: y + TILE_HEIGHT / 2,
        tileX: x,
        tileY: y,
      });
    }
  }

  return pieces;
}

// Singleton cache
export const JIGSAW_GEOMETRY = getJigsawPiecesGeometry();
