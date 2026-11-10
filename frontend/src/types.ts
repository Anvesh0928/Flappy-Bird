/**
 * Type definitions for Underwater Flappy Game
 */

export type GameStatus = 'READY' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';
export type SkinType = 'MANTA' | 'SUBMARINE' | 'SHARK' | 'ANGLER';
export type CollectibleType = 'PEARL' | 'SHIELD' | 'SLOWMO' | 'MAGNET';
export type DepthZone = 'SUNLIT' | 'TWILIGHT' | 'ABYSS';

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
  baseTopHeight: number;
  bottomY: number;
  width: number;
  gap: number;
  passed: boolean;
  oscAmp: number;
  oscSpeed: number;
  oscPhase: number;
}

export interface Collectible {
  x: number;
  y: number;
  radius: number;
  type: CollectibleType;
  phase: number;
  collected: boolean;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export interface ParallaxSilhouette {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'CORAL' | 'SHIP' | 'FISH_SCHOOL';
  speed: number;
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
  skin?: SkinType;
  date?: string;
}
