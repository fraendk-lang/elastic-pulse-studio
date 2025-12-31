export type AppMode = 'home' | 'visuals';
export type DragType = 'move' | 'resize-start' | 'resize-end' | 'scrub' | 'timeline-resize' | 'fade-in' | 'fade-out' | 'loop-start' | 'loop-end' | 'loop-move' | 'automation-point' | null;
export type InspectorTab = 'params' | 'auto' | 'lfo' | 'audio' | 'master' | 'code' | 'midi';
export type AudioTieBand = 'sub' | 'bass' | 'lowMid' | 'mid' | 'highMid' | 'treble' | 'presence' | 'vol' | 'kick' | 'snare';
export type LFOType = 'sine' | 'tri' | 'sqr' | 'noise';
export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen' | 'overlay' | 'softlight' | 'hardlight' | 'dodge' | 'burn';
export type OverlayType = 'none' | 'terminal' | 'matrix' | 'blueprint' | 'radar' | 'glitch' | 'hacker' | 'topology' | 'circuit' | 'stars';
export type BackgroundType = 'none' | 'gradient' | 'noise' | 'grid' | 'particles' | 'waves' | 'ken-burns-1' | 'ken-burns-2' | 'ken-burns-3';

export interface Shader {
  id: string;
  name: string;
  code: string;
  color: string;
}

export type AutomationCurve = 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bezier';

export interface AutomationPoint { 
  t: number; 
  v: number;
  curve?: AutomationCurve; // Curve type for interpolation to next point
}

export interface LFO {
  id: string;
  target: string;
  type: LFOType;
  freq: number;
  amp: number;
  phase: number;
  offset: number;
  sync: boolean;
}

export interface TimelineClip {
  id: string;
  shaderId: string;
  track: number; 
  startTime: number;
  duration: number;
  timeStretch: number; // 0.25x to 4x (0.25 = 4x slower, 4 = 4x faster)
  opacity: number;
  fadeIn: number;
  fadeOut: number;
  blendMode: BlendMode;
  audioReactive: number; 
  audioTie: AudioTieBand;
  params: {
    speed: number; 
    intensity: number; 
    color: number; 
    kaleidoscope: number; 
    mirror: number; 
    glitch: number; 
    contrast: number; 
    saturation: number; 
    brightness: number; 
    hueRotate: number; 
    zoom: number; 
    distort: number;
    tieEffect: number; 
    feedbackDelay: number; 
    particles: number;
  };
  automation: Record<string, AutomationPoint[]>;
  lfos: LFO[];
  // Video support
  videoUrl?: string; // URL to video file
  videoElement?: HTMLVideoElement; // Video element for rendering
  isVideo?: boolean; // Flag to indicate if this is a video clip
  videoThumbnail?: string; // Thumbnail data URL
}

export interface MasterFX {
  bloom: number; 
  feedback: number; 
  smoothing: number; 
  bpm: number; 
  energyBuild: number;
  strobe: boolean; 
  blackout: boolean; 
  glitchHit: boolean; 
  invert: boolean; 
  zoomPunch: boolean; 
  chromaBurst: boolean; 
  feedbackDrive: boolean; 
  mirrorFlip: boolean;
  vignette: number; 
  chromaticAberration: number;
  masterVolume: number; 
  audioSmoothing: number;
  // New effects
  freeze: boolean;
  pixelate: number;
  edgeDetection: boolean;
  colorShift: number;
  noise: number;
  blur: number;
  sharpen: number;
  posterize: number;
  scanlines: boolean;
  rgbShift: number;
  kaleidoscope: number;
  fisheye: number;
  twirl: number;
  // Audio effects
  reverb: number;
  delay: number;
  delayFeedback: number;
  delayTime: number;
  distortion: number;
  lowpass: number;
  highpass: number;
  compressor: number;
  backgroundType: BackgroundType;
}

