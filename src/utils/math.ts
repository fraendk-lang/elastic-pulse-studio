import { AutomationPoint, LFO, AutomationCurve } from '../types';

// Easing functions
const easeIn = (t: number) => t * t;
const easeOut = (t: number) => t * (2 - t);
const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
// Cubic Bezier approximation (ease-in-out cubic)
const bezier = (t: number) => t * t * (3 - 2 * t);

const applyCurve = (t: number, curve: AutomationCurve = 'linear'): number => {
  switch (curve) {
    case 'linear': return t;
    case 'ease': return ease(t);
    case 'easeIn': return easeIn(t);
    case 'easeOut': return easeOut(t);
    case 'easeInOut': return easeInOut(t);
    case 'bezier': return bezier(t);
    default: return t;
  }
};

export const getAutomatedValue = (points: AutomationPoint[] | undefined, base: number, timeRel: number): number => {
  if (!points || points.length === 0) return base;
  const sorted = [...points].sort((a, b) => a.t - b.t);
  if (timeRel <= sorted[0].t) return sorted[0].v;
  if (timeRel >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].v;
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i]; 
    const p2 = sorted[i+1];
    if (timeRel >= p1.t && timeRel <= p2.t) {
      const alpha = (timeRel - p1.t) / (p2.t - p1.t);
      const curve = p1.curve || 'linear';
      const easedAlpha = applyCurve(alpha, curve);
      return p1.v + (p2.v - p1.v) * easedAlpha;
    }
  }
  return base;
};

export const getLFOValue = (lfo: LFO, time: number, bpm: number = 120): number => {
  const freqHz = lfo.sync ? (bpm / 60) * lfo.freq : lfo.freq;
  const t = (time * freqHz) + lfo.phase;
  let val = 0;
  switch (lfo.type) {
    case 'sine': val = Math.sin(t * Math.PI * 2) * lfo.amp; break;
    case 'tri': val = (Math.abs((t % 1) * 2 - 1) * 2 - 1) * lfo.amp; break;
    case 'sqr': val = (t % 1 < 0.5 ? 1 : -1) * lfo.amp; break;
    case 'noise': val = (Math.sin(t * 123.45) * Math.cos(t * 678.90)) * lfo.amp; break;
  }
  return val + lfo.offset;
};

