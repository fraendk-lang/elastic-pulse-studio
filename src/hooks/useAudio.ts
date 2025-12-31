import { useState, useEffect, useRef } from 'react';
import type { TimelineClip, AudioTieBand } from '../types';

export interface AudioEffects {
  reverb: number;
  delay: number;
  delayFeedback: number;
  delayTime: number;
  distortion: number;
  lowpass: number;
  highpass: number;
  compressor: number;
}

export const useAudio = (isPlaying: boolean, clips: TimelineClip[], audioUrl: string | null, masterVolume: number, playhead: number, audioEffects?: AudioEffects, onDurationChange?: (duration: number) => void, onBPMDetected?: (bpm: number) => void) => {
  const [analysis, setAnalysis] = useState<Record<AudioTieBand, number>>({
    sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, presence: 0, vol: 0, kick: 0, snare: 0
  });
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [audioFileName, setAudioFileName] = useState<string>("No Track Loaded");
  const [detectedBPM, setDetectedBPM] = useState<number | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const isAudioConnectedRef = useRef(false);
  const audioAnalysisActiveRef = useRef(false);
  const audioLoopIdRef = useRef<number | null>(null);
  
  // Audio effect nodes
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayGainRef = useRef<GainNode | null>(null);
  const delayFeedbackRef = useRef<GainNode | null>(null);
  const distortionNodeRef = useRef<WaveShaperNode | null>(null);
  const lowpassRef = useRef<BiquadFilterNode | null>(null);
  const highpassRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  
  // BPM Detection
  const kickTimesRef = useRef<number[]>([]);
  const lastKickTimeRef = useRef<number>(0);

  // Audio warmup to prevent stuttering at start
  const warmupAudio = async () => {
    if (!audioRef.current || !audioUrl) return;
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      await new Promise(resolve => setTimeout(resolve, 100));
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } catch (e) {}
  };

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.volume = masterVolume;
      if (isPlaying) { 
        // Set playhead position before starting
        if (audioRef.current.currentTime !== playhead) {
          audioRef.current.currentTime = playhead;
        }
        warmupAudio().then(() => {
          // Double-check isPlaying is still true before playing
          if (audioRef.current && isPlaying) {
            audioRef.current.currentTime = playhead;
            audioRef.current.play().catch(() => {});
          }
        });
      } else { 
        // Ensure audio is really paused
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = playhead; // Keep playhead in sync
        }
      }
    }
  }, [isPlaying, audioUrl, masterVolume]); // Removed playhead from dependencies to prevent restart loops

  const initAudio = async () => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    
    if (!analyzerRef.current) {
        analyzerRef.current = ctx.createAnalyser(); 
        analyzerRef.current.fftSize = 1024; 
        analyzerRef.current.smoothingTimeConstant = 0.5;
    }
    
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    
    if (audioRef.current && audioUrl && !isAudioConnectedRef.current) { 
      try { 
          const s = ctx.createMediaElementSource(audioRef.current); 
          s.connect(analyzerRef.current); 
          analyzerRef.current.connect(ctx.destination); 
          isAudioConnectedRef.current = true;
      } catch(e) {}
    } else if (!isAudioConnectedRef.current) {
       try { 
           const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); 
           const s = ctx.createMediaStreamSource(stream); 
           s.connect(analyzerRef.current); 
           isAudioConnectedRef.current = true;
       } catch (e) {}
    }

    const getRangeEnergy = (start: number, end: number) => {
        let sum = 0;
        for (let i = start; i < end; i++) sum += dataArray[i];
        return sum / ((end - start) * 255);
    };

    let prevBass = 0;
    let prevMid = 0;

    const loop = () => {
      if (!analyzerRef.current || !audioAnalysisActiveRef.current) {
        audioLoopIdRef.current = null;
        return;
      }
      analyzerRef.current.getByteFrequencyData(dataArray);
      
      const raw = {
        sub: getRangeEnergy(0, 3),
        bass: getRangeEnergy(3, 12),
        lowMid: getRangeEnergy(12, 30),
        mid: getRangeEnergy(30, 80),
        highMid: getRangeEnergy(80, 150),
        treble: getRangeEnergy(150, 250),
        presence: getRangeEnergy(250, 512),
        vol: 0,
        kick: 0,
        snare: 0
      };
      raw.vol = (raw.bass + raw.mid + raw.treble) / 3;
      raw.kick = Math.max(0, raw.bass - prevBass) * 5.0;
      raw.snare = Math.max(0, raw.mid - prevMid) * 5.0;
      
      // BPM Detection: Track kick hits
      const now = performance.now();
      if (raw.kick > 0.3 && (now - lastKickTimeRef.current) > 200) {
        kickTimesRef.current.push(now);
        lastKickTimeRef.current = now;
        
        // Keep only last 10 kicks for BPM calculation
        if (kickTimesRef.current.length > 10) {
          kickTimesRef.current.shift();
        }
        
        // Calculate BPM from intervals
        if (kickTimesRef.current.length >= 4) {
          const intervals: number[] = [];
          for (let i = 1; i < kickTimesRef.current.length; i++) {
            intervals.push(kickTimesRef.current[i] - kickTimesRef.current[i - 1]);
          }
          // Use median interval to avoid outliers
          intervals.sort((a, b) => a - b);
          const medianInterval = intervals[Math.floor(intervals.length / 2)];
          const bpm = Math.round(60000 / medianInterval);
          
          // Only update if BPM is in reasonable range (60-200)
          if (bpm >= 60 && bpm <= 200) {
            setDetectedBPM(bpm);
            if (onBPMDetected) onBPMDetected(bpm);
          }
        }
      }
      
      prevBass = raw.bass;
      prevMid = raw.mid;

      setAnalysis(p => {
        const next = { ...p };
        (Object.keys(raw) as Array<keyof typeof raw>).forEach(k => {
          const target = raw[k];
          const current = p[k];
          const coeff = target > current ? 0.35 : 0.12; 
          next[k] = current + (target - current) * coeff;
        });
        return next;
      });
      audioLoopIdRef.current = requestAnimationFrame(loop);
    };
    
    const needsAudio = isPlaying || clips.some(c => c.audioReactive > 0);
    if (needsAudio && !audioAnalysisActiveRef.current) {
      audioAnalysisActiveRef.current = true;
      audioLoopIdRef.current = requestAnimationFrame(loop);
    } else if (!needsAudio && audioAnalysisActiveRef.current) {
      audioAnalysisActiveRef.current = false;
      if (audioLoopIdRef.current !== null) {
        cancelAnimationFrame(audioLoopIdRef.current);
        audioLoopIdRef.current = null;
      }
    }
  };

  useEffect(() => {
    const needsAudio = isPlaying || clips.some(c => c.audioReactive > 0);
    if (!needsAudio && audioAnalysisActiveRef.current) {
      audioAnalysisActiveRef.current = false;
      if (audioLoopIdRef.current !== null) {
        cancelAnimationFrame(audioLoopIdRef.current);
        audioLoopIdRef.current = null;
      }
    }
    return () => {
      if (audioLoopIdRef.current !== null) {
        cancelAnimationFrame(audioLoopIdRef.current);
      }
    };
  }, [isPlaying, clips]);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (!file) return null;
    setAudioFileName(file.name); 
    const url = URL.createObjectURL(file); 
    if (audioRef.current) {
      audioRef.current.src = url;
    }
    isAudioConnectedRef.current = false; 
    const reader = new FileReader(); 
    reader.onload = async (ev) => {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await audioContextRef.current.decodeAudioData(ev.target?.result as ArrayBuffer);
      if (onDurationChange) {
        onDurationChange(buffer.duration);
      }
      const rawData = buffer.getChannelData(0); 
      const samples = 1000; 
      const blockSize = Math.floor(rawData.length / samples);
      const peaks = []; 
      for(let i=0; i<samples; i++) {
        let sum = 0; 
        for(let j=0; j<blockSize; j++) sum += Math.abs(rawData[i*blockSize+j]);
        peaks.push(sum/blockSize);
      }
      setWaveformPeaks(peaks.map(p => p/Math.max(...peaks)));
    };
    reader.readAsArrayBuffer(file);
    return url;
  };

  return {
    analysis,
    waveformPeaks,
    audioFileName,
    detectedBPM,
    audioRef,
    analyzerRef,
    initAudio,
    handleAudioUpload,
    setAudioFileName
  };
};

