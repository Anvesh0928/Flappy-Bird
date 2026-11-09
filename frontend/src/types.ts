/**
 * Type definitions for Underwater Flappy Game
 */

export type GameStatus = 'READY' | 'PLAYING' | 'GAMEOVER';
export type SkinType = 'MANTA' | 'SUBMARINE' | 'SHARK';

export interface Fish {
  x: number;
  y: number;
  radius: number;
  width: number;
  height: number;
  velocity: number;
  gravity: number;
  swimForce: number;
  rotation: number;
  finAngle: number;
  skin: SkinType;
}

export interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  width: number;
  gap: number;
  passed: boolean;
}

export interface Bubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wobbleSpeed: number;
  wobbleDistance: number;
  baseX: number;
  alpha: number;
}

export interface ScoreRecord {
  name: string;
  score: number;
  date?: string;
}

export interface GameSettings {
  pipeSpeed: number;
  pipeSpawnInterval: number;
  pipeGap: number;
  gravity: number;
  swimForce: number;
}

