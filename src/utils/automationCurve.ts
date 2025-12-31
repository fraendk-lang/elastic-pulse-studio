import type { AutomationPoint, AutomationCurve } from '../types';

// Generate SVG path for automation curve
export const generateAutomationPath = (
  points: AutomationPoint[],
  width: number,
  height: number,
  minValue: number = 0,
  maxValue: number = 1
): string => {
  if (!points || points.length === 0) return '';
  
  const sorted = [...points].sort((a, b) => a.t - b.t);
  if (sorted.length === 1) {
    const y = height - ((sorted[0].v - minValue) / (maxValue - minValue)) * height;
    return `M 0 ${y} L ${width} ${y}`;
  }
  
  const path: string[] = [];
  const step = width / 200; // Sample 200 points for smooth curves
  
  for (let x = 0; x <= width; x += step) {
    const t = x / width;
    let value = minValue;
    
    // Find value at time t
    if (t <= sorted[0].t) {
      value = sorted[0].v;
    } else if (t >= sorted[sorted.length - 1].t) {
      value = sorted[sorted.length - 1].v;
    } else {
      for (let i = 0; i < sorted.length - 1; i++) {
        const p1 = sorted[i];
        const p2 = sorted[i + 1];
        if (t >= p1.t && t <= p2.t) {
          const alpha = (t - p1.t) / (p2.t - p1.t);
          const curve = p1.curve || 'linear';
          const easedAlpha = applyCurve(alpha, curve);
          value = p1.v + (p2.v - p1.v) * easedAlpha;
          break;
        }
      }
    }
    
    const y = height - ((value - minValue) / (maxValue - minValue)) * height;
    if (x === 0) {
      path.push(`M ${x} ${y}`);
    } else {
      path.push(`L ${x} ${y}`);
    }
  }
  
  return path.join(' ');
};

const applyCurve = (t: number, curve: AutomationCurve): number => {
  switch (curve) {
    case 'linear': return t;
    case 'ease': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'easeIn': return t * t;
    case 'easeOut': return 1 - (1 - t) * (1 - t);
    case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'bezier': return t * t * (3 - 2 * t); // Smoothstep approximation
    default: return t;
  }
};

// Get parameter min/max values
export const getParamRange = (paramName: string): { min: number; max: number } => {
  const ranges: Record<string, { min: number; max: number }> = {
    intensity: { min: 0, max: 2 },
    speed: { min: 0, max: 4 },
    zoom: { min: 0, max: 3 },
    opacity: { min: 0, max: 1 },
    contrast: { min: 0, max: 2 },
    saturation: { min: 0, max: 2 },
    brightness: { min: -1, max: 1 },
    hueRotate: { min: 0, max: 1 },
    distort: { min: 0, max: 2 },
    tieEffect: { min: 0, max: 1 },
    feedbackDelay: { min: 0, max: 1 },
    kaleidoscope: { min: 0, max: 12 },
    particles: { min: 0, max: 1 },
  };
  return ranges[paramName] || { min: 0, max: 1 };
};

// Get color for parameter
export const getParamColor = (paramName: string): string => {
  const colors: Record<string, string> = {
    intensity: '#ffdc5e',
    speed: '#3b82f6',
    zoom: '#10b981',
    opacity: '#f59e0b',
    contrast: '#ef4444',
    saturation: '#8b5cf6',
    brightness: '#ec4899',
    hueRotate: '#06b6d4',
    distort: '#f97316',
    tieEffect: '#84cc16',
    feedbackDelay: '#6366f1',
    kaleidoscope: '#ec4899',
    particles: '#14b8a6',
  };
  return colors[paramName] || '#ffdc5e';
};

