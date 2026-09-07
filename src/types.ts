export type GradeLevel = 'lop3' | 'lop4' | 'khac';

export interface Question {
  id: string;
  text: string;
  options: string[]; // typically 4 options: A, B, C, D
  correctOptionIndex: number; // 0, 1, 2, 3
  explanation?: string;
  needsConfirmation?: boolean; // if parsed with low confidence or no answer key found
}

export interface QuestionBank {
  id: string;
  title: string;
  grade: GradeLevel;
  description: string;
  questions: Question[];
  createdAt: number;
  isDefault?: boolean;
}

export interface MysteryImage {
  id: string;
  title: string;
  dataUrl: string; // base64 image or svg data url
  description?: string;
  isDefault?: boolean;
}

export interface PuzzlePiece {
  id: number; // 0 to 7
  col: number; // 0 to 3
  row: number; // 0 to 1
  dataUrl?: string; // extracted slice
  isPlaced: boolean;
  placedByTeam?: 'teamA' | 'teamB';
}

export interface Team {
  id: 'teamA' | 'teamB';
  name: string;
  color: string; // 'blue' | 'amber' etc.
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeBg: string;
  score: number;
  piecesCollected: number;
  motionScoreTotal: number;
  correctAnswersCount: number;
}

export type GamePhase =
  | 'setup'         // Teacher configures teams, selects question bank & mystery image
  | 'ready'         // Ready for next round: choose student representative, start countdown
  | 'motion'        // 10s physical motion phase via camera or manual referee
  | 'motion_result' // Announce who won the motion right
  | 'answer'        // Winning team answers question within time limit
  | 'puzzle'        // Correct answer grants placing 1 puzzle piece
  | 'round_end'     // Round wrap up, show current state, next turn button
  | 'victory';      // 8th piece placed! Full celebration, certificate, statistics

export interface MotionScoreState {
  teamAScore: number;
  teamBScore: number;
  teamAValid: boolean;
  teamBValid: boolean;
  winner: 'teamA' | 'teamB' | 'tie' | 'none';
}
