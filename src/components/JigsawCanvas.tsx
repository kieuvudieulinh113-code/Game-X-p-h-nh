import React from 'react';
import { PuzzlePiece } from '../types';
import { JIGSAW_GEOMETRY, BOARD_WIDTH, BOARD_HEIGHT } from '../utils/jigsaw';

interface JigsawCanvasProps {
  pieces: PuzzlePiece[];
  imageUrl: string;
  className?: string;
  showSeams?: boolean;
  showBadges?: boolean;
  showGuideNumbers?: boolean;
  onSlotClick?: (slotId: number) => void;
  hoveredSlotId?: number | null;
  hintSlotId?: number | null;
}

export const JigsawCanvas: React.FC<JigsawCanvasProps> = ({
  pieces,
  imageUrl,
  className = '',
  showSeams = true,
  showBadges = false,
  showGuideNumbers = false,
  onSlotClick,
  hoveredSlotId = null,
  hintSlotId = null,
}) => {
  return (
    <div
      className={`relative aspect-[3/2] w-full rounded-2xl overflow-hidden shadow-xl border-2 border-[#3a1d08] bg-[#1a0c03] ${className}`}
    >
      <svg
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
        className="w-full h-full block"
      >
        <defs>
          {JIGSAW_GEOMETRY.map((geom) => (
            <clipPath key={geom.id} id={`canvas-clip-${geom.id}`}>
              <path d={geom.pathData} />
            </clipPath>
          ))}
          <pattern
            id="canvasWood"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <rect width="40" height="40" fill="#241005" />
            <line x1="0" y1="0" x2="40" y2="0" stroke="#2e1507" strokeWidth="2" />
            <line x1="0" y1="20" x2="40" y2="20" stroke="#1c0c03" strokeWidth="1.5" />
          </pattern>
        </defs>

        {/* 1. Empty Slots / Cavities */}
        {JIGSAW_GEOMETRY.map((geom) => {
          const piece = pieces.find((p) => p.id === geom.id);
          if (piece?.isPlaced) return null;

          const isHovered = hoveredSlotId === geom.id;
          const isHint = hintSlotId === geom.id;

          return (
            <g
              key={`empty-slot-${geom.id}`}
              onClick={() => onSlotClick && onSlotClick(geom.id)}
              className={onSlotClick ? 'cursor-pointer' : ''}
            >
              {/* Cavity background */}
              <path
                d={geom.pathData}
                fill={isHovered ? '#3b1c07' : 'url(#canvasWood)'}
                stroke={isHint ? '#10b981' : isHovered ? '#f59e0b' : '#3d1d07'}
                strokeWidth={isHint || isHovered ? 3 : 1.5}
              />

              {/* Inner recessed shadow */}
              <path
                d={geom.pathData}
                fill="none"
                stroke="#000000"
                strokeWidth="2"
                strokeOpacity="0.6"
              />

              {/* Optional Guide dot */}
              {(isHint || showGuideNumbers) && (
                <g>
                  <circle
                    cx={geom.centerX}
                    cy={geom.centerY}
                    r={isHint ? 12 : 9}
                    fill={isHint ? '#10b981' : '#ea580c'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={geom.centerX}
                    y={geom.centerY + 3.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="900"
                    fontFamily="monospace"
                  >
                    {geom.id + 1}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* 2. Placed Pieces - Unified & Continuous */}
        {JIGSAW_GEOMETRY.map((geom) => {
          const piece = pieces.find((p) => p.id === geom.id);
          if (!piece?.isPlaced) return null;

          return (
            <g key={`placed-piece-${geom.id}`}>
              {/* Clipped image from master painting */}
              <image
                href={imageUrl}
                x="0"
                y="0"
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                preserveAspectRatio="none"
                clipPath={`url(#canvas-clip-${geom.id})`}
              />

              {/* Seamless authentic jigsaw contour line */}
              {showSeams && (
                <>
                  <path
                    d={geom.pathData}
                    fill="none"
                    stroke="#000000"
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />
                  <path
                    d={geom.pathData}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="0.8"
                    strokeOpacity="0.2"
                  />
                </>
              )}

              {/* Team badge if enabled */}
              {showBadges && piece.placedByTeam && (
                <g
                  transform={`translate(${geom.centerX + 48}, ${geom.centerY + 55})`}
                  className="pointer-events-none select-none"
                >
                  <rect
                    x="-20"
                    y="-9"
                    width="40"
                    height="18"
                    rx="5"
                    fill={piece.placedByTeam === 'teamA' ? '#0891b2' : '#e11d48'}
                    fillOpacity="0.9"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {piece.placedByTeam === 'teamA' ? 'Đội 1' : 'Đội 2'}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
