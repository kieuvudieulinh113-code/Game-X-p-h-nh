import { PuzzlePiece } from '../types';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  JIGSAW_COLS,
  JIGSAW_ROWS,
  JIGSAW_GEOMETRY,
  JIGSAW_TOTAL,
} from './jigsaw';

export const COLS = JIGSAW_COLS;
export const ROWS = JIGSAW_ROWS;
export const TOTAL_PIECES = JIGSAW_TOTAL; // Exactly 9 pieces

/**
 * Slices an image data URL into 9 interlocking jigsaw pieces
 */
export async function sliceImageIntoPieces(imageSrc: string): Promise<PuzzlePiece[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const pieces: PuzzlePiece[] = [];

        // Temporary canvas for full resized image (900x600)
        const fullCanvas = document.createElement('canvas');
        fullCanvas.width = BOARD_WIDTH;
        fullCanvas.height = BOARD_HEIGHT;
        const fullCtx = fullCanvas.getContext('2d');
        if (!fullCtx) throw new Error('Full canvas 2D context error');

        // Draw image covering full canvas nicely
        fullCtx.drawImage(img, 0, 0, BOARD_WIDTH, BOARD_HEIGHT);

        JIGSAW_GEOMETRY.forEach((geom) => {
          const pieceCanvas = document.createElement('canvas');
          pieceCanvas.width = geom.width;
          pieceCanvas.height = geom.height;
          const pCtx = pieceCanvas.getContext('2d');

          if (!pCtx) throw new Error('Piece canvas context error');

          pCtx.save();
          // Translate coordinate space so the piece path fits inside pieceCanvas
          pCtx.translate(-geom.minX, -geom.minY);

          // Clip to authentic jigsaw contour
          if (typeof Path2D !== 'undefined') {
            const path2d = new Path2D(geom.pathData);
            pCtx.clip(path2d);
          }

          // Draw the full image in position
          pCtx.drawImage(fullCanvas, 0, 0);
          pCtx.restore();

          pieces.push({
            id: geom.id,
            col: geom.col,
            row: geom.row,
            dataUrl: pieceCanvas.toDataURL('image/png'),
            isPlaced: false,
          });
        });

        resolve(pieces);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });
}

/**
 * Optimizes an uploaded file to fit neatly in localStorage and 800x400 standard aspect ratio
 */
export async function compressAndResizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Standard classroom aspect ratio 3:2 (900x600)
        canvas.width = BOARD_WIDTH;
        canvas.height = BOARD_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failure'));
          return;
        }

        // Fill background with clean neutral color before drawing
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image covering the canvas nicely
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (canvas.width - img.width * ratio) / 2;
        const centerShiftY = (canvas.height - img.height * ratio) / 2;

        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          centerShiftX,
          centerShiftY,
          img.width * ratio,
          img.height * ratio
        );

        // Export as JPEG with 0.82 quality to save localStorage space (~100KB)
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('Không thể đọc file ảnh này. Vui lòng chọn ảnh JPG, PNG hoặc WebP.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Lỗi khi đọc file ảnh.'));
    reader.readAsDataURL(file);
  });
}
