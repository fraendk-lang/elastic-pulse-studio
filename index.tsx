
import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  Trash2, Zap, Code, Mic, Music, RefreshCw,
  Square, Play, Pause, RotateCcw, Sparkles, Activity as Pulse, 
  Wand2, ChevronRight, X, Layers, Monitor, Binary, Waves, Diamond, 
  Plus, Maximize2, Minimize2, Settings2, Sliders, Combine, Palette,
  Copy, Magnet, Target as TargetIcon, MousePointer2, VolumeX, Eye, EyeOff, Timer, AlertCircle,
  Activity, Download, Video, MousePointer, Search, MoveHorizontal, Volume2, AudioLines,
  Cpu, Terminal, Radio, ShieldCheck, Blend as BlendIcon, Layers3, MoreVertical, GripHorizontal,
  Upload, Gauge, Wind, Sun, Moon, Cloud, Flame, Droplets, Zap as ZapIcon, AlertTriangle,
  Mail, FileText, Send
} from 'lucide-react';

// Import types and constants
import type { 
  AppMode, DragType, InspectorTab, AudioTieBand, LFOType, BlendMode, OverlayType,
  Shader, AutomationPoint, LFO, TimelineClip, MasterFX, AutomationCurve, BackgroundType
} from './src/types';
import { INITIAL_SHADERS } from './src/constants/shaders';
import { getAutomatedValue, getLFOValue } from './src/utils/math';
import { generateAutomationPath, getParamRange, getParamColor } from './src/utils/automationCurve';
import { ErrorBoundary, ControlSlider, TextModeOverlay, ShaderThumbnail, MasterXYPad, HomeBackground, ShaderCanvas, SequencerHeader, ShaderEditor, ExportDialog, PresetsManager, KeyboardShortcutsHelp, PerformanceMonitor, BackgroundLayer } from './src/components';
import type { ExportSettings } from './src/components/ExportDialog';
import { useAudio, useHistory, useMIDI } from './src/hooks';
import { MIDIPanel } from './src/components/MIDIPanel';

// Math helpers are now imported from utils

// Components are now imported from src/components


// --- App Shell ---
const SequencerView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [shaders, setShaders] = useState<Shader[]>(() => JSON.parse(localStorage.getItem('ep_shaders_v32_11') || JSON.stringify(INITIAL_SHADERS)));
  const [shaderErrors, setShaderErrors] = useState<Record<string, string | null>>({});
  const [selectedShaderCategory, setSelectedShaderCategory] = useState<string>('all');
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [playhead, setPlayhead] = useState(0);
  const [totalDuration, setTotalDuration] = useState(120); 
  const [timelineZoom, setTimelineZoom] = useState(25); 
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InspectorTab>('params');
  const [footerHeight, setFooterHeight] = useState(320);
  const [overlayMode, setOverlayMode] = useState<OverlayType>('none');
  const [logoHold, setLogoHold] = useState(false);
  
  const [masterFX, setMasterFX] = useState<MasterFX>({ 
    bloom: 0.2, feedback: 0, smoothing: 0.15, bpm: 128, energyBuild: 0, 
    strobe: false, blackout: false, glitchHit: false, invert: false, 
    zoomPunch: false, chromaBurst: false, feedbackDrive: false, mirrorFlip: false,
    vignette: 0, chromaticAberration: 0,
    masterVolume: 1.0, audioSmoothing: 0.2,
    freeze: false, pixelate: 0, edgeDetection: false, colorShift: 0,
    noise: 0, blur: 0, sharpen: 0, posterize: 0, scanlines: false,
    rgbShift: 0, kaleidoscope: 0, fisheye: 0, twirl: 0,
    reverb: 0, delay: 0, delayFeedback: 0.3, delayTime: 0.25, distortion: 0,
    lowpass: 20000, highpass: 0, compressor: 0,
    backgroundType: 'none'
  });
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [useSnapping, setUseSnapping] = useState(true);
  const [trackMutes, setTrackMutes] = useState(Array(8).fill(false));
  const [trackSolos, setTrackSolos] = useState(Array(8).fill(false));
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<{ id: string | null, type: DragType, startX: number, startY: number, initialStart: number, initialDuration: number, initialTrack: number, initialHeight: number, initialFadeIn: number, initialFadeOut: number } | null>(null);
  const [autoParam, setAutoParam] = useState<string>("intensity");
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, clipId: string } | null>(null);
  const [copiedClips, setCopiedClips] = useState<TimelineClip[]>([]);
  const [copiedAutomation, setCopiedAutomation] = useState<{ param: string; points: AutomationPoint[] } | null>(null);
  const [markers, setMarkers] = useState<Array<{ id: string, time: number, label?: string }>>([]);
  const [loopRegion, setLoopRegion] = useState<{ start: number; end: number } | null>(null);
  const [beatGrid, setBeatGrid] = useState<number>(4); // 1/4, 1/8, 1/16, etc.
  const [showAutomationLanes, setShowAutomationLanes] = useState(true);
  const [expandedAutomationParams, setExpandedAutomationParams] = useState<Record<string, string[]>>({}); // clipId -> param names

  // Use custom hooks
  const { undo, redo, canUndo, canRedo } = useHistory(clips, setClips);
  
  // MIDI Hook (must be before useAudio to use midiBPM in callback)
  const {
    devices: midiDevices,
    isConnected: midiConnected,
    activeDevice: midiDevice,
    learnedMappings: midiMappings,
    learnMode: midiLearnMode,
    bpm: midiBPM,
    connectDevice: connectMIDI,
    disconnectDevice: disconnectMIDI,
    startLearn: startMIDILearn,
    cancelLearn: cancelMIDILearn,
    removeMapping: removeMIDIMapping,
    updateMapping: updateMIDIMapping,
    registerCallback: registerMIDICallback,
  } = useMIDI();
  
  const { 
    analysis, 
    waveformPeaks, 
    audioFileName, 
    detectedBPM,
    audioRef, 
    analyzerRef, 
    initAudio, 
    handleAudioUpload: handleAudioUploadHook,
    setAudioFileName 
  } = useAudio(isPlaying, clips, audioUrl, masterFX.masterVolume, playhead, {
    reverb: masterFX.reverb,
    delay: masterFX.delay,
    delayFeedback: masterFX.delayFeedback,
    delayTime: masterFX.delayTime,
    distortion: masterFX.distortion,
    lowpass: masterFX.lowpass,
    highpass: masterFX.highpass,
    compressor: masterFX.compressor,
  }, setTotalDuration, (bpm) => {
    // Auto-update BPM when detected (only if MIDI BPM not available)
    if (!midiBPM) {
      setMasterFX(p => ({ ...p, bpm }));
    }
  });
  
  // Use MIDI BPM if available
  useEffect(() => {
    if (midiBPM) {
      setMasterFX(p => ({ ...p, bpm: midiBPM }));
    }
  }, [midiBPM]);
  
  // MIDI Callbacks
  useEffect(() => {
    const unregisterBPM = registerMIDICallback('masterBPM', (value) => {
      setMasterFX(p => ({ ...p, bpm: Math.round(value) }));
    });
    const unregisterBloom = registerMIDICallback('masterBloom', (value) => {
      setMasterFX(p => ({ ...p, bloom: value }));
    });
    const unregisterFeedback = registerMIDICallback('masterFeedback', (value) => {
      setMasterFX(p => ({ ...p, feedback: value }));
    });
    const unregisterPlayPause = registerMIDICallback('playPause', () => {
      setIsPlaying(p => !p);
    });
    const unregisterReset = registerMIDICallback('reset', () => {
      setPlayhead(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
      setIsPlaying(false);
    });
    
    return () => {
      unregisterBPM();
      unregisterBloom();
      unregisterFeedback();
      unregisterPlayPause();
      unregisterReset();
    };
  }, [registerMIDICallback, setIsPlaying, setPlayhead, audioRef]);

  const activeClip = useMemo(() => clips.find(c => c.id === activeClipId), [clips, activeClipId]);
  const timelineRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('ep_shaders_v32_11', JSON.stringify(shaders)); }, [shaders]);

  // Handle audio upload and set URL
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = handleAudioUploadHook(e);
    if (url) {
      setAudioUrl(url);
    }
  };

  // Handle video upload and create video clip
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Check if file is a video
      if (!file.type.startsWith('video/')) {
        alert('Bitte wählen Sie eine Video-Datei aus.');
        return;
      }
      
      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true; // Mute for autoplay
      
      // Wait for video metadata to load
      await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Video metadata loading timeout'));
      }, 10000); // 10 second timeout
      
      video.onloadedmetadata = () => {
        (async () => {
          try {
            clearTimeout(timeout);
            
            // Ensure video has valid duration
            if (!video.duration || !isFinite(video.duration) || video.duration <= 0) {
              reject(new Error('Invalid video duration'));
              return;
            }
            
            const videoDuration = video.duration;
            
            // Generate thumbnail
            video.currentTime = Math.min(0.1, videoDuration * 0.1);
            await new Promise(r => setTimeout(r, 300)); // Wait longer for frame to load
            
            const canvas = document.createElement('canvas');
            const vWidth = video.videoWidth || 1920;
            const vHeight = video.videoHeight || 1080;
            
            if (vWidth <= 0 || vHeight <= 0) {
              reject(new Error('Invalid video dimensions'));
              return;
            }
            
            canvas.width = vWidth;
            canvas.height = vHeight;
            const ctx = canvas.getContext('2d');
            let thumbnail = '';
            
            if (ctx && vWidth > 0 && vHeight > 0) {
              try {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                thumbnail = canvas.toDataURL('image/jpeg', 0.7);
              } catch (e) {
                console.warn('Failed to generate thumbnail:', e);
                // Continue without thumbnail
              }
            }
            
            // Find last clip end time
            const lastClipEnd = clips.length > 0 
              ? Math.max(...clips.map(c => c.startTime + c.duration))
              : 0;
            
            // Create video clip
            const newClip: TimelineClip = {
              id: `v-${Date.now()}`,
              shaderId: shaders.length > 0 ? shaders[0].id : '', // Default to first shader, can be changed
              track: 0,
              startTime: lastClipEnd,
              duration: videoDuration,
              timeStretch: 1,
              opacity: 1,
              fadeIn: 0.5,
              fadeOut: 0.5,
              blendMode: 'normal',
              audioReactive: 0,
              audioTie: 'vol',
              params: {
                speed: 1,
                intensity: 1,
                color: 0.5,
                kaleidoscope: 0,
                mirror: 0,
                glitch: 0,
                contrast: 1,
                saturation: 1,
                brightness: 0,
                hueRotate: 0,
                zoom: 0,
                distort: 0,
                tieEffect: 0,
                feedbackDelay: 0,
                particles: 0,
              },
              automation: {},
              lfos: [],
              videoUrl,
              videoElement: video,
              isVideo: true,
              videoThumbnail: thumbnail,
            };
            
            setClips(p => [...p, newClip]);
            setActiveClipId(newClip.id);
            resolve();
          } catch (err) {
            reject(err);
          }
        })();
      };
      video.onerror = (err) => {
        clearTimeout(timeout);
        reject(new Error('Video loading failed'));
      };
    });
    
    // Reset input
    e.target.value = '';
  } catch (error) {
    console.error('Video upload error:', error);
    alert('Fehler beim Laden des Videos. Bitte versuchen Sie es erneut.');
    e.target.value = '';
  }
};

  // Beat-sync calculation
  const getBeatInterval = () => {
    const bpm = masterFX.bpm || 120;
    const beatsPerSecond = bpm / 60;
    const beatInterval = 1 / beatsPerSecond;
    // Divide by beatGrid (4 = quarter note, 8 = eighth, 16 = sixteenth)
    return beatInterval / (beatGrid / 4);
  };
  
  const snapValue = (val: number) => {
    if (!useSnapping) return val;
    if (beatGrid > 0) {
      const interval = getBeatInterval();
      return Math.round(val / interval) * interval;
    }
    const gridSize = 0.25;
    return Math.round(val / gridSize) * gridSize;
  };
  
  const startDrag = (e: React.MouseEvent, id: string | null, type: DragType) => {
    if (e.button !== 0 && type !== 'timeline-resize') return; 
    e.stopPropagation();
    
    // Handle loop region drag
    if (type?.startsWith('loop-') && loopRegion) {
      if (type === 'loop-start') {
        setDragInfo({ 
          id: null, type, startX: e.clientX, startY: e.clientY, 
          initialStart: loopRegion.start, 
          initialDuration: 0, 
          initialTrack: 0,
          initialHeight: footerHeight,
          initialFadeIn: 0,
          initialFadeOut: 0
        });
      } else if (type === 'loop-end') {
        setDragInfo({ 
          id: null, type, startX: e.clientX, startY: e.clientY, 
          initialStart: loopRegion.end, 
          initialDuration: 0, 
          initialTrack: 0,
          initialHeight: footerHeight,
          initialFadeIn: 0,
          initialFadeOut: 0
        });
      } else if (type === 'loop-move') {
        setDragInfo({ 
          id: null, type, startX: e.clientX, startY: e.clientY, 
          initialStart: loopRegion.start, 
          initialDuration: loopRegion.end - loopRegion.start, 
          initialTrack: 0,
          initialHeight: footerHeight,
          initialFadeIn: 0,
          initialFadeOut: 0
        });
      }
      return;
    }
    
    if (id) setActiveClipId(id);
    const clip = clips.find(c => c.id === id);
    setDragInfo({ 
      id, type, startX: e.clientX, startY: e.clientY, 
      initialStart: id ? clip!.startTime : playhead, 
      initialDuration: id ? clip!.duration : totalDuration, 
      initialTrack: id ? clip!.track : 0,
      initialHeight: footerHeight,
      initialFadeIn: id ? clip!.fadeIn : 0,
      initialFadeOut: id ? clip!.fadeOut : 0
    });
  };

  const handleContextMenu = (e: React.MouseEvent, clipId: string) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, clipId }); };
  const duplicateClip = (id: string) => {
    const original = clips.find(c => c.id === id); if (!original) return;
    const nc: TimelineClip = { ...JSON.parse(JSON.stringify(original)), id: `c-${Date.now()}`, startTime: original.startTime + original.duration };
    setClips(p => [...p, nc]); setActiveClipId(nc.id); setContextMenu(null);
  };

  const copyClips = (clipIds: string[]) => {
    const clipsToCopy = clips.filter(c => clipIds.includes(c.id));
    if (clipsToCopy.length > 0) {
      setCopiedClips(JSON.parse(JSON.stringify(clipsToCopy)));
      // Also copy to clipboard for external use
      navigator.clipboard.writeText(JSON.stringify(clipsToCopy)).catch(() => {});
    }
  };

  const pasteClips = (atTime?: number) => {
    if (copiedClips.length === 0) return;
    const pasteTime = atTime !== undefined ? atTime : playhead;
    const timeOffset = pasteTime - (copiedClips[0]?.startTime || 0);
    
    const newClips: TimelineClip[] = copiedClips.map((clip, idx) => ({
      ...JSON.parse(JSON.stringify(clip)),
      id: `c-${Date.now()}-${idx}`,
      startTime: snapValue((clip.startTime + timeOffset)),
    }));
    
    setClips(p => [...p, ...newClips]);
    if (newClips.length > 0) setActiveClipId(newClips[0].id);
  };

  const addMarker = (time?: number) => {
    const markerTime = time !== undefined ? time : playhead;
    const newMarker = {
      id: `m-${Date.now()}`,
      time: snapValue(markerTime),
      label: `Marker ${markers.length + 1}`
    };
    setMarkers(p => [...p, newMarker].sort((a, b) => a.time - b.time));
  };

  const removeMarker = (id: string) => {
    setMarkers(p => p.filter(m => m.id !== id));
  };

  const jumpToMarker = (time: number) => {
    setPlayhead(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const handleMinimapClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newP = (x / rect.width) * totalDuration;
    setPlayhead(newP);
    if (audioRef.current) audioRef.current.currentTime = newP;
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragInfo) return;
      if (dragInfo.type === 'timeline-resize') { setFooterHeight(Math.max(160, Math.min(window.innerHeight * 0.8, dragInfo.initialHeight + (dragInfo.startY - e.clientY)))); return; }
      if (!timelineRef.current) return;
      const dxSeconds = (e.clientX - dragInfo.startX) / timelineZoom;
      
      // Loop region dragging
      if (dragInfo.type === 'loop-start' && loopRegion) {
        const newStart = snapValue(Math.max(0, Math.min(loopRegion.end - 0.1, dragInfo.initialStart + dxSeconds)));
        setLoopRegion({ ...loopRegion, start: newStart });
        return;
      }
      if (dragInfo.type === 'loop-end' && loopRegion) {
        const newEnd = snapValue(Math.max(loopRegion.start + 0.1, Math.min(totalDuration, dragInfo.initialStart + dxSeconds)));
        setLoopRegion({ ...loopRegion, end: newEnd });
        return;
      }
      if (dragInfo.type === 'loop-move' && loopRegion) {
        const loopDuration = loopRegion.end - loopRegion.start;
        const newStart = snapValue(Math.max(0, Math.min(totalDuration - loopDuration, dragInfo.initialStart + dxSeconds)));
        setLoopRegion({ start: newStart, end: newStart + loopDuration });
        return;
      }
      
      if (dragInfo.type === 'scrub') { 
        const newP = Math.max(0, Math.min(totalDuration, dragInfo.initialStart + dxSeconds));
        setPlayhead(newP); 
        if (audioRef.current && isPlaying) audioRef.current.currentTime = newP;
        return; 
      }
      setClips(p => p.map(c => {
        if (c.id !== dragInfo.id) return c;
        if (dragInfo.type === 'move') { return { ...c, startTime: snapValue(Math.max(0, Math.min(totalDuration - c.duration, dragInfo.initialStart + dxSeconds))), track: Math.max(0, Math.min(7, dragInfo.initialTrack + Math.round((e.clientY - dragInfo.startY) / (footerHeight / 9)))) }; }
        if (dragInfo.type === 'resize-end') return { ...c, duration: snapValue(Math.max(0.1, dragInfo.initialDuration + dxSeconds)) };
        if (dragInfo.type === 'resize-start') { const s = snapValue(Math.max(0, dragInfo.initialStart + dxSeconds)); return { ...c, startTime: s, duration: Math.max(0.1, dragInfo.initialDuration - (s - dragInfo.initialStart)) }; }
        if (dragInfo.type === 'fade-in') return { ...c, fadeIn: Math.max(0, Math.min(c.duration - c.fadeOut, dragInfo.initialFadeIn + dxSeconds)) };
        if (dragInfo.type === 'fade-out') return { ...c, fadeOut: Math.max(0, Math.min(c.duration - c.fadeIn, dragInfo.initialFadeOut - dxSeconds)) };
        if (dragInfo.type === 'automation-point' && dragInfo.automationParam && dragInfo.automationTime !== undefined && dragInfo.automationValue !== undefined) {
          const clip = clips.find(cl => cl.id === dragInfo.id);
          if (!clip) return c;
          const param = dragInfo.automationParam;
          const points = [...(clip.automation[param] || [])];
          const pointIndex = points.findIndex(p => p.t === dragInfo.automationTime);
          if (pointIndex >= 0) {
            const newTime = Math.max(0, Math.min(1, dragInfo.automationTime + dxSeconds / clip.duration));
            const range = getParamRange(param);
            const dyPercent = (dragInfo.startY - e.clientY) / (footerHeight * 0.08); // Lane height
            const newValue = Math.max(range.min, Math.min(range.max, dragInfo.automationValue + (dyPercent * (range.max - range.min))));
            const updatedPoints = [...points];
            updatedPoints[pointIndex] = { ...updatedPoints[pointIndex], t: newTime, v: newValue };
            return { ...c, automation: { ...c.automation, [param]: updatedPoints } };
          }
        }
        return c;
      }));
    };
    const onUp = () => setDragInfo(null);
    window.addEventListener('mousemove', onMove); 
    window.addEventListener('mouseup', onUp);
    
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragInfo, useSnapping, totalDuration, timelineZoom, footerHeight, isPlaying, loopRegion]);

  useEffect(() => {
    if (!isPlaying) {
      // When stopped, ensure audio is paused
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      return;
    }
    
    let rafId: number;
    let last = performance.now();
    const loop = (t: number) => { 
        // Check if still playing
        if (!isPlaying) {
          if (audioRef.current) audioRef.current.pause();
          return;
        }
        
        const dt = (t - last) / 1000; 
        last = t; 
        setPlayhead(p => {
          // Use audio time if available and playing, otherwise use delta time
          let nextP: number;
          if (audioRef.current && audioUrl && !audioRef.current.paused && audioRef.current.readyState >= 2) {
            // Audio is loaded and playing, use its time
            nextP = audioRef.current.currentTime;
          } else {
            // No audio or audio not playing, use delta time
            nextP = p + dt;
          }
          
          // Loop region handling
          if (loopRegion && nextP >= loopRegion.end) {
            const newP = loopRegion.start;
            if (audioRef.current && audioUrl) {
              audioRef.current.currentTime = newP;
            }
            return newP;
          }
          
          if (nextP >= totalDuration) {
              if (loopRegion) {
                // Loop back to loop region start
                const newP = loopRegion.start;
                if (audioRef.current && audioUrl) {
                  audioRef.current.currentTime = newP;
                }
                return newP;
              } else {
              setIsPlaying(false);
              if (audioRef.current) audioRef.current.pause();
              return 0;
              }
          }
          return nextP;
        }); 
        rafId = requestAnimationFrame(loop); 
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      // Ensure audio is paused when effect cleans up
      if (audioRef.current && !isPlaying) {
        audioRef.current.pause();
      }
    };
  }, [isPlaying, totalDuration, loopRegion, audioUrl]);

  const [autoCurve, setAutoCurve] = useState<AutomationCurve>('linear');
  const [showPresetsManager, setShowPresetsManager] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

  const addKeyframe = (key: string) => {
    if (!activeClip) return; const tRel = (playhead - activeClip.startTime) / activeClip.duration; if (tRel < 0 || tRel > 1) return;
    const val = (activeClip.params[key as keyof TimelineClip['params']] ?? activeClip[key as keyof TimelineClip] ?? 1);
    setClips(p => p.map(c => {
        if (c.id !== activeClipId) return c;
        const pts = [...(c.automation[key] || [])]; const idx = pts.findIndex(p => Math.abs(p.t - tRel) < 0.005);
        if (idx !== -1) {
          pts[idx] = { t: tRel, v: typeof val === 'number' ? val : 1, curve: autoCurve };
        } else {
          pts.push({ t: tRel, v: typeof val === 'number' ? val : 1, curve: autoCurve });
        }
        return { ...c, automation: {...c.automation, [key]: pts.sort((a,b) => a.t - b.t)}};
    }));
  };

  const removeKeyframe = (key: string, t: number) => setClips(p => p.map(c => c.id === activeClipId ? { ...c, automation: {...c.automation, [key]: (c.automation[key] || []).filter(p => p.t !== t)}} : c));
  
  const copyAutomation = (param: string) => {
    if (!activeClip) return;
    const points = activeClip.automation[param] || [];
    if (points.length > 0) {
      setCopiedAutomation({ param, points: JSON.parse(JSON.stringify(points)) });
    }
  };
  
  const pasteAutomation = (targetParam?: string) => {
    if (!copiedAutomation || !activeClip) return;
    const param = targetParam || copiedAutomation.param;
    setClips(p => p.map(c => c.id === activeClipId ? { 
      ...c, 
      automation: {
        ...c.automation, 
        [param]: JSON.parse(JSON.stringify(copiedAutomation.points))
      }
    } : c));
  };
  
  const addLFO = () => activeClip && setClips(p => p.map(c => c.id === activeClipId ? {...c, lfos: [...c.lfos, { id: `lfo-${Date.now()}`, target: 'intensity', type: 'sine', freq: 1, amp: 0.5, phase: 0, offset: 0, sync: true }]} : c));

  const rulerTicks = useMemo(() => {
    const ticks = []; const step = timelineZoom > 100 ? 0.5 : (timelineZoom > 40 ? 1 : 5);
    for (let i = 0; i <= totalDuration; i += step) ticks.push(i); return ticks;
  }, [totalDuration, timelineZoom]);

  const handleShaderError = (id: string, log: string | null) => {
    if (shaderErrors[id] !== log) {
      setShaderErrors(p => ({ ...p, [id]: log }));
    }
  };

  const cycleOverlay = () => {
    const modes: OverlayType[] = ['none', 'terminal', 'matrix', 'blueprint', 'radar', 'glitch', 'hacker', 'topology', 'circuit', 'stars'];
    const currentIdx = modes.indexOf(overlayMode);
    setOverlayMode(modes[(currentIdx + 1) % modes.length]);
  };

  // Project Save/Load (defined before useEffect to avoid hoisting issues)
  const saveProject = () => {
    const project = {
      clips,
      shaders,
      masterFX,
      totalDuration,
      markers,
      version: '1.1'
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elastic-pulse-project-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const project = JSON.parse(ev.target?.result as string);
          if (project.clips) setClips(project.clips);
          if (project.shaders) setShaders(project.shaders);
          if (project.masterFX) setMasterFX(project.masterFX);
          if (project.totalDuration) setTotalDuration(project.totalDuration);
          if (project.markers) setMarkers(project.markers);
        } catch (e) {
          console.error('Failed to load project:', e);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Export Function (defined before useEffect to avoid hoisting issues)
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportCurrentFrame, setExportCurrentFrame] = useState<number | undefined>(undefined);
  const [exportTotalFrames, setExportTotalFrames] = useState<number | undefined>(undefined);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  const handleExport = async (settings?: ExportSettings) => {
    if (!canvasRef.current || isExporting) return;
    const canvas = canvasRef.current;
    
    // If no settings provided, show dialog
    if (!settings) {
      setShowExportDialog(true);
      return;
    }
    
    // Ensure required settings have defaults - be more lenient with validation
    // Handle case where resolution might be missing or invalid
    let resolutionWidth = 1920;
    let resolutionHeight = 1080;
    
    if (settings.resolution) {
      if (typeof settings.resolution.width === 'number' && settings.resolution.width > 0) {
        resolutionWidth = settings.resolution.width;
      }
      if (typeof settings.resolution.height === 'number' && settings.resolution.height > 0) {
        resolutionHeight = settings.resolution.height;
      }
    }
    
    const exportSettings: ExportSettings = {
      format: settings.format || 'mp4',
      preset: settings.preset || 'high',
      fps: (typeof settings.fps === 'number' && settings.fps > 0) ? settings.fps : 30,
      quality: (typeof settings.quality === 'number' && settings.quality > 0) ? settings.quality : 0.9,
      resolution: {
        width: resolutionWidth,
        height: resolutionHeight,
      },
      bitrate: (typeof settings.bitrate === 'number' && settings.bitrate > 0) ? settings.bitrate : 8000000,
    };
    
    // Log for debugging
    console.log('Export settings received:', settings);
    console.log('Export settings processed:', exportSettings);
    
    setShowExportDialog(false);
    const exportType = exportSettings.format;
    
    // Frame export
    if (exportType === 'frame') {
      setIsExporting(true);
      setExportProgress(50);
      try {
        // Ensure canvas is rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `elastic-pulse-frame-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setExportProgress(100);
            setTimeout(() => {
              setIsExporting(false);
              setExportProgress(0);
            }, 500);
          } else {
            throw new Error('Failed to create blob');
          }
        }, 'image/png', 1.0);
      } catch (e) {
        console.error('Frame export failed:', e);
        alert('Frame export failed. Please try again.');
        setIsExporting(false);
        setExportProgress(0);
      }
      return;
    }
    
    // Video export
    setIsExporting(true);
    const wasPlaying = isPlaying;
    const startPlayhead = playhead;
    
    // Store original canvas dimensions
    const originalWidth = canvas.width || canvas.clientWidth || 1920;
    const originalHeight = canvas.height || canvas.clientHeight || 1080;
    
    try {
      // Stop playback first to prevent visual jumps
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Wait for playback to stop and render to stabilize
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set canvas to export resolution (after stopping playback)
      const exportWidth = exportSettings.resolution.width;
      const exportHeight = exportSettings.resolution.height;
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      
      // Wait for canvas to resize and render - longer wait for stability
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Reset to start (after canvas is resized)
      setPlayhead(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      
      // Wait for playhead to update and render - longer wait for stability
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Initialize audio if needed
      if (!analyzerRef.current) {
        await initAudio();
      }
      
      // Final wait for everything to stabilize - ensure backgrounds are rendered
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Use high FPS for quality exports (minimum 60 FPS)
      const fps = Math.max(exportSettings.fps, 60);
      const exportDuration = totalDuration;
      
      // For real-time export, use MediaRecorder for both MP4 and WebM
      // MP4 will be converted later if needed, but WebM is faster for real-time
      try {
        // Properly warm up audio before export to prevent stuttering
        if (audioRef.current && audioUrl) {
          // Ensure audio is loaded and ready
          if (audioRef.current.readyState < 2) {
            // Wait for audio to be loaded enough (HAVE_CURRENT_DATA)
            await new Promise<void>((resolve) => {
              const checkReady = () => {
                if (audioRef.current && audioRef.current.readyState >= 2) {
                  resolve();
                } else {
                  setTimeout(checkReady, 50);
                }
              };
              checkReady();
            });
          }
          
          // Warm up audio: play a tiny bit, then reset
          audioRef.current.currentTime = 0;
          audioRef.current.volume = 0.01; // Very quiet for warmup
          try {
            await audioRef.current.play();
            await new Promise(resolve => setTimeout(resolve, 200)); // Longer warmup
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          } catch (e) {
            console.warn('Audio warmup failed:', e);
          }
          
          // Reset to full volume and prepare for export
          audioRef.current.volume = masterFX.masterVolume;
          audioRef.current.currentTime = 0;
          
          // Wait for audio context to be ready
          if (analyzerRef.current) {
            const ctx = analyzerRef.current.context;
            if (ctx && ctx.state === 'suspended') {
              await ctx.resume();
            }
          }
        }
        
        // Start playback for real-time export (but don't start audio yet)
        setIsPlaying(true);
        
        // Wait a bit to ensure canvas is stable
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait for stability
        
        // Pre-roll: Render a few frames without capturing to ensure everything is stable
        // This prevents visual jumps and ensures backgrounds are rendered
        // NOTE: Audio should NOT play during pre-roll to prevent audio stuttering
        const preRollFrames = 3;
        for (let i = 0; i < preRollFrames; i++) {
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Use MediaRecorder for real-time capture with high FPS
        const videoStream = canvas.captureStream(fps);
        
        // NOW start audio - synchronized with video capture start
        // This ensures audio and video start together without stuttering
        if (audioRef.current && audioUrl) {
          try {
            // Ensure audio is at the start position
            audioRef.current.currentTime = 0;
            
            // Play audio - it will be captured by the stream
            await audioRef.current.play();
            
            // Wait for audio to actually start playing
            let attempts = 0;
            while (audioRef.current.paused && attempts < 20) {
              await new Promise(resolve => setTimeout(resolve, 10));
              attempts++;
            }
            
            // Small additional wait to ensure audio is playing smoothly
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (err) {
            console.warn('Audio play failed:', err);
          }
        }
        
        // Add audio to the stream if available - capture AFTER audio is playing
        let combinedStream = videoStream;
        if (audioRef.current && audioUrl && !audioRef.current.paused) {
          try {
            // Ensure audio is actually playing before capturing stream
            if (audioRef.current.readyState >= 2) {
              // Create audio stream from audio element
              const audioStream = audioRef.current.captureStream ? audioRef.current.captureStream() : null;
              if (audioStream && audioStream.getAudioTracks().length > 0) {
                // Combine video and audio streams
                const audioTracks = audioStream.getAudioTracks();
                audioTracks.forEach(track => {
                  videoStream.addTrack(track);
                });
                combinedStream = videoStream;
                console.log('Audio track added to export stream');
              } else {
                console.warn('No audio tracks found in stream');
              }
            } else {
              console.warn('Audio not ready for capture (readyState:', audioRef.current.readyState, ')');
            }
          } catch (audioError) {
            console.warn('Could not capture audio stream:', audioError);
            // Continue with video-only export
          }
        } else {
          console.warn('Audio not available or paused for export');
        }
        
        // For MP4, we'll use WebM first and convert if needed
        const useWebM = exportSettings.format === 'mp4' ? false : true; // For now, always use WebM for real-time
        
        const mimeTypes = useWebM ? [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp8',
          'video/webm',
        ] : [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp8',
          'video/webm',
        ];
        
        let selectedMimeType = '';
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            selectedMimeType = mimeType;
            break;
          }
        }
        
        if (!selectedMimeType) {
          throw new Error('No supported video codec found');
        }
        
        // High Quality: Significantly increase bitrate for professional exports
        // For HD (1920x1080): 25-30 Mbps minimum
        // For 4K (3840x2160): 50-60 Mbps minimum
        const minBitrate = exportSettings.resolution.width >= 3840 ? 50000000 : 25000000;
        const exportBitrate = Math.max(exportSettings.bitrate, minBitrate);
        
        const mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType: selectedMimeType,
          videoBitsPerSecond: exportBitrate,
          audioBitsPerSecond: audioRef.current && audioUrl ? 192000 : undefined // 192kbps for audio
        });
        
        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        // Progress tracking based on audio time
        const progressInterval = setInterval(() => {
          if (audioRef.current && exportDuration > 0) {
            const progress = Math.min(99, (audioRef.current.currentTime / exportDuration) * 100);
            setExportProgress(progress);
            setExportCurrentFrame(Math.floor(audioRef.current.currentTime * fps));
          }
        }, 100);
        
        mediaRecorder.onstop = async () => {
          clearInterval(progressInterval);
          setExportProgress(100);
          
          const blob = new Blob(chunks, { type: selectedMimeType });
          
          // If MP4 was requested, convert WebM to MP4
          if (exportSettings.format === 'mp4') {
            try {
              // For now, download as WebM and inform user
              // Full MP4 conversion would require frame-by-frame which is slow
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `elastic-pulse-export-${Date.now()}.webm`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              alert('Export completed as WebM. For MP4 format, please use a video converter or use the frame-by-frame export option.');
            } catch (err) {
              console.error('Export failed:', err);
              alert('Export failed. Please try again.');
            }
          } else {
            // WebM export
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `elastic-pulse-export-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
          
          // Restore canvas
          canvas.width = originalWidth;
          canvas.height = originalHeight;
          
          // Restore state
          setTimeout(() => {
            setIsExporting(false);
            setExportProgress(0);
            setExportCurrentFrame(undefined);
            setExportTotalFrames(undefined);
          }, 500);
          setPlayhead(startPlayhead);
          if (audioRef.current) audioRef.current.currentTime = startPlayhead;
          setIsPlaying(wasPlaying);
          
          // Stop stream (both video and audio tracks)
          combinedStream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.onerror = (e) => {
          console.error('MediaRecorder error:', e);
          clearInterval(progressInterval);
          canvas.width = originalWidth;
          canvas.height = originalHeight;
          setIsExporting(false);
          setPlayhead(startPlayhead);
          setIsPlaying(wasPlaying);
          combinedStream.getTracks().forEach(track => track.stop());
          alert('Video export failed. Please try exporting a single frame instead.');
        };
        
        // Start with smaller timeslice for smoother export (10ms = 100 FPS capture rate)
        // This ensures every frame is captured smoothly
        // Small additional delay to ensure first frame is fully rendered
        await new Promise(resolve => requestAnimationFrame(resolve));
        mediaRecorder.start(10); // Collect data every 10ms for maximum smoothness
        
        // Stop after duration
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, exportDuration * 1000 + 500); // Add buffer
        
        return; // Exit early, don't fall through to frame-by-frame
        
      } catch (streamError) {
        console.error('MediaRecorder failed:', streamError);
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        setIsExporting(false);
        setPlayhead(startPlayhead);
        setIsPlaying(wasPlaying);
        alert('Real-time export failed. Please use Chrome or Edge browser.');
      }
      
      // WebM export using MediaRecorder
      try {
        // Start playback for real-time export (but don't start audio yet)
        setIsPlaying(true);
        
        // Wait a bit to ensure canvas is stable
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait for stability
        
        // Pre-roll: Render a few frames without capturing to ensure everything is stable
        // NOTE: Audio should NOT play during pre-roll to prevent audio stuttering
        const preRollFrames = 3;
        for (let i = 0; i < preRollFrames; i++) {
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Use MediaRecorder for real-time capture with high FPS
        const videoStream = canvas.captureStream(fps);
        
        // NOW start audio - synchronized with video capture start
        if (audioRef.current && audioUrl) {
          try {
            audioRef.current.currentTime = 0;
            await audioRef.current.play().catch(err => {
              console.warn('Audio play failed:', err);
            });
            
            // Wait for audio to actually start playing smoothly
            let attempts = 0;
            while (audioRef.current.paused && attempts < 20) {
              await new Promise(resolve => setTimeout(resolve, 10));
              attempts++;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (err) {
            console.warn('Audio play failed:', err);
          }
        }
        
        // Add audio to the stream if available
        let combinedStream = videoStream;
        if (audioRef.current && audioUrl && !audioRef.current.paused) {
          try {
            if (audioRef.current.readyState >= 2) {
              const audioStream = audioRef.current.captureStream ? audioRef.current.captureStream() : null;
              if (audioStream && audioStream.getAudioTracks().length > 0) {
                const audioTracks = audioStream.getAudioTracks();
                audioTracks.forEach(track => {
                  videoStream.addTrack(track);
                });
                combinedStream = videoStream;
              }
            }
          } catch (audioError) {
            console.warn('Could not capture audio stream:', audioError);
          }
        }
        
        const mimeTypes = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
        ];
        
        let selectedMimeType = '';
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            selectedMimeType = mimeType;
            break;
          }
        }
        
        if (!selectedMimeType) {
          throw new Error('No supported WebM codec found');
        }
        
        const mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType: selectedMimeType,
          videoBitsPerSecond: exportSettings.bitrate
        });
        
        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        // Progress tracking
        const progressInterval = setInterval(() => {
          if (audioRef.current && exportDuration > 0) {
            const progress = Math.min(99, (audioRef.current.currentTime / exportDuration) * 100);
            setExportProgress(progress);
            setExportCurrentFrame(Math.floor(audioRef.current.currentTime * fps));
          }
        }, 100);
        
        mediaRecorder.onstop = () => {
          clearInterval(progressInterval);
          setExportProgress(100);
          
          const blob = new Blob(chunks, { type: selectedMimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `elastic-pulse-export-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          // Restore canvas
          canvas.width = originalWidth;
          canvas.height = originalHeight;
          
          // Restore state
          setTimeout(() => {
            setIsExporting(false);
            setExportProgress(0);
            setExportCurrentFrame(undefined);
            setExportTotalFrames(undefined);
          }, 500);
          setPlayhead(startPlayhead);
          if (audioRef.current) audioRef.current.currentTime = startPlayhead;
          setIsPlaying(wasPlaying);
          
          // Stop stream
          combinedStream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.onerror = (e) => {
          console.error('MediaRecorder error:', e);
          clearInterval(progressInterval);
          canvas.width = originalWidth;
          canvas.height = originalHeight;
          setIsExporting(false);
          setPlayhead(startPlayhead);
          setIsPlaying(wasPlaying);
          combinedStream.getTracks().forEach(track => track.stop());
          alert('Video export failed. Please try exporting a single frame instead.');
        };
        
        // Small additional delay to ensure first frame is fully rendered
        await new Promise(resolve => requestAnimationFrame(resolve));
        mediaRecorder.start(10); // Collect data every 10ms for maximum smoothness
        
        // Stop after duration
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }, exportDuration * 1000 + 500); // Add buffer
        
      } catch (streamError) {
        console.error('MediaRecorder failed:', streamError);
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        setIsExporting(false);
        setPlayhead(startPlayhead);
        setIsPlaying(wasPlaying);
        alert('Video export failed. Please use Chrome or Edge browser, or try exporting a single frame.');
      }
      
    } catch (e) {
      console.error('Export failed:', e);
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      setIsExporting(false);
      setPlayhead(startPlayhead);
      setIsPlaying(wasPlaying);
      alert(`Export failed: ${e instanceof Error ? e.message : 'Unknown error'}. Please try again.`);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        // Use the same logic as the Play button
        if (!analyzerRef.current && audioUrl) {
          initAudio().then(() => {
            setIsPlaying(p => {
              const newPlaying = !p;
              if (!newPlaying && audioRef.current) {
                audioRef.current.pause();
              }
              return newPlaying;
            });
          });
        } else {
          setIsPlaying(p => {
            const newPlaying = !p;
            if (!newPlaying && audioRef.current) {
              audioRef.current.pause();
            }
            return newPlaying;
          });
        }
      } else if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const effectIndex = parseInt(e.key) - 1;
        const effects: Array<keyof MasterFX> = [
          'strobe',      // 1
          'blackout',    // 2
          'invert',      // 3
          'freeze',      // 4
          'edgeDetection', // 5
          'scanlines',   // 6
          'mirrorFlip',  // 7
          'chromaBurst', // 8
          'zoomPunch'    // 9
        ];
        
        if (effectIndex < effects.length) {
          const effect = effects[effectIndex];
          setMasterFX(prev => ({
            ...prev,
            [effect]: !prev[effect] as any
          }));
        }
      } else if (e.key === 'ArrowLeft' && !e.shiftKey) {
        e.preventDefault();
        const newP = Math.max(0, playhead - 0.1);
        setPlayhead(newP);
        if (audioRef.current) audioRef.current.currentTime = newP;
      } else if (e.key === 'ArrowRight' && !e.shiftKey) {
        e.preventDefault();
        const newP = Math.min(totalDuration, playhead + 0.1);
        setPlayhead(newP);
        if (audioRef.current) audioRef.current.currentTime = newP;
      } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        loadProject();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        handleExport();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'c' && activeClipId) {
        e.preventDefault();
        if (e.shiftKey && activeTab === 'auto') {
          copyAutomation(autoParam);
        } else {
          copyClips([activeClipId]);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        pasteClips();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'x' && activeClipId) {
        e.preventDefault();
        copyClips([activeClipId]);
        setClips(p => p.filter(c => c.id !== activeClipId));
        setActiveClipId(null);
      } else if (e.key === 'm' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        addMarker();
      } else if (e.key === 'l' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (loopRegion) {
          setLoopRegion(null);
        } else {
          setLoopRegion({ start: playhead, end: Math.min(playhead + 10, totalDuration) });
        }
      } else if (e.key === '?' || (e.key === 'h' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setShowShortcutsHelp(!showShortcutsHelp);
      } else if (e.key === 'Escape') {
        setContextMenu(null);
        setShowShortcutsHelp(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, playhead, totalDuration, activeClipId, copiedClips, copiedAutomation, activeTab, autoParam, markers, undo, redo, saveProject, loadProject, handleExport, initAudio, analyzerRef, audioRef, setIsPlaying, setPlayhead, copyClips, pasteClips, copyAutomation, pasteAutomation]);

  return (
    <div className={`h-screen flex flex-col p-2 gap-2 bg-[#0d0d0d] text-slate-100 font-sans transition-all overflow-hidden ${isZenMode ? 'p-0 gap-0' : ''}`} onClick={() => setContextMenu(null)}>
      {audioUrl && <audio ref={audioRef} src={audioUrl} />}
      
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => !isExporting && setShowExportDialog(false)}
        onExport={handleExport}
        isExporting={isExporting}
        progress={exportProgress}
        currentFrame={exportCurrentFrame}
        totalFrames={exportTotalFrames}
      />
      
      <PresetsManager
        isOpen={showPresetsManager}
        onClose={() => setShowPresetsManager(false)}
        activeClip={activeClip}
        masterFX={masterFX}
        onSaveClipPreset={() => {}}
        onLoadClipPreset={(preset) => {
          if (activeClip) {
            setClips(p => p.map(c => 
              c.id === activeClipId 
                ? { ...c, ...preset.clip } as TimelineClip
                : c
            ));
          }
        }}
        onSaveMasterPreset={() => {}}
        onLoadMasterPreset={(preset) => {
          setMasterFX(preset.fx);
        }}
      />
      
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
      
      <PerformanceMonitor
        isVisible={showPerformanceMonitor}
        onToggle={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
      />
      
      {!isZenMode && (
        <SequencerHeader
          playhead={playhead}
          isPlaying={isPlaying}
          isExporting={isExporting}
          overlayMode={overlayMode}
          canUndo={canUndo}
          canRedo={canRedo}
          onExit={onExit}
          onPlayPause={() => {
            // Initialize audio if needed
            if (!analyzerRef.current && audioUrl) {
              initAudio().then(() => {
                // After audio is initialized, toggle playing state
                setIsPlaying(p => {
                  const newPlaying = !p;
                  if (!newPlaying && audioRef.current) {
                    // When stopping, ensure audio is paused
                    audioRef.current.pause();
                  }
                  return newPlaying;
                });
              });
            } else {
              // Toggle playing state directly
              setIsPlaying(p => {
                const newPlaying = !p;
                if (!newPlaying && audioRef.current) {
                  // When stopping, ensure audio is paused
                  audioRef.current.pause();
                }
                return newPlaying;
              });
            }
          }}
          onReset={() => {
            setPlayhead(0);
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.pause();
            }
            setIsPlaying(false);
          }}
          onExport={handleExport}
          onSaveProject={saveProject}
          onLoadProject={loadProject}
          onUndo={undo}
          onRedo={redo}
          onCycleOverlay={cycleOverlay}
          onZenMode={() => setIsZenMode(true)}
          onPresets={() => setShowPresetsManager(true)}
          onHelp={() => setShowShortcutsHelp(true)}
          audioRef={audioRef}
          analyzerRef={analyzerRef}
          initAudio={initAudio}
          setPlayhead={setPlayhead}
          setIsPlaying={setIsPlaying}
          logoHold={logoHold}
          onLogoHold={() => setLogoHold(!logoHold)}
        />
      )}

      <main className="flex-grow flex gap-2 overflow-hidden relative">
        {!isZenMode && (
          <aside className="w-72 flex flex-col gap-2 overflow-hidden animate-in slide-in-from-left duration-700">
             <div className="bg-[#1a1a1a] p-4 rounded-2xl flex-grow flex flex-col gap-6 overflow-hidden border border-white/5 shadow-2xl">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 tracking-[0.2em]"><Sparkles size={14}/> Neural Command</h3>
                  <div className="flex gap-2">
                    <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Morphology command..." className="flex-grow bg-[#0a0a0a] border border-white/5 p-3.5 rounded-xl text-[11px] outline-none text-white focus:border-[#ffdc5e]/40 transition-all shadow-inner" />
                    <button onClick={async () => {
                      setIsGenerating(true);
                      try {
                        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                        const res = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: `WebGL fragment shader: ${prompt}. Uniforms: u_time, u_resolution, u_speed, u_intensity, u_color, u_audio_val, u_opacity, u_distort, u_hue_rotate.` });
                        const ns: Shader = { id: `s-${Date.now()}`, name: prompt.substring(0, 15), code: res.text || "", color: '#ffdc5e' };
                        setShaders(p => [...p, ns]); setPrompt("");
                      } catch (e) {} finally { setIsGenerating(false); }
                    }} className="p-3.5 bg-[#2a2a2a] rounded-xl text-[#ffdc5e] hover:bg-[#333] transition-all shadow-md">{isGenerating ? <RefreshCw className="animate-spin" size={18}/> : <Plus size={18}/>}</button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.glsl,text/plain';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const code = ev.target?.result as string;
                            const name = file.name.replace(/\.glsl$/, '');
                            const ns: Shader = { 
                              id: `s-${Date.now()}`, 
                              name: name || 'Imported Shader', 
                              code: code, 
                              color: '#ffdc5e' 
                            };
                            setShaders(p => [...p, ns]);
                          };
                          reader.readAsText(file);
                        };
                        input.click();
                      }}
                      className="flex-1 px-3 py-2 bg-[#2a2a2a] rounded-xl text-[10px] font-black uppercase text-slate-300 hover:bg-[#333] transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] active:scale-95"
                      title="Import Shader (.glsl)"
                    >
                      <Upload size={14}/> Import
                    </button>
                    {activeClip && (
                      <button 
                        onClick={() => {
                          const shader = shaders.find(s => s.id === activeClip.shaderId);
                          if (!shader) return;
                          const blob = new Blob([shader.code], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${shader.name.replace(/\s+/g, '-')}.glsl`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex-1 px-3 py-2 bg-[#2a2a2a] rounded-xl text-[10px] font-black uppercase text-slate-300 hover:bg-[#333] transition-all duration-300 flex items-center justify-center gap-2 hover:scale-105 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] active:scale-95"
                        title="Export Shader (.glsl)"
                      >
                        <Download size={14}/> Export
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-grow flex flex-col gap-4 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Signal Pool ({shaders.length}+)</h3>
                      <label className="px-3 py-1.5 bg-[#ffdc5e]/10 border border-[#ffdc5e]/20 text-[#ffdc5e] rounded-lg text-[9px] font-black uppercase hover:bg-[#ffdc5e]/20 transition-all cursor-pointer flex items-center gap-2">
                        <Video size={12}/>
                        Video
                        <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                      </label>
                    </div>
                    <select 
                      value={selectedShaderCategory}
                      onChange={(e) => setSelectedShaderCategory(e.target.value)}
                      className="text-[9px] font-black uppercase bg-[#0a0a0a] border border-white/5 px-3 py-1.5 rounded-lg text-slate-300 outline-none focus:border-[#ffdc5e]/40"
                    >
                      <option value="all">All Categories</option>
                      <option value="abstract">Abstract</option>
                      <option value="geometric">Geometric</option>
                      <option value="organic">Organic</option>
                      <option value="particles">Particles</option>
                      <option value="distortion">Distortion</option>
                      <option value="color">Color</option>
                      <option value="audio-reactive">Audio Reactive</option>
                      <option value="experimental">Experimental</option>
                    </select>
                  </div>
                  <div className="flex-grow overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                    {shaders
                      .filter(s => selectedShaderCategory === 'all' || s.category === selectedShaderCategory || (!s.category && selectedShaderCategory === 'experimental'))
                      .sort((a, b) => {
                        // Sortiere zuerst nach Kategorie (alphabetisch)
                        const catA = a.category || 'zzz'; // Kategorielose Shader ans Ende
                        const catB = b.category || 'zzz';
                        if (catA !== catB) {
                          return catA.localeCompare(catB);
                        }
                        // Innerhalb der gleichen Kategorie nach Name sortieren
                        return a.name.localeCompare(b.name);
                      })
                      .map(s => (
                      <div key={s.id} onClick={() => {
                        // Finde die Endzeit des letzten Clips (der Reihe nach)
                        const lastClipEnd = clips.length > 0 
                          ? Math.max(...clips.map(c => c.startTime + c.duration))
                          : 0;
                        
                        const nc: TimelineClip = { 
                          id: `c-${Date.now()}`, shaderId: s.id, track: 0, startTime: lastClipEnd, duration: 5, timeStretch: 1, opacity: 1, fadeIn: 0.5, fadeOut: 0.5, blendMode: 'normal', audioReactive: 1, audioTie: 'vol', 
                          params: { speed: 1, intensity: 1, color: 0.5, kaleidoscope: 0, mirror: 0, glitch: 0, contrast: 1, saturation: 1, brightness: 0, hueRotate: 0, zoom: 0, distort: 0, tieEffect: 0, feedbackDelay: 0, particles: 0 }, automation: {}, lfos: [] 
                        };
                        setClips(p => [...p, nc]); 
                        setActiveClipId(nc.id);
                        // Setze Playhead zum Start des neuen Clips, damit er sofort sichtbar ist
                        setPlayhead(nc.startTime);
                      }} className="group bg-[#232323] p-3 rounded-2xl border border-white/5 hover:border-[#ffdc5e]/40 cursor-pointer flex items-center gap-4 transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(255,220,94,0.2)] hover:scale-[1.02] hover:bg-[#2a2a2a] active:scale-[0.98]">
                        <ShaderThumbnail shader={s} />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-black uppercase truncate text-slate-400 group-hover:text-[#ffdc5e] transition-colors duration-300 block">{s.name}</span>
                          {s.category && (
                            <span className="text-[8px] font-black uppercase text-slate-600 group-hover:text-slate-500 mt-0.5 transition-colors duration-300 block">{s.category}</span>
                          )}
                        </div>
                        {shaderErrors[s.id] && <AlertTriangle size={12} className="text-red-500 ml-auto animate-pulse shrink-0"/>}
                      </div>
                    ))}
                  </div>
                </div>
             </div>
          </aside>
        )}

        <section className={`flex-grow ${masterFX.backgroundType === 'none' ? 'bg-[#000]' : 'bg-transparent'} rounded-2xl relative overflow-hidden border border-white/5 shadow-2xl group/canvas ${isZenMode ? 'rounded-none border-none' : 'animate-in zoom-in-95 duration-1000'}`} style={{ position: 'relative' }}>
           <BackgroundLayer type={masterFX.backgroundType} time={playhead} width={1920} height={1080} />
           <ShaderCanvas ref={canvasRef} playhead={playhead} clips={clips} shaders={shaders} audioAnalysis={analysis} masterFX={masterFX} mutes={trackMutes} solos={trackSolos} onShaderError={handleShaderError} />
           {overlayMode !== 'none' && <TextModeOverlay analysis={analysis} isZen={isZenMode} mode={overlayMode} />}
           
           {/* Logo Overlay */}
           <div className={`absolute inset-0 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-1000 ${
             (logoHold || !isPlaying) ? 'opacity-100' : 'opacity-0'
           }`}>
             <div className="relative">
               <img 
                 src="/logo.png" 
                 alt="Elastic Pulse Logo"
                 className="max-w-[60%] max-h-[60%] object-contain drop-shadow-[0_0_40px_rgba(255,220,94,0.6)]"
                 onError={(e) => {
                   // Fallback wenn Logo nicht gefunden wird
                   const target = e.target as HTMLImageElement;
                   target.style.display = 'none';
                   const fallback = target.nextElementSibling as HTMLElement;
                   if (fallback) {
                     fallback.style.display = 'flex';
                   }
                 }}
               />
               {/* Fallback wenn Logo nicht vorhanden */}
               <div className="hidden flex-col items-center justify-center absolute inset-0">
                 <div className="text-center">
                   <Pulse size={120} className="text-[#ffdc5e] mx-auto mb-4 animate-pulse drop-shadow-[0_0_40px_rgba(255,220,94,0.6)]"/>
                   <span className="text-[#ffdc5e] font-black text-4xl uppercase tracking-tighter">Elastic Pulse</span>
                 </div>
               </div>
             </div>
           </div>
           
           {isZenMode && (
             <button onClick={() => setIsZenMode(false)} className="absolute top-6 right-6 p-4 bg-black/40 hover:bg-[#ffdc5e] hover:text-black rounded-xl border border-white/10 text-[#ffdc5e] opacity-0 group-hover/canvas:opacity-100 transition-all z-[100] shadow-2xl backdrop-blur-md">
                <Minimize2 size={24}/>
             </button>
           )}
        </section>

        {!isZenMode && (
          <aside className="w-80 flex flex-col gap-2 overflow-hidden animate-in slide-in-from-right duration-700">
             <div className="bg-[#1a1a1a] p-4 rounded-2xl flex-grow flex flex-col overflow-hidden border border-white/5 shadow-2xl">
                  <nav className="grid grid-cols-3 gap-2 mb-6 bg-[#0a0a0a] p-1.5 rounded-xl shrink-0 shadow-inner border border-white/5">
                    {['params', 'auto', 'lfo', 'audio', 'master', 'code', 'midi'].map(t => (
                      <button key={t} onClick={() => setActiveTab(t as InspectorTab)} className={`px-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all duration-300 relative transform ${activeTab === t ? 'bg-[#2a2a2a] text-[#ffdc5e] shadow-lg scale-105' : 'text-slate-500 hover:text-slate-300 hover:bg-[#151515]'} hover:scale-110 active:scale-95`}>
                        {t}
                        {activeTab === t && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-[2px] bg-[#ffdc5e] shadow-[0_0_10px_#ffdc5e] animate-pulse" />}
                      </button>
                    ))}
                  </nav>
                  <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar">
                    {activeClip ? (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        {activeTab === 'params' && (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between pb-3 border-b border-white/5">
                               <div className="flex items-center gap-2 truncate">
                                 <span className="text-[12px] font-black uppercase text-[#ffdc5e] tracking-[0.1em] truncate">{shaders.find(s=>s.id === activeClip.shaderId)?.name}</span>
                                 {shaderErrors[activeClip.shaderId] && <AlertTriangle size={14} className="text-red-500 shrink-0"/>}
                               </div>
                               <button onClick={() => setClips(p => p.filter(c => c.id !== activeClipId))} className="p-2 text-slate-600 hover:text-orange-500 transition-all duration-300 hover:scale-110 hover:bg-orange-500/10 rounded-lg active:scale-95"><Trash2 size={16}/></button>
                            </div>
                            {shaderErrors[activeClip.shaderId] && (
                               <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                  <div className="flex flex-col gap-1">
                                     <span className="text-[9px] font-black text-red-400 uppercase">Signal Path Broken</span>
                                     <span className="text-[8px] text-red-200/60 leading-tight">Compiler reported syntax errors. Check the source code in the [CODE] tab.</span>
                                  </div>
                               </div>
                            )}
                            <div className="space-y-6">
                               <div className="bg-[#232323] p-4 rounded-2xl border border-white/5 space-y-5 shadow-xl hover:border-white/10 transition-all duration-300">
                                  <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 tracking-[0.3em]"><Waves size={14} className="text-[#ffdc5e]/60"/><span className="bg-gradient-to-r from-slate-500 to-transparent h-[1px] flex-1 opacity-20"></span></h3>
                                  <ControlSlider label="Particle Flow" val={activeClip.params.particles} max={1} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, params: {...c.params, particles: v}} : c))} onKeyframe={() => addKeyframe('particles')} />
                                  <ControlSlider label="Tie Effect" val={activeClip.params.tieEffect} max={1} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, params: {...c.params, tieEffect: v}} : c))} onKeyframe={() => addKeyframe('tieEffect')} />
                                  <ControlSlider label="Feedback Delay" val={activeClip.params.feedbackDelay} max={1} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, params: {...c.params, feedbackDelay: v}} : c))} onKeyframe={() => addKeyframe('feedbackDelay')} />
                                  <ControlSlider label="Kaleidoscope" val={activeClip.params.kaleidoscope} max={12} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, params: {...c.params, kaleidoscope: v}} : c))} onKeyframe={() => addKeyframe('kaleidoscope')} />
                                  <ControlSlider label="Elastic Warp" val={activeClip.params.distort} max={2} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, params: {...c.params, distort: v}} : c))} onKeyframe={() => addKeyframe('distort')} />
                                  <ControlSlider label="Zoom Scope" val={activeClip.params.zoom} max={3} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, params: {...c.params, zoom: v}} : c))} onKeyframe={() => addKeyframe('zoom')} />
                                  <ControlSlider label="Flow Speed" val={activeClip.params.speed} max={4} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, params: {...c.params, speed: v}} : c))} onKeyframe={() => addKeyframe('speed')} />
                               </div>
                               <div className="bg-[#232323] p-4 rounded-2xl border border-white/5 space-y-5 shadow-xl hover:border-white/10 transition-all duration-300">
                                  <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 tracking-[0.3em]"><Palette size={14} className="text-[#ffdc5e]/60"/><span className="bg-gradient-to-r from-slate-500 to-transparent h-[1px] flex-1 opacity-20"></span></h3>
                                  <ControlSlider label="Contrast" val={activeClip.params.contrast} max={2} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, params: {...c.params, contrast: v}} : c))} onKeyframe={() => addKeyframe('contrast')} />
                                  <ControlSlider label="Saturation" val={activeClip.params.saturation} max={2} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, params: {...c.params, saturation: v}} : c))} onKeyframe={() => addKeyframe('saturation')} />
                                  <ControlSlider label="Brightness" val={activeClip.params.brightness} max={1} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, params: {...c.params, brightness: v}} : c))} onKeyframe={() => addKeyframe('brightness')} />
                                  <ControlSlider label="Hue Rotation" val={activeClip.params.hueRotate} max={1} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, params: {...c.params, hueRotate: v}} : c))} onKeyframe={() => addKeyframe('hueRotate')} />
                               </div>
                               <div className="bg-[#232323] p-4 rounded-2xl border border-white/5 space-y-5 shadow-xl hover:border-white/10 transition-all duration-300">
                                  <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 tracking-[0.3em]"><BlendIcon size={14} className="text-[#ffdc5e]/60"/><span className="bg-gradient-to-r from-slate-500 to-transparent h-[1px] flex-1 opacity-20"></span></h3>
                                  <select value={activeClip.blendMode} onChange={e => setClips(p => p.map(c => c.id === activeClipId ? {...c, blendMode: e.target.value as BlendMode} : c))} className="w-full bg-[#0a0a0a] border border-white/5 p-3 rounded-xl text-[11px] font-black uppercase text-slate-200 outline-none focus:border-[#ffdc5e]/40 transition-all duration-300 hover:border-white/10 cursor-pointer">
                                     {['normal', 'add', 'multiply', 'screen', 'overlay', 'softlight', 'hardlight', 'dodge', 'burn'].map(bm => <option key={bm} value={bm}>{bm.toUpperCase()}</option>)}
                                  </select>
                                  <ControlSlider label="Global Opacity" val={activeClip.opacity} max={1} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, opacity: v} : c))} onKeyframe={() => addKeyframe('opacity')} />
                                  <div className="space-y-2 mt-4">
                                     <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Audio Tie</h3>
                                     <select value={activeClip.audioTie} onChange={e => setClips(p => p.map(c => c.id === activeClipId ? {...c, audioTie: e.target.value as AudioTieBand} : c))} className="w-full bg-[#0a0a0a] border border-white/5 p-3 rounded-xl text-[11px] font-black uppercase text-slate-200 outline-none focus:border-[#ffdc5e]/40 transition-all duration-300 hover:border-white/10 cursor-pointer">
                                        {['vol', 'sub', 'bass', 'lowMid', 'mid', 'highMid', 'treble', 'presence', 'kick', 'snare'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                     </select>
                                     <ControlSlider label="Audio Reaction Intensity" val={activeClip.audioReactive} max={5} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, audioReactive: v} : c))} />
                                  </div>
                               </div>
                            </div>
                          </div>
                        )}
                        {activeTab === 'auto' && (
                          <div className="space-y-6">
                             <div className="flex items-center gap-4 bg-[#0a0a0a] p-4 rounded-2xl border border-white/5 shadow-inner">
                                <select value={autoParam} onChange={e => setAutoParam(e.target.value)} className="bg-transparent text-[11px] font-black uppercase text-slate-200 outline-none flex-grow cursor-pointer font-bold">
                                   {['distort', 'hueRotate', 'intensity', 'speed', 'zoom', 'opacity', 'contrast', 'saturation', 'brightness', 'tieEffect', 'feedbackDelay', 'kaleidoscope', 'particles'].map(p => <option key={p} value={p} className="bg-[#0a0a0a]">{p.toUpperCase()}</option>)}
                                </select>
                                <button onClick={() => addKeyframe(autoParam)} className="p-2.5 bg-[#ffdc5e] text-black rounded-xl shadow-lg hover:scale-110 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,220,94,0.5)] active:scale-95" title="Add Keyframe (at playhead)"><Plus size={16}/></button>
                             </div>
                             <div className="flex items-center gap-2 bg-[#232323] p-3 rounded-xl border border-white/5">
                                <button 
                                  onClick={() => copyAutomation(autoParam)} 
                                  disabled={!activeClip || !(activeClip.automation[autoParam] || []).length}
                                  className="flex-1 px-4 py-2.5 bg-[#0a0a0a] border border-white/10 text-[10px] font-black uppercase text-slate-300 rounded-lg hover:bg-[#ffdc5e] hover:text-black hover:border-[#ffdc5e] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105 active:scale-95 disabled:hover:scale-100"
                                  title="Copy Automation (Cmd+Shift+C)"
                                >
                                  <Copy size={12}/> Copy Auto
                                </button>
                                <button 
                                  onClick={() => pasteAutomation()} 
                                  disabled={!copiedAutomation}
                                  className="flex-1 px-4 py-2.5 bg-[#0a0a0a] border border-white/10 text-[10px] font-black uppercase text-slate-300 rounded-lg hover:bg-[#ffdc5e] hover:text-black hover:border-[#ffdc5e] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105 active:scale-95 disabled:hover:scale-100"
                                  title="Paste Automation (Cmd+Shift+V)"
                                >
                                  <Copy size={12} className="rotate-90"/> Paste Auto
                                </button>
                             </div>
                             <div className="bg-[#0a0a0a] p-3 rounded-xl border border-white/5">
                                <label className="text-[9px] font-black uppercase text-slate-500 mb-2 block">Curve Type</label>
                                <select value={autoCurve} onChange={e => setAutoCurve(e.target.value as AutomationCurve)} className="w-full bg-[#1a1a1a] border border-white/5 p-2 rounded-lg text-[10px] font-black uppercase text-slate-200 outline-none">
                                  {['linear', 'ease', 'easeIn', 'easeOut', 'easeInOut', 'bezier'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                                </select>
                             </div>
                             {(activeClip.automation[autoParam] || []).length > 0 ? (
                               <div className="bg-[#232323] p-3 rounded-xl border border-white/5">
                                 <div className="flex items-center justify-between mb-2">
                                   <span className="text-[9px] font-black uppercase text-slate-500">Keyframes ({(activeClip.automation[autoParam] || []).length})</span>
                                   {copiedAutomation && copiedAutomation.param === autoParam && (
                                     <span className="text-[8px] font-black uppercase text-[#ffdc5e] bg-[#ffdc5e]/10 px-2 py-1 rounded">Copied</span>
                                   )}
                             </div>
                             <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                {(activeClip.automation[autoParam] || []).sort((a,b)=>a.t-b.t).map((pt, i) => (
                                       <div key={i} className="flex justify-between items-center p-4 bg-[#0a0a0a] rounded-xl border border-white/5 text-[11px] shadow-sm group hover:border-white/20 hover:bg-[#151515] transition-all duration-300">
                                          <div className="flex items-center gap-3">
                                      <span className="font-mono text-slate-500 group-hover:text-slate-300 transition-colors duration-300">{(pt.t * activeClip.duration).toFixed(2)}S</span>
                                            {pt.curve && pt.curve !== 'linear' && (
                                              <span className="text-[8px] font-black uppercase text-slate-600 bg-slate-800 px-2 py-0.5 rounded group-hover:bg-slate-700 transition-colors duration-300">{pt.curve}</span>
                                            )}
                                          </div>
                                      <span className="font-black text-[#ffdc5e] tracking-tight group-hover:text-[#ffdc5e] transition-colors duration-300">{pt.v.toFixed(3)}</span>
                                      <button onClick={() => removeKeyframe(autoParam, pt.t)} className="text-slate-600 hover:text-red-500 transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"><X size={14}/></button>
                                   </div>
                                ))}
                             </div>
                               </div>
                             ) : (
                               <div className="bg-[#232323] p-8 rounded-xl border border-white/5 text-center">
                                 <div className="text-slate-500 text-[10px] font-black uppercase mb-2">No Automation</div>
                                 <div className="text-slate-600 text-[9px]">Add keyframes to create automation curves</div>
                               </div>
                             )}
                          </div>
                        )}
                        {activeTab === 'lfo' && (
                          <div className="space-y-6">
                            <button onClick={addLFO} className="w-full py-3.5 bg-[#ffdc5e]/10 border border-[#ffdc5e]/20 text-[#ffdc5e] text-[10px] font-black uppercase rounded-xl hover:bg-[#ffdc5e]/20 transition-all flex items-center justify-center gap-3"><Gauge size={14}/> Create Modulator</button>
                            {activeClip.lfos.map((lfo) => (
                              <div key={lfo.id} className="bg-[#232323] p-4 rounded-2xl border border-white/5 space-y-4 shadow-xl relative">
                                <button onClick={() => setClips(p => p.map(c => c.id === activeClipId ? {...c, lfos: c.lfos.filter(l => l.id !== lfo.id)} : c))} className="absolute top-4 right-4 text-slate-600 hover:text-red-500 transition-all duration-300 hover:scale-110 active:scale-95"><Trash2 size={14}/></button>
                                <div className="grid grid-cols-2 gap-2">
                                  <select value={lfo.target} onChange={e => setClips(p => p.map(c => c.id === activeClipId ? {...c, lfos: c.lfos.map(l => l.id === lfo.id ? {...l, target: e.target.value} : l)} : c))} className="bg-[#0a0a0a] text-[10px] font-black p-2 rounded-lg border border-white/5">
                                    {['distort', 'hueRotate', 'intensity', 'speed', 'zoom', 'opacity', 'tieEffect', 'feedbackDelay', 'kaleidoscope', 'particles'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                                  </select>
                                  <select value={lfo.type} onChange={e => setClips(p => p.map(c => c.id === activeClipId ? {...c, lfos: c.lfos.map(l => l.id === lfo.id ? {...l, type: e.target.value as LFOType} : l)} : c))} className="bg-[#0a0a0a] text-[10px] font-black p-2 rounded-lg border border-white/5">
                                    {['sine', 'tri', 'sqr', 'noise'].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                                  </select>
                                </div>
                                <ControlSlider label="Frequency" val={lfo.freq} max={10} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, lfos: c.lfos.map(l => l.id === lfo.id ? {...l, freq: v} : l)} : c))} />
                                <ControlSlider label="Amplitude" val={lfo.amp} max={1} onChange={v => setClips(p => p.map(c => c.id === activeClipId ? {...c, lfos: c.lfos.map(l => l.id === lfo.id ? {...l, amp: v} : l)} : c))} />
                              </div>
                            ))}
                          </div>
                        )}
                        {activeTab === 'audio' && (
                          <div className="space-y-6">
                            <div className="bg-[#232323] p-5 rounded-2xl border border-white/5 space-y-4 shadow-xl">
                              <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-3"><AudioLines size={14}/> Audio Source</h3>
                              <label className="flex items-center gap-4 bg-[#0a0a0a] p-4 rounded-xl border border-dashed border-white/10 hover:border-[#ffdc5e]/40 transition-all duration-300 cursor-pointer group relative overflow-hidden hover:bg-[#0f0f0f] hover:shadow-[0_0_15px_rgba(255,220,94,0.2)]">
                                <Upload size={18} className="text-[#ffdc5e] group-hover:scale-110 transition-transform duration-300" />
                                <div className="flex flex-col">
                                   <span className="text-[10px] font-black uppercase text-slate-200 group-hover:text-[#ffdc5e] transition-colors duration-300">Load Soundwave</span>
                                   <span className="text-[9px] text-slate-500 group-hover:text-slate-400 font-mono truncate max-w-[150px] transition-colors duration-300">{audioFileName}</span>
                                </div>
                                <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                              </label>
                              <button onClick={initAudio} className="w-full py-3 bg-[#ffdc5e]/10 text-[#ffdc5e] rounded-xl text-[10px] font-black uppercase border border-[#ffdc5e]/20 hover:bg-[#ffdc5e]/20 transition-all duration-300 flex items-center justify-center gap-3 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,220,94,0.3)] active:scale-[0.98]"><Mic size={14}/> Activate Capture</button>
                            </div>
                            <div className="bg-[#232323] p-5 rounded-2xl border border-white/5 space-y-4 shadow-xl">
                               <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><Pulse size={14}/> Spectral Precision</h3>
                               <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                               {['vol', 'sub', 'bass', 'lowMid', 'mid', 'highMid', 'treble', 'presence', 'kick', 'snare'].map(b => (
                                 <div key={b} className="space-y-1.5">
                                   <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                                       <span className={['kick', 'snare'].includes(b) ? 'text-[#ffdc5e]' : ''}>{b}</span>
                                       <span className="font-mono">{(analysis[b as AudioTieBand]*100).toFixed(0)}%</span>
                                   </div>
                                   <div className="h-1 w-full bg-[#0a0a0a] rounded-full overflow-hidden">
                                       <div className={`h-full transition-all ${['kick', 'snare'].includes(b) ? 'bg-[#ffdc5e] shadow-[0_0_10px_#ffdc5e]' : 'bg-slate-600'}`} style={{ width: `${Math.min(100, analysis[b as AudioTieBand]*100)}%` }} />
                                   </div>
                                 </div>
                               ))}
                               </div>
                            </div>
                          </div>
                        )}
                        {activeTab === 'master' && (
                          <div className="space-y-6 animate-in fade-in duration-500">
                             <MasterXYPad fx={masterFX} onChange={v => setMasterFX(p => ({...p, feedback: v.x * 20, bloom: v.y * 1.5}))} />
                             <div className="bg-[#232323] p-5 rounded-2xl border border-white/5 space-y-6 shadow-xl">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Tempo (BPM)</span>
                                    {detectedBPM && (
                                      <button 
                                        onClick={() => setMasterFX(p => ({...p, bpm: detectedBPM}))}
                                        className="text-[9px] font-black uppercase text-[#ffdc5e] hover:text-white transition-all px-2 py-1 rounded border border-[#ffdc5e]/30 hover:border-[#ffdc5e]"
                                        title={`Detected BPM: ${detectedBPM}`}
                                      >
                                        Use {detectedBPM}
                                      </button>
                                    )}
                                </div>
                                  <ControlSlider label="" val={masterFX.bpm} max={250} onChange={v => setMasterFX(p => ({...p, bpm: v}))} />
                             </div>
                                <div className="space-y-4">
                                  <h4 className="text-[9px] font-black uppercase text-slate-500">Toggle Effects</h4>
                                  <div className="grid grid-cols-3 gap-2">
                                    {[ 
                                      { id: 'strobe', label: 'Strobe', icon: <ZapIcon size={12}/> }, 
                                      { id: 'invert', label: 'Invert', icon: <Palette size={12}/> }, 
                                      { id: 'mirrorFlip', label: 'Mirror', icon: <Monitor size={12}/> }, 
                                      { id: 'chromaBurst', label: 'Burst', icon: <Pulse size={12}/> },
                                      { id: 'freeze', label: 'Freeze', icon: <Square size={12}/> },
                                      { id: 'edgeDetection', label: 'Edge', icon: <Layers size={12}/> },
                                      { id: 'scanlines', label: 'Scan', icon: <GripHorizontal size={12}/> },
                                      { id: 'blackout', label: 'Black', icon: <Moon size={12}/> },
                                      { id: 'glitchHit', label: 'Glitch', icon: <AlertTriangle size={12}/> }
                                    ].map(m => (
                                      <button key={m.id} onClick={() => setMasterFX(p => ({...p, [m.id]: !p[m.id as keyof MasterFX]}))} className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-[8px] font-black uppercase transition-all duration-300 ${masterFX[m.id as keyof MasterFX] ? 'bg-[#ffdc5e] border-[#ffdc5e] text-black shadow-[0_0_15px_rgba(255,220,94,0.3)] scale-105' : 'bg-[#0a0a0a] border-white/5 text-slate-500 hover:border-white/20 hover:bg-[#151515]'} hover:scale-110 active:scale-95`}>{m.icon} {m.label}</button>
                                   ))}
                                </div>
                                  
                                  <h4 className="text-[9px] font-black uppercase text-slate-500 mt-4">Intensity Effects</h4>
                                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    <ControlSlider label="Pixelate" val={masterFX.pixelate} max={100} onChange={v => setMasterFX(p => ({...p, pixelate: v}))} />
                                    <ControlSlider label="Color Shift" val={masterFX.colorShift} max={360} onChange={v => setMasterFX(p => ({...p, colorShift: v}))} />
                                    <ControlSlider label="Noise" val={masterFX.noise} max={1} onChange={v => setMasterFX(p => ({...p, noise: v}))} />
                                    <ControlSlider label="Blur" val={masterFX.blur} max={20} onChange={v => setMasterFX(p => ({...p, blur: v}))} />
                                    <ControlSlider label="Sharpen" val={masterFX.sharpen} max={5} onChange={v => setMasterFX(p => ({...p, sharpen: v}))} />
                                    <ControlSlider label="Posterize" val={masterFX.posterize} max={16} onChange={v => setMasterFX(p => ({...p, posterize: v}))} />
                                    <ControlSlider label="RGB Shift" val={masterFX.rgbShift} max={50} onChange={v => setMasterFX(p => ({...p, rgbShift: v}))} />
                                    <ControlSlider label="Kaleidoscope" val={masterFX.kaleidoscope} max={20} onChange={v => setMasterFX(p => ({...p, kaleidoscope: v}))} />
                                    <ControlSlider label="Fisheye" val={masterFX.fisheye} max={1} onChange={v => setMasterFX(p => ({...p, fisheye: v}))} />
                                    <ControlSlider label="Twirl" val={masterFX.twirl} max={10} onChange={v => setMasterFX(p => ({...p, twirl: v}))} />
                             </div>
                          </div>
                             </div>
                                <div className="bg-[#232323] p-5 rounded-2xl border border-white/5 space-y-4 shadow-xl">
                                  <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><Layers3 size={14}/> Background</h3>
                                  <select 
                                    value={masterFX.backgroundType} 
                                    onChange={e => setMasterFX(p => ({...p, backgroundType: e.target.value as BackgroundType}))}
                                    className="w-full bg-[#0a0a0a] border border-white/5 p-3 rounded-xl text-[11px] font-black uppercase text-slate-200 outline-none focus:border-[#ffdc5e]/40"
                                  >
                                    <option value="none">None</option>
                                    <option value="gradient">Gradient</option>
                                    <option value="noise">Noise</option>
                                    <option value="grid">Grid</option>
                                    <option value="particles">Particles</option>
                                    <option value="waves">Waves</option>
                                    <option value="ken-burns-1">Ken Burns 1</option>
                                    <option value="ken-burns-2">Ken Burns 2</option>
                                    <option value="ken-burns-3">Ken Burns 3</option>
                                  </select>
                                   </div>
                                <div className="bg-[#232323] p-5 rounded-2xl border border-white/5 space-y-4 shadow-xl hover:border-white/10 transition-all duration-300">
                                  <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><AudioLines size={14} className="text-[#ffdc5e]/60"/><span className="bg-gradient-to-r from-slate-500 to-transparent h-[1px] flex-1 opacity-20"></span></h3>
                                  <ControlSlider label="Reverb" val={masterFX.reverb} max={1} onChange={v => setMasterFX(p => ({...p, reverb: v}))} />
                                  <ControlSlider label="Delay" val={masterFX.delay} max={1} onChange={v => setMasterFX(p => ({...p, delay: v}))} />
                                  <ControlSlider label="Delay Feedback" val={masterFX.delayFeedback} max={0.95} onChange={v => setMasterFX(p => ({...p, delayFeedback: v}))} />
                                  <ControlSlider label="Delay Time" val={masterFX.delayTime} max={1} onChange={v => setMasterFX(p => ({...p, delayTime: v}))} />
                                  <ControlSlider label="Distortion" val={masterFX.distortion} max={1} onChange={v => setMasterFX(p => ({...p, distortion: v}))} />
                                  <ControlSlider label="Lowpass" val={masterFX.lowpass} max={20000} min={20} onChange={v => setMasterFX(p => ({...p, lowpass: v}))} />
                                  <ControlSlider label="Highpass" val={masterFX.highpass} max={20000} min={20} onChange={v => setMasterFX(p => ({...p, highpass: v}))} />
                                  <ControlSlider label="Compressor" val={masterFX.compressor} max={1} onChange={v => setMasterFX(p => ({...p, compressor: v}))} />
                                </div>
                          </div>
                             )}
                        {activeTab === 'code' && (
                          <ShaderEditor
                            shader={shaders.find(s => s.id === activeClip.shaderId)}
                            error={shaderErrors[activeClip.shaderId]}
                            onChange={(code) => setShaders(p => p.map(s => s.id === activeClip.shaderId ? {...s, code} : s))}
                          />
                        )}
                        {activeTab === 'midi' && (
                          <MIDIPanel
                            devices={midiDevices}
                            isConnected={midiConnected}
                            activeDevice={midiDevice}
                            learnedMappings={midiMappings}
                            learnMode={midiLearnMode}
                            bpm={midiBPM}
                            onConnect={connectMIDI}
                            onDisconnect={disconnectMIDI}
                            onStartLearn={startMIDILearn}
                            onCancelLearn={cancelMIDILearn}
                            onRemoveMapping={removeMIDIMapping}
                            onUpdateMapping={updateMIDIMapping}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-10 uppercase font-black text-center gap-8 tracking-[0.6em]"><Layers3 size={60}/> Workspace_Idle</div>
                    )}
                  </div>
             </div>
          </aside>
        )}
      </main>

      {!isZenMode && (
        <>
          <div onMouseDown={(e) => startDrag(e, null, 'timeline-resize')} className="h-3 bg-transparent hover:bg-[#ffdc5e]/10 cursor-ns-resize transition-all flex items-center justify-center group relative z-50 py-1">
            <div className="w-20 h-[3px] bg-white/5 group-hover:bg-[#ffdc5e] group-hover:shadow-[0_0_15px_#ffdc5e] rounded-full transition-all flex items-center justify-center" />
          </div>
          <footer style={{ height: `${footerHeight}px` }} className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-5 flex flex-col gap-2 shrink-0 shadow-[0_-30px_60px_rgba(0,0,0,0.6)] relative animate-in slide-in-from-bottom duration-1000">
             <div className="h-4 bg-[#0a0a0a] rounded-full border border-white/5 relative mb-2 cursor-pointer overflow-hidden shadow-inner group" onClick={handleMinimapClick}>
                {clips.map(c => (
                    <div key={c.id} className={`absolute h-full border-x ${shaderErrors[c.shaderId] ? 'bg-red-500/50 border-red-500/40' : 'bg-[#ffdc5e]/30 border-[#ffdc5e]/20'}`} style={{ left: `${(c.startTime / totalDuration) * 100}%`, width: `${(c.duration / totalDuration) * 100}%` }} />
                ))}
                <div className="absolute top-0 bottom-0 w-[1.5px] bg-[#ffdc5e] shadow-[0_0_8px_#ffdc5e] transition-all" style={{ left: `${(playhead / totalDuration) * 100}%` }} />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
             </div>

             <div className="flex items-center justify-between px-4 text-[11px] font-black uppercase text-slate-500 mb-2">
                <div className="flex items-center gap-4">
                  <button onClick={() => setUseSnapping(!useSnapping)} className={`px-8 py-2 rounded-xl transition-all border ${useSnapping ? 'bg-[#ffdc5e] border-[#ffdc5e] text-black shadow-lg scale-105' : 'bg-[#0a0a0a] border-white/10 text-white hover:border-white/30'}`}>Magnet_Snap</button>
                  <select value={beatGrid} onChange={(e) => setBeatGrid(Number(e.target.value))} className="px-4 py-2 rounded-xl bg-[#0a0a0a] border border-white/10 text-white text-[10px] font-black uppercase hover:border-[#ffdc5e]/40 transition-all">
                    <option value={0}>No Grid</option>
                    <option value={4}>1/4 Beat</option>
                    <option value={8}>1/8 Beat</option>
                    <option value={16}>1/16 Beat</option>
                    <option value={32}>1/32 Beat</option>
                  </select>
                  <button onClick={() => setShowAutomationLanes(!showAutomationLanes)} className={`px-6 py-2 rounded-xl transition-all duration-300 border flex items-center gap-2 transform ${showAutomationLanes ? 'bg-[#ffdc5e] border-[#ffdc5e] text-black shadow-lg scale-105' : 'bg-[#0a0a0a] border-white/10 text-white hover:border-white/30 hover:bg-[#151515]'} hover:scale-110 active:scale-95`} title="Toggle Automation Lanes">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3v18h18M7 16l4-8 4 8 4-12"/>
                    </svg>
                    AUTO
                  </button>
                  <button onClick={() => addMarker()} className="px-6 py-2 rounded-xl bg-[#0a0a0a] border border-white/10 text-white hover:border-blue-500/50 hover:text-blue-400 transition-all duration-300 flex items-center gap-2 hover:bg-[#151515] hover:scale-110 active:scale-95 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]" title="Add Marker (Cmd+M)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M2 12h20"/>
                    </svg>
                    Marker ({markers.length})
                  </button>
                  <button 
                    onClick={() => {
                      if (loopRegion) {
                        setLoopRegion(null);
                      } else {
                        setLoopRegion({ start: playhead, end: Math.min(playhead + 10, totalDuration) });
                      }
                    }}
                    className={`px-6 py-2 rounded-xl border transition-all duration-300 flex items-center gap-2 transform ${
                      loopRegion 
                        ? 'bg-[#ffdc5e] border-[#ffdc5e] text-black shadow-lg scale-105' 
                        : 'bg-[#0a0a0a] border-white/10 text-white hover:border-[#ffdc5e]/50 hover:bg-[#151515]'
                    } hover:scale-110 active:scale-95`}
                    title="Toggle Loop Region (Cmd+L)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
                    </svg>
                    Loop {loopRegion ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="flex items-center gap-6 bg-[#0a0a0a] px-6 py-2 rounded-full border border-white/5 shadow-inner">
                   <Search size={16} className="text-[#ffdc5e] opacity-40"/><input type="range" min="5" max="250" step="1" value={timelineZoom} onChange={e => setTimelineZoom(parseInt(e.target.value))} className="w-80 h-1 bg-[#222] rounded-full appearance-none accent-[#ffdc5e] cursor-pointer" />
                </div>
             </div>
             
             <div ref={timelineRef} className="flex-grow flex relative overflow-hidden bg-[#080808] rounded-2xl border border-white/10 shadow-2xl">
                <div className="w-24 border-r border-white/10 flex flex-col shrink-0 bg-[#121212] z-40 shadow-2xl overflow-y-auto custom-scrollbar">
                   {[0,1,2,3,4,5,6,7].map(i => (
                     <div key={i} className={`min-h-[60px] flex-grow flex flex-col items-center justify-center gap-2 border-b border-white/5 last:border-0 relative transition-colors duration-300 ${i % 2 === 0 ? 'bg-gradient-to-r from-transparent to-white/[0.01]' : 'bg-gradient-to-r from-white/[0.01] to-transparent'}`}>
                        <div className="flex gap-1.5">
                          <button onClick={() => setTrackMutes(p=>p.map((v,idx)=>idx===i ? !v : v))} className={`w-7 h-7 rounded-lg text-[9px] font-black border transition-all duration-300 transform ${trackMutes[i] ? 'bg-orange-600 border-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)] scale-105' : 'bg-[#222] border-white/10 text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2a]'} hover:scale-110 active:scale-95`}>M</button>
                          <button onClick={() => setTrackSolos(p=>p.map((v,idx)=>idx===i ? !v : v))} className={`w-7 h-7 rounded-lg text-[9px] font-black border transition-all duration-300 transform ${trackSolos[i] ? 'bg-[#ffdc5e] border-[#ffdc5e] text-black shadow-xl shadow-[0_0_20px_rgba(255,220,94,0.5)] scale-105' : 'bg-[#222] border-white/10 text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2a]'} hover:scale-110 active:scale-95`}>S</button>
                        </div>
                     </div>
                   ))}
                </div>
                <div 
                  ref={timelineScrollRef}
                  className="flex-grow relative overflow-x-auto overflow-y-auto custom-scrollbar"
                  onWheel={(e) => {
                    // Horizontal scrolling with Shift+Wheel
                    if (e.shiftKey) {
                      e.preventDefault();
                      if (timelineScrollRef.current) {
                        timelineScrollRef.current.scrollLeft += e.deltaY;
                      }
                    }
                  }}
                  onMouseDown={(e) => {
                    // Drag-to-scroll: Only when clicking on empty timeline area (not on clips)
                    const target = e.target as HTMLElement;
                    const isClip = target.closest('.absolute.h-\\[12\\.5\\%\\]') || target.closest('[class*="absolute"][class*="h-"]');
                    const isMarker = target.closest('[class*="bg-blue-500"]');
                    const isLoop = target.closest('[class*="bg-\\[#ffdc5e\\]"]');
                    
                    if (!isClip && !isMarker && !isLoop && timelineScrollRef.current) {
                      const startX = e.pageX - (timelineScrollRef.current.scrollLeft || 0);
                      const startY = e.pageY - (timelineScrollRef.current.scrollTop || 0);
                      
                      const onMouseMove = (moveEvent: MouseEvent) => {
                        if (timelineScrollRef.current) {
                          timelineScrollRef.current.scrollLeft = startX - (moveEvent.pageX - startX);
                          timelineScrollRef.current.scrollTop = startY - (moveEvent.pageY - startY);
                        }
                      };
                      
                      const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        if (timelineScrollRef.current) {
                          timelineScrollRef.current.style.cursor = 'grab';
                        }
                      };
                      
                      timelineScrollRef.current.style.cursor = 'grabbing';
                      document.addEventListener('mousemove', onMouseMove);
                      document.addEventListener('mouseup', onMouseUp);
                      e.preventDefault();
                    }
                  }}
                  style={{ cursor: 'grab' }}
                >
                   <div className="tracks-area-content relative" style={{ width: `${totalDuration * timelineZoom}px`, height: '100%', minHeight: '480px' }}>
                      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#121212] to-[#0a0a0a] border-b border-white/10 z-40 pointer-events-none sticky top-0 shadow-lg">
                        {rulerTicks.map(t => {
                          const isBeat = beatGrid > 0 && (t * (masterFX.bpm || 120) / 60) % (4 / beatGrid) < 0.01;
                          return (
                            <div key={t} className={`absolute h-full border-l transition-all duration-200 ${isBeat ? 'border-[#ffdc5e]/40 w-[2px]' : 'border-white/20'}`} style={{ left: `${t * timelineZoom}px` }}>
                              <span className={`absolute left-3 top-2 text-[10px] font-black tracking-tighter transition-colors duration-200 ${isBeat ? 'text-[#ffdc5e]' : 'text-slate-600'}`}>{t}s</span>
                            </div>
                          );
                        })}
                        {loopRegion && (
                          <div 
                            className="absolute h-full bg-[#ffdc5e]/20 border-l-2 border-r-2 border-[#ffdc5e] z-50 cursor-move group pointer-events-auto transition-all duration-300 hover:bg-[#ffdc5e]/30"
                            style={{ 
                              left: `${loopRegion.start * timelineZoom}px`, 
                              width: `${(loopRegion.end - loopRegion.start) * timelineZoom}px` 
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              startDrag(e, null, 'loop-move');
                            }}
                          >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-[#ffdc5e] opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ffdc5e] opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
                            
                            {/* Start handle */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 bg-[#ffdc5e] cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all duration-300 hover:opacity-100 hover:w-3 hover:shadow-[0_0_10px_rgba(255,220,94,0.8)] z-10"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                startDrag(e, null, 'loop-start');
                              }}
                            />
                            
                            {/* End handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 bg-[#ffdc5e] cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all duration-300 hover:opacity-100 hover:w-3 hover:shadow-[0_0_10px_rgba(255,220,94,0.8)] z-10"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                startDrag(e, null, 'loop-end');
                              }}
                            />
                            
                            {/* Center label */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-[8px] font-black uppercase text-[#ffdc5e] bg-black/70 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg backdrop-blur-sm">
                                LOOP: {(loopRegion.end - loopRegion.start).toFixed(1)}s
                              </span>
                            </div>
                          </div>
                        )}
                        {markers.map(m => (
                          <div 
                            key={m.id} 
                            className="absolute top-0 bottom-0 w-[2px] bg-blue-500 shadow-[0_0_8px_#3b82f6] cursor-pointer hover:bg-blue-400 hover:w-[3px] transition-all duration-300 z-50 pointer-events-auto group" 
                            style={{ left: `${m.time * timelineZoom}px` }}
                            onClick={() => jumpToMarker(m.time)}
                            onContextMenu={(e) => { e.preventDefault(); removeMarker(m.id); }}
                            title={`${m.label || 'Marker'} - ${m.time.toFixed(2)}s (Right-click to delete)`}
                          >
                            <div className="absolute -top-1 -left-1.5 w-4 h-4 bg-blue-500 rounded-sm rotate-45 border border-black shadow-lg group-hover:scale-110 transition-transform duration-300" />
                            {m.label && (
                              <div className="absolute top-2 left-4 bg-blue-500/90 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                                {m.label}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="absolute inset-0 pt-8" onMouseDown={(e) => startDrag(e, null, 'scrub')}>
                         {[0,1,2,3,4,5,6,7].map(i => (
                           <div key={i} className={`h-[12.5%] border-b border-white/5 last:border-0 relative pointer-events-none transition-colors duration-300 ${i % 2 === 0 ? 'bg-[#080808]' : 'bg-[#0a0a0a]'} hover:bg-[#0f0f0f]`} />
                         ))}
                         {rulerTicks.map(t => {
                           const isBeat = beatGrid > 0 && (t * (masterFX.bpm || 120) / 60) % (4 / beatGrid) < 0.01;
                           return (
                             <div key={`g-${t}`} className={`absolute top-8 bottom-0 pointer-events-none transition-all duration-200 ${isBeat ? 'w-[1px] bg-[#ffdc5e]/10' : 'w-[1px] bg-white/[0.04]'}`} style={{ left: `${t * timelineZoom}px` }} />
                           );
                         })}
                         <div className="absolute inset-0 opacity-20 flex items-center pointer-events-none pt-8">{waveformPeaks.length > 0 && waveformPeaks.map((p, i) => (<div key={i} className="flex-grow bg-[#ffdc5e] shadow-[0_0_8px_#ffdc5e]" style={{ height: `${p*100}%`, minWidth: '1.5px' }} />))}</div>
                         {clips.map(c => (
                            <div key={c.id} onMouseDown={(e) => startDrag(e, c.id, 'move')} onContextMenu={(e) => handleContextMenu(e, c.id)} className={`absolute h-[12.5%] rounded-xl border flex flex-col justify-center px-4 transition-all duration-300 overflow-hidden cursor-move group ${activeClipId === c.id ? 'border-[#ffdc5e] bg-[#ffdc5e]/45 z-20 shadow-[0_0_40px_rgba(255,220,94,0.4)] scale-[1.02]' : 'border-white/10 bg-[#2a2a2a] hover:bg-[#333] hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'} ${trackMutes[c.track] ? 'opacity-30 grayscale blur-[3px]' : ''} ${shaderErrors[c.shaderId] ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : ''} ${c.isVideo ? 'border-blue-500/50 bg-blue-500/10' : ''}`} style={{left: `${c.startTime * timelineZoom}px`, width: `${c.duration * timelineZoom}px`, top: `${c.track * 12.5}%` }}>
                               {c.isVideo && c.videoThumbnail ? (
                                 <img src={c.videoThumbnail} alt="Video" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" />
                               ) : null}
                               <svg className="absolute inset-0 pointer-events-none w-full h-full opacity-30 transition-opacity duration-300 group-hover:opacity-40"><path d={`M 0,0 L ${c.fadeIn * timelineZoom},0 L 0,100 Z`} fill="#ffdc5e" /><path d={`M ${c.duration * timelineZoom},0 L ${(c.duration - c.fadeOut) * timelineZoom},0 L ${c.duration * timelineZoom},100 Z`} fill="#ffdc5e" /></svg>
                               <div className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/20 transition-all duration-300 z-30 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)]" onMouseDown={(e) => startDrag(e, c.id, 'resize-start')} />
                               <div onMouseDown={(e) => startDrag(e, c.id, 'fade-in')} className="absolute top-1 w-2.5 h-2.5 bg-white border border-black rounded-sm cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all duration-300 z-40 hover:scale-125 hover:shadow-[0_0_10px_rgba(255,220,94,0.8)]" style={{ left: `${c.fadeIn * timelineZoom - 5}px` }} />
                               <div onMouseDown={(e) => startDrag(e, c.id, 'fade-out')} className="absolute top-1 w-2.5 h-2.5 bg-white border border-black rounded-sm cursor-ew-resize opacity-0 group-hover:opacity-100 transition-all duration-300 z-40 hover:scale-125 hover:shadow-[0_0_10px_rgba(255,220,94,0.8)]" style={{ left: `${(c.duration - c.fadeOut) * timelineZoom - 5}px` }} />
                               <div className="flex items-center gap-2 z-10 select-none">
                                  {c.isVideo ? (
                                    <span className="text-[10px] font-black uppercase truncate text-blue-400 tracking-[0.1em] drop-shadow-lg flex items-center gap-1.5">
                                      <Video size={12}/> Video
                                    </span>
                                  ) : (
                                    <>
                                  <span className="text-[10px] font-black uppercase truncate text-white tracking-[0.1em] drop-shadow-lg">{shaders.find(s => s.id === c.shaderId)?.name}</span>
                                  {shaderErrors[c.shaderId] && <AlertTriangle size={10} className="text-red-500 animate-pulse"/>}
                                    </>
                                  )}
                               </div>
                               <span className="text-[8px] font-mono text-[#ffdc5e] font-bold opacity-80 pointer-events-none select-none tracking-tighter z-10">{c.startTime.toFixed(1)}s | {c.duration.toFixed(1)}s</span>
                               <div className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/20 transition-all duration-300 z-30 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)]" onMouseDown={(e) => startDrag(e, c.id, 'resize-end')} />
                            </div>
                         ))}
                         <div className="absolute top-0 bottom-0 w-[2.5px] bg-[#ffdc5e] z-[100] pointer-events-none shadow-[0_0_30px_#ffdc5e] transition-transform duration-75 ease-linear" style={{ transform: `translateX(${playhead * timelineZoom}px)` }}>
                           <div className="absolute -top-2 -left-2 w-5 h-5 bg-[#ffdc5e] rounded-sm rotate-45 border-2 border-black shadow-lg animate-pulse" />
                           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-gradient-to-b from-[#ffdc5e] via-[#ffdc5e]/80 to-transparent" />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
             <div className="flex justify-between px-4 text-[10px] font-black uppercase text-slate-700 tracking-[0.4em] mt-2 shrink-0"><span className="flex items-center gap-3">ELASTIC_CORE_V32_11 <Radio size={12} className="text-[#ffdc5e]/60 animate-pulse"/></span><span>Workspace: {playhead.toFixed(2)}s / {totalDuration.toFixed(1)}s</span></div>
          </footer>
        </>
      )}

      {contextMenu && (
        <div 
          className="fixed bg-[#121212] border border-white/20 rounded-2xl z-[999] py-2.5 min-w-[200px] animate-in zoom-in-95 duration-150 backdrop-blur-3xl" 
          style={{ top: contextMenu.y, left: contextMenu.x, boxShadow: '0 40px 80px rgba(0,0,0,0.9)' }} 
          onClick={(e) => e.stopPropagation()}
        >
           <button 
             onClick={() => { copyClips([contextMenu.clipId]); setContextMenu(null); }} 
             className="w-full text-left px-6 py-3.5 text-[11px] font-black uppercase hover:bg-[#ffdc5e] hover:text-black transition-all flex items-center gap-4"
           >
             <Copy size={16}/> Copy_Clip
           </button>
           <button 
             onClick={() => { copyClips([contextMenu.clipId]); setClips(p => p.filter(c => c.id !== contextMenu.clipId)); setContextMenu(null); }} 
             className="w-full text-left px-6 py-3.5 text-[11px] font-black uppercase hover:bg-orange-600 hover:text-white transition-all flex items-center gap-4"
           >
             <Copy size={16} className="rotate-180"/> Cut_Clip
           </button>
           <button 
             onClick={() => { pasteClips(playhead); setContextMenu(null); }} 
             disabled={copiedClips.length === 0} 
             className="w-full text-left px-6 py-3.5 text-[11px] font-black uppercase hover:bg-[#ffdc5e] hover:text-black transition-all flex items-center gap-4 disabled:opacity-30 disabled:cursor-not-allowed"
           >
             <Copy size={16} className="rotate-90"/> Paste_Clip
           </button>
           <button 
             onClick={() => duplicateClip(contextMenu.clipId)} 
             className="w-full text-left px-6 py-3.5 text-[11px] font-black uppercase hover:bg-[#ffdc5e] hover:text-black transition-all flex items-center gap-4"
           >
             <Copy size={16}/> Clone_Signal
           </button>
           <button 
             onClick={() => { setClips(p => p.filter(c => c.id !== contextMenu.clipId)); setContextMenu(null); }} 
             className="w-full text-left px-6 py-3.5 text-[11px] font-black uppercase hover:bg-red-600 hover:text-white transition-all flex items-center gap-4"
           >
             <Trash2 size={16}/> Destroy_Clip
           </button>
           <div className="border-t border-white/10 my-2 mx-3" />
           <button onClick={() => { setActiveClipId(contextMenu.clipId); setActiveTab('params'); setContextMenu(null); }} className="w-full text-left px-6 py-3.5 text-[11px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all flex items-center gap-4"><Sliders size={16}/> Parameters</button>
           <button onClick={() => {
             const clip = clips.find(c => c.id === contextMenu.clipId);
             if (clip) {
               setClips(p => p.map(c => c.id === contextMenu.clipId ? {...c, timeStretch: c.timeStretch === 1 ? 0.5 : c.timeStretch === 0.5 ? 2 : 1} : c));
             }
             setContextMenu(null);
           }} className="w-full text-left px-6 py-3.5 text-[11px] font-black uppercase hover:bg-purple-600 hover:text-white transition-all flex items-center gap-4">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
               <path d="M12 2v20M2 12h20"/>
             </svg>
             Time Stretch
           </button>
           <div className="border-t border-white/10 my-2 mx-3" />
           <button onClick={() => {
             const clip = clips.find(c => c.id === contextMenu.clipId);
             if (clip && totalDuration > 0) {
               // Set clip duration to reach end of song
               const newDuration = Math.max(0.1, totalDuration - clip.startTime);
               setClips(p => p.map(c => c.id === contextMenu.clipId ? {...c, duration: newDuration} : c));
             }
             setContextMenu(null);
           }} className="w-full text-left px-6 py-3.5 text-[11px] font-black uppercase hover:bg-green-600 hover:text-white transition-all flex items-center gap-4">
             <Maximize2 size={16}/>
             Clip auf Songlänge
           </button>
        </div>
      )}
    </div>
  );
};

// ErrorBoundary is now imported from components

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('home');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showImprint, setShowImprint] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [contactData, setContactData] = useState({ name: '', email: '', message: '' });
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  
  const startApp = () => { setMode('visuals'); };
  
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to a backend
    console.log('Newsletter signup:', newsletterEmail);
    setNewsletterSubmitted(true);
    setTimeout(() => {
      setNewsletterSubmitted(false);
      setNewsletterEmail('');
    }, 3000);
  };
  
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to a backend
    console.log('Contact form:', contactData);
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactData({ name: '', email: '', message: '' });
    }, 3000);
  };

  return mode === 'home' ? (
    <div className="min-h-screen bg-[#070707] relative overflow-hidden">
      <HomeBackground />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#070707]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pulse size={28} className="text-[#ffdc5e]"/>
            <span className="text-white font-black text-lg uppercase tracking-tight">Elastic Pulse</span>
      </div>
          <button onClick={startApp} className="px-6 py-2.5 bg-[#ffdc5e] text-black rounded-lg font-black uppercase text-xs tracking-wider hover:bg-white transition-all duration-300 hover:scale-105">
            Launch Studio
          </button>
           </div>
      </nav>
      
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 pt-32">
        <div className="flex flex-col items-center text-center z-10 max-w-6xl mx-auto">
          <div className="relative mb-12">
            <Pulse size={140} className="text-[#ffdc5e] animate-pulse shadow-[0_0_100px_rgba(255,220,94,0.6)]"/>
            <div className="absolute inset-0 animate-ping opacity-20">
              <Pulse size={140} className="text-[#ffdc5e]"/>
        </div>
          </div>
          <h1 className="text-[7rem] md:text-[11rem] font-black tracking-[-0.02em] text-white uppercase mb-6 select-none drop-shadow-[0_40px_80px_rgba(0,0,0,1)] leading-[0.9]">
            Elastic<br/>Pulse
          </h1>
          <p className="text-[#ffdc5e] font-black tracking-[0.3em] uppercase text-sm mb-6 opacity-90">Professional Visual Sequencer</p>
          <p className="text-slate-300 text-2xl md:text-3xl mb-4 max-w-3xl font-light leading-relaxed">
            Create stunning real-time visuals with WebGL shaders, AI-powered generation, video import, and professional-grade automation
          </p>
          <p className="text-slate-500 text-lg mb-8 max-w-2xl">
            The next-generation VJ software running entirely in your browser. No installation. No limits.
          </p>
          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-16">
            <div className="text-center">
              <div className="text-4xl font-black text-[#ffdc5e] mb-2">24+</div>
              <div className="text-slate-400 text-sm uppercase tracking-wider">Shaders</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-[#ffdc5e] mb-2">60+</div>
              <div className="text-slate-400 text-sm uppercase tracking-wider">Master Effects</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-[#ffdc5e] mb-2">100%</div>
              <div className="text-slate-400 text-sm uppercase tracking-wider">Browser-Based</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-[#ffdc5e] mb-2">∞</div>
              <div className="text-slate-400 text-sm uppercase tracking-wider">Possibilities</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button onClick={startApp} className="group px-12 py-6 bg-[#ffdc5e] text-black rounded-xl font-black uppercase tracking-[0.3em] text-sm hover:bg-white shadow-[0_40px_100px_rgba(255,220,94,0.6)] transition-all duration-300 flex items-center gap-4 active:scale-95 hover:scale-105">
              Start Creating
              <ChevronRight size={20} className="group-hover:translate-x-2 transition-transform duration-300"/>
            </button>
            <div className="flex items-center gap-6 text-slate-400 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#ffdc5e]"/>
                <span>No Installation</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-[#ffdc5e]"/>
                <span>GPU Accelerated</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Screenshot Section */}
      <section className="relative py-32 px-6 z-10 border-y border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-white uppercase mb-4 tracking-tighter">See It In Action</h2>
            <p className="text-slate-400 text-xl max-w-2xl mx-auto">Professional interface designed for creative professionals</p>
          </div>
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#ffdc5e]/20 via-transparent to-[#ffdc5e]/20 blur-3xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
            <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl p-2 shadow-2xl overflow-hidden">
              <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden">
                {/* App Interface Screenshot */}
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] p-6">
                  <div className="bg-[#070707] rounded-xl border border-white/5 overflow-hidden relative group/screenshot shadow-2xl">
                    <img 
                      src="./app-screenshot.png" 
                      alt="Elastic Pulse Studio Interface"
                      className="w-full h-auto object-contain"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 opacity-0 group-hover/screenshot:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#ffdc5e]/5 to-transparent pointer-events-none"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-[#ffdc5e]/10 blur-2xl opacity-50"></div>
          </div>
          <div className="text-center mt-12">
            <button onClick={startApp} className="group inline-flex items-center gap-3 px-8 py-4 bg-[#ffdc5e]/10 border border-[#ffdc5e]/30 text-[#ffdc5e] rounded-xl font-black uppercase text-sm tracking-wider hover:bg-[#ffdc5e]/20 hover:border-[#ffdc5e]/50 transition-all duration-300 hover:scale-105">
              <Monitor size={20}/>
              Try It Live
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 px-6 z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-black text-[#ffdc5e] mb-2">24+</div>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Shader Library</p>
            </div>
            <div>
              <div className="text-5xl font-black text-[#ffdc5e] mb-2">10</div>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Audio Bands</p>
            </div>
            <div>
              <div className="text-5xl font-black text-[#ffdc5e] mb-2">8</div>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Timeline Tracks</p>
            </div>
            <div>
              <div className="text-5xl font-black text-[#ffdc5e] mb-2">60+</div>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Master Effects</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-6 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-black text-white uppercase mb-6 tracking-tighter">Powerful Features</h2>
            <p className="text-slate-400 text-xl max-w-2xl mx-auto">Everything you need to create professional real-time visuals</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-[#ffdc5e]/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,220,94,0.2)]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#ffdc5e]/20 to-[#ffdc5e]/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Code size={40} className="text-[#ffdc5e]"/>
              </div>
              <h3 className="text-2xl font-black text-white uppercase mb-4">Professional Shader Editor</h3>
              <p className="text-slate-400 leading-relaxed mb-4">Monaco Editor with full GLSL syntax highlighting, real-time compilation, and intelligent error detection. Write, test, and iterate instantly.</p>
              <ul className="text-slate-500 text-sm space-y-2">
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Auto-completion</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Live preview</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Error diagnostics</li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="group bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-[#ffdc5e]/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,220,94,0.2)]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#ffdc5e]/20 to-[#ffdc5e]/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <AudioLines size={40} className="text-[#ffdc5e]"/>
              </div>
              <h3 className="text-2xl font-black text-white uppercase mb-4">Advanced Audio Analysis</h3>
              <p className="text-slate-400 leading-relaxed mb-4">10-band spectral analysis with kick/snare detection. Tie any parameter to frequency bands for dynamic, music-synced visuals.</p>
              <ul className="text-slate-500 text-sm space-y-2">
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Sub, Bass, Mid, Treble</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Kick & Snare detection</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Real-time FFT</li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="group bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-[#ffdc5e]/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,220,94,0.2)]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#ffdc5e]/20 to-[#ffdc5e]/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <TargetIcon size={40} className="text-[#ffdc5e]"/>
              </div>
              <h3 className="text-2xl font-black text-white uppercase mb-4">Visual Automation</h3>
              <p className="text-slate-400 leading-relaxed mb-4">Keyframe-based automation with Bezier curves, easing functions, and visual timeline editing. Precise control over every parameter.</p>
              <ul className="text-slate-500 text-sm space-y-2">
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Multiple curve types</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Copy & paste automation</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Visual lanes</li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="group bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-[#ffdc5e]/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,220,94,0.2)]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#ffdc5e]/20 to-[#ffdc5e]/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Sparkles size={40} className="text-[#ffdc5e]"/>
              </div>
              <h3 className="text-2xl font-black text-white uppercase mb-4">AI-Powered Generation</h3>
              <p className="text-slate-400 leading-relaxed mb-4">Neural shader generation powered by Google Gemini. Describe your vision in natural language and get production-ready GLSL code.</p>
              <ul className="text-slate-500 text-sm space-y-2">
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Natural language input</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Instant generation</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Ready to use</li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="group bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-[#ffdc5e]/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,220,94,0.2)]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#ffdc5e]/20 to-[#ffdc5e]/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Video size={40} className="text-[#ffdc5e]"/>
              </div>
              <h3 className="text-2xl font-black text-white uppercase mb-4">Video Import & Mixing</h3>
              <p className="text-slate-400 leading-relaxed mb-4">Import video files directly into your timeline. Apply shaders to videos for stunning visual effects. Professional video + shader compositing.</p>
              <ul className="text-slate-500 text-sm space-y-2">
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Video import (MP4, MOV, AVI)</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Shader on video</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Video thumbnails</li>
              </ul>
            </div>

            {/* Feature 5b - Export */}
            <div className="group bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-[#ffdc5e]/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,220,94,0.2)]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#ffdc5e]/20 to-[#ffdc5e]/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Download size={40} className="text-[#ffdc5e]"/>
              </div>
              <h3 className="text-2xl font-black text-white uppercase mb-4">Professional Export</h3>
              <p className="text-slate-400 leading-relaxed mb-4">Export high-quality MP4 videos or WebM streams. Real-time rendering with audio synchronization at any resolution.</p>
              <ul className="text-slate-500 text-sm space-y-2">
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> MP4 & WebM formats</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Custom resolution</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Real-time with audio</li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="group bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 hover:border-[#ffdc5e]/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,220,94,0.2)]">
              <div className="w-20 h-20 bg-gradient-to-br from-[#ffdc5e]/20 to-[#ffdc5e]/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Music size={40} className="text-[#ffdc5e]"/>
              </div>
              <h3 className="text-2xl font-black text-white uppercase mb-4">MIDI Integration</h3>
              <p className="text-slate-400 leading-relaxed mb-4">Full MIDI support with learn mode. Map hardware controllers to any parameter for live performance and real-time manipulation.</p>
              <ul className="text-slate-500 text-sm space-y-2">
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Learn mode</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Multiple devices</li>
                <li className="flex items-center gap-2"><Diamond size={12} className="text-[#ffdc5e]"/> Real-time control</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Features Section */}
      <section className="relative py-32 px-6 z-10 border-t border-white/5 bg-gradient-to-b from-transparent to-[#0a0a0a]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-black text-white uppercase mb-6 tracking-tighter">Advanced Capabilities</h2>
            <p className="text-slate-400 text-xl max-w-2xl mx-auto">Professional tools for demanding workflows</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1a1a1a]/60 border border-white/5 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <Gauge size={32} className="text-[#ffdc5e]"/>
                <h3 className="text-xl font-black text-white uppercase">LFO System</h3>
              </div>
              <p className="text-slate-400">Multiple LFOs per clip with Sine, Triangle, Square, and Noise waveforms. Modulate any parameter with configurable frequency and amplitude.</p>
            </div>
            <div className="bg-[#1a1a1a]/60 border border-white/5 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <BlendIcon size={32} className="text-[#ffdc5e]"/>
                <h3 className="text-xl font-black text-white uppercase">9 Blend Modes</h3>
              </div>
              <p className="text-slate-400">Normal, Add, Multiply, Screen, Overlay, Softlight, Hardlight, Dodge, and Burn. Professional compositing directly in the timeline.</p>
            </div>
            <div className="bg-[#1a1a1a]/60 border border-white/5 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <Layers3 size={32} className="text-[#ffdc5e]"/>
                <h3 className="text-xl font-black text-white uppercase">Master Effects</h3>
              </div>
              <p className="text-slate-400">60+ master effects including Bloom, Feedback, Strobe, Chroma Burst, Edge Detection, Pixelate, and more. Post-process your entire composition.</p>
            </div>
            <div className="bg-[#1a1a1a]/60 border border-white/5 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <Timer size={32} className="text-[#ffdc5e]"/>
                <h3 className="text-xl font-black text-white uppercase">Time Stretching</h3>
              </div>
              <p className="text-slate-400">Adjust clip playback speed without pitch changes. Perfect for tempo matching and creative time manipulation.</p>
            </div>
            <div className="bg-[#1a1a1a]/60 border border-white/5 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <Magnet size={32} className="text-[#ffdc5e]"/>
                <h3 className="text-xl font-black text-white uppercase">Beat Grid & Snap</h3>
              </div>
              <p className="text-slate-400">Musical quantization with 1/4, 1/8, 1/16, and 1/32 beat grid. Automatic BPM detection and beat-synced clip placement.</p>
            </div>
            <div className="bg-[#1a1a1a]/60 border border-white/5 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <Terminal size={32} className="text-[#ffdc5e]"/>
                <h3 className="text-xl font-black text-white uppercase">Text Overlays</h3>
              </div>
              <p className="text-slate-400">Multiple text overlay modes: Terminal, Matrix, Blueprint, Radar, Glitch, Hacker. Perfect for live shows and presentations.</p>
            </div>
            <div className="bg-[#1a1a1a]/60 border border-white/5 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <Video size={32} className="text-[#ffdc5e]"/>
                <h3 className="text-xl font-black text-white uppercase">Video Import</h3>
              </div>
              <p className="text-slate-400">Import video files directly into your timeline. Apply shaders to videos for creative effects. Professional video + shader compositing.</p>
            </div>
            <div className="bg-[#1a1a1a]/60 border border-white/5 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <Layers size={32} className="text-[#ffdc5e]"/>
                <h3 className="text-xl font-black text-white uppercase">Ken Burns Parallax</h3>
              </div>
              <p className="text-slate-400">Animated backgrounds with parallax effects. Multiple Ken Burns presets for dynamic depth and movement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="relative py-32 px-6 z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black text-white uppercase mb-6 tracking-tighter">Built With Modern Technology</h2>
            <p className="text-slate-400 text-lg">Cutting-edge web technologies for maximum performance</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="bg-[#1a1a1a]/40 border border-white/5 rounded-2xl p-8 text-center hover:border-[#ffdc5e]/30 transition-all duration-300">
              <div className="text-5xl font-black text-[#ffdc5e] mb-3">WebGL</div>
              <p className="text-slate-500 text-sm uppercase tracking-wider">GPU Acceleration</p>
              <p className="text-slate-600 text-xs mt-2">Hardware-accelerated rendering</p>
            </div>
            <div className="bg-[#1a1a1a]/40 border border-white/5 rounded-2xl p-8 text-center hover:border-[#ffdc5e]/30 transition-all duration-300">
              <div className="text-5xl font-black text-[#ffdc5e] mb-3">React</div>
              <p className="text-slate-500 text-sm uppercase tracking-wider">Modern UI</p>
              <p className="text-slate-600 text-xs mt-2">Component-based architecture</p>
            </div>
            <div className="bg-[#1a1a1a]/40 border border-white/5 rounded-2xl p-8 text-center hover:border-[#ffdc5e]/30 transition-all duration-300">
              <div className="text-5xl font-black text-[#ffdc5e] mb-3">TS</div>
              <p className="text-slate-500 text-sm uppercase tracking-wider">Type Safe</p>
              <p className="text-slate-600 text-xs mt-2">Full type coverage</p>
            </div>
            <div className="bg-[#1a1a1a]/40 border border-white/5 rounded-2xl p-8 text-center hover:border-[#ffdc5e]/30 transition-all duration-300">
              <div className="text-5xl font-black text-[#ffdc5e] mb-3">Vite</div>
              <p className="text-slate-500 text-sm uppercase tracking-wider">Fast Build</p>
              <p className="text-slate-600 text-xs mt-2">Lightning-fast HMR</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="relative py-32 px-6 z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-black text-white uppercase mb-6 tracking-tighter">Perfect For</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-[#ffdc5e]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Music size={48} className="text-[#ffdc5e]"/>
              </div>
              <h3 className="text-2xl font-black text-white uppercase mb-4">Live Performance</h3>
              <p className="text-slate-400">VJ for concerts, festivals, and events. Real-time audio-reactive visuals with MIDI control for dynamic live shows.</p>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 bg-[#ffdc5e]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Video size={48} className="text-[#ffdc5e]"/>
              </div>
              <h3 className="text-2xl font-black text-white uppercase mb-4">Content Creation</h3>
              <p className="text-slate-400">Create stunning visual content for social media, music videos, and digital art. Export in any resolution.</p>
            </div>
            <div className="text-center">
              <div className="w-24 h-24 bg-[#ffdc5e]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Code size={48} className="text-[#ffdc5e]"/>
              </div>
              <h3 className="text-2xl font-black text-white uppercase mb-4">Shader Development</h3>
              <p className="text-slate-400">Learn and experiment with GLSL shaders. Perfect for developers and artists exploring real-time graphics.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter & Contact Section */}
      <section className="relative py-32 px-6 z-10 border-t border-white/5 bg-gradient-to-b from-transparent to-[#0a0a0a]/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Newsletter */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-[#ffdc5e]/10 rounded-xl flex items-center justify-center">
                  <Mail size={32} className="text-[#ffdc5e]"/>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase">Newsletter</h3>
                  <p className="text-slate-400 text-sm">Stay updated with new features</p>
                </div>
              </div>
              <form onSubmit={handleNewsletterSubmit} className="space-y-4">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-[#ffdc5e]/40 focus:outline-none transition-all duration-300"
                />
                <button
                  type="submit"
                  disabled={newsletterSubmitted}
                  className="w-full px-6 py-3 bg-[#ffdc5e] text-black rounded-xl font-black uppercase text-sm tracking-wider hover:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {newsletterSubmitted ? (
                    <>
                      <RefreshCw size={16} className="animate-spin"/>
                      Subscribed!
                    </>
                  ) : (
                    <>
                      <Send size={16}/>
                      Subscribe
                    </>
                  )}
                </button>
              </form>
              <p className="text-slate-600 text-xs mt-4">We respect your privacy. Unsubscribe anytime.</p>
            </div>

            {/* Contact */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-[#ffdc5e]/10 rounded-xl flex items-center justify-center">
                  <Send size={32} className="text-[#ffdc5e]"/>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase">Contact</h3>
                  <p className="text-slate-400 text-sm">Get in touch with us</p>
                </div>
              </div>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <input
                  type="text"
                  value={contactData.name}
                  onChange={(e) => setContactData({...contactData, name: e.target.value})}
                  placeholder="Your Name"
                  required
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-[#ffdc5e]/40 focus:outline-none transition-all duration-300"
                />
                <input
                  type="email"
                  value={contactData.email}
                  onChange={(e) => setContactData({...contactData, email: e.target.value})}
                  placeholder="your.email@example.com"
                  required
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-[#ffdc5e]/40 focus:outline-none transition-all duration-300"
                />
                <textarea
                  value={contactData.message}
                  onChange={(e) => setContactData({...contactData, message: e.target.value})}
                  placeholder="Your Message"
                  required
                  rows={4}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-[#ffdc5e]/40 focus:outline-none transition-all duration-300 resize-none"
                />
                <button
                  type="submit"
                  disabled={contactSubmitted}
                  className="w-full px-6 py-3 bg-[#ffdc5e] text-black rounded-xl font-black uppercase text-sm tracking-wider hover:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {contactSubmitted ? (
                    <>
                      <RefreshCw size={16} className="animate-spin"/>
                      Sent!
                    </>
                  ) : (
                    <>
                      <Send size={16}/>
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-40 px-6 z-10 border-t border-white/5 bg-gradient-to-b from-transparent via-[#0a0a0a]/30 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-7xl md:text-8xl font-black text-white uppercase mb-8 tracking-tighter leading-none">Start Creating<br/>Today</h2>
          <p className="text-2xl text-slate-300 mb-4 max-w-2xl mx-auto">No installation. No credit card. Just pure creative power.</p>
          <p className="text-lg text-slate-500 mb-12">Experience the future of real-time visual creation</p>
          <button onClick={startApp} className="group px-16 py-8 bg-[#ffdc5e] text-black rounded-2xl font-black uppercase tracking-[0.3em] text-base hover:bg-white shadow-[0_40px_100px_rgba(255,220,94,0.6)] transition-all duration-300 flex items-center gap-6 active:scale-95 hover:scale-105 mx-auto">
            Launch Elastic Pulse Studio
            <ChevronRight size={24} className="group-hover:translate-x-3 transition-transform duration-300"/>
          </button>
          <p className="text-slate-600 text-sm mt-8 uppercase tracking-wider">100% Free • Runs in Browser • No Signup Required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 px-6 z-10 border-t border-white/5 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Pulse size={24} className="text-[#ffdc5e]"/>
                <span className="text-white font-black text-sm uppercase tracking-tight">Elastic Pulse Studio</span>
              </div>
              <p className="text-slate-600 text-xs mb-2">Professional WebGL visual sequencer</p>
              <p className="text-slate-700 text-xs">Version 32.11 | Titan Core Engine</p>
            </div>
            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-wider mb-4">Legal</h4>
              <div className="space-y-2">
                <button
                  onClick={() => setShowPrivacy(true)}
                  className="block text-slate-500 hover:text-[#ffdc5e] text-xs uppercase tracking-wider transition-colors duration-300"
                >
                  Datenschutz
                </button>
                <button
                  onClick={() => setShowImprint(true)}
                  className="block text-slate-500 hover:text-[#ffdc5e] text-xs uppercase tracking-wider transition-colors duration-300"
                >
                  Impressum
                </button>
              </div>
            </div>
            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-wider mb-4">Info</h4>
              <div className="space-y-2 text-slate-500 text-xs">
                <p>Built with WebGL, React, TypeScript & Vite</p>
                <p>Open Source • MIT License</p>
                <p className="text-slate-700">© 2024 Elastic Pulse Studio</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 text-center">
            <p className="text-slate-700 text-xs">All rights reserved. Elastic Pulse Studio is a demonstration project.</p>
          </div>
        </div>
      </footer>

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm" onClick={() => setShowPrivacy(false)}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-3xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-white uppercase">Datenschutzerklärung</h2>
              <button onClick={() => setShowPrivacy(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={24}/>
              </button>
            </div>
            <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">1. Verantwortlicher</h3>
                <p>Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p>
                <p className="mt-2 font-mono text-xs">
                  Frank Krumsdorf<br/>
                  Hospitalstraße 16<br/>
                  53840 Troisdorf<br/>
                  E-Mail: fraendk@hotmail.com<br/>
                  Telefon: +4915753105470
                </p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">2. Zweck der Website</h3>
                <p>Diese Website dient der Präsentation eines App- und Webprojekts im Rahmen einer Weiterbildung bzw. Prüfungsleistung im Bereich KI-gestützter Web- und App-Entwicklung. Es handelt sich nicht um ein kommerzielles Angebot.</p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">3. Hosting</h3>
                <p>Die Website wird über GitHub Pages bereitgestellt. Beim Aufruf der Website werden durch den Hostinganbieter technisch bedingt sogenannte Server-Logfiles erhoben. Dazu können gehören:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>IP-Adresse</li>
                  <li>Datum und Uhrzeit des Zugriffs</li>
                  <li>aufgerufene Seite</li>
                  <li>Browsertyp und Betriebssystem</li>
                </ul>
                <p className="mt-2">Diese Daten werden ausschließlich zur Sicherstellung des technischen Betriebs verarbeitet und nicht von mir ausgewertet.</p>
                <p className="mt-2 text-xs italic">Rechtsgrundlage für die Verarbeitung ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und stabilen Betrieb der Website).</p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">4. Kontaktaufnahme</h3>
                <p>Eine Kontaktaufnahme ist über einen bereitgestellten E-Mail-Link möglich.</p>
                <p className="mt-2">Bei der Kontaktaufnahme per E-Mail werden die von Ihnen übermittelten personenbezogenen Daten (z. B. E-Mail-Adresse, Inhalt der Nachricht) ausschließlich zum Zweck der Bearbeitung Ihrer Anfrage verwendet.</p>
                <p className="mt-2">Die Daten werden nicht an Dritte weitergegeben und nach Abschluss der Kommunikation gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.</p>
                <p className="mt-2 text-xs italic">Rechtsgrundlage für die Verarbeitung ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Kommunikation) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung von Anfragen).</p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">5. Newsletter</h3>
                <p>Auf der Website besteht die Möglichkeit, sich für einen Newsletter einzutragen. Der Newsletter ist derzeit konzeptionell vorbereitet, jedoch noch nicht aktiv. Eine tatsächliche Speicherung oder Verarbeitung personenbezogener Daten für den Newsletter-Versand findet aktuell nicht statt.</p>
                <p className="mt-2">Sollte der Newsletter zu einem späteren Zeitpunkt aktiviert werden, erfolgt dies ausschließlich auf Grundlage einer ausdrücklichen Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO. Eine Abmeldung wäre jederzeit möglich.</p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">6. Cookies und Tracking</h3>
                <p>Diese Website verwendet keine Cookies zu Analyse- oder Marketingzwecken. Es werden keine Tracking-Tools, Analyse-Dienste oder personalisierte Werbemaßnahmen eingesetzt.</p>
                <p className="mt-2">Technisch notwendige Cookies können in Einzelfällen durch den Hostinganbieter verwendet werden, sind jedoch für den Betrieb der Website erforderlich und nicht zustimmungspflichtig.</p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">7. Weitergabe von Daten</h3>
                <p>Eine Weitergabe personenbezogener Daten an Dritte findet nicht statt.</p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">8. Rechte der betroffenen Personen</h3>
                <p>Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Auskunft über Ihre gespeicherten personenbezogenen Daten</li>
                  <li>Berichtigung unrichtiger Daten</li>
                  <li>Löschung Ihrer Daten</li>
                  <li>Einschränkung der Verarbeitung</li>
                  <li>Widerspruch gegen die Verarbeitung</li>
                  <li>Datenübertragbarkeit</li>
                </ul>
                <p className="mt-2">Zur Wahrnehmung Ihrer Rechte wenden Sie sich bitte an die oben genannte E-Mail-Adresse.</p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">9. Aktualität dieser Datenschutzerklärung</h3>
                <p>Diese Datenschutzerklärung hat den Stand: {new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="mt-2">Ich behalte mir vor, diese Datenschutzerklärung bei Bedarf anzupassen, um sie an rechtliche oder technische Änderungen anzupassen.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Imprint Modal */}
      {showImprint && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm" onClick={() => setShowImprint(false)}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-3xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black text-white uppercase">Impressum</h2>
              <button onClick={() => setShowImprint(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={24}/>
              </button>
            </div>
            <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">Angaben gemäß § 5 Telemediengesetz (TMG)</h3>
                <p className="font-mono text-xs mt-2">
                  Frank Krumsdorf<br/>
                  Hospitalstraße 16<br/>
                  53840 Troisdorf<br/>
                  Deutschland
                </p>
                <p className="mt-2">E-Mail: fraendk@hotmail.com</p>
                <p className="mt-2">Telefon: +4915753105470</p>
                <p className="mt-2">Website: <a href="https://www.elasticfieldmusic.com/#imprint" target="_blank" rel="noopener noreferrer" className="text-[#ffdc5e] hover:underline">https://www.elasticfieldmusic.com/#imprint</a></p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">Projektbezogener Hinweis</h3>
                <p>Dieses Projekt wurde im Rahmen einer Weiterbildung bzw. Prüfungsleistung im Bereich KI-gestützte Web- und App-Entwicklung erstellt. Es handelt sich nicht um ein kommerzielles Angebot.</p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
                <p className="font-mono text-xs mt-2">
                  Frank Krumsdorf<br/>
                  Hospitalstraße 16<br/>
                  53840 Troisdorf
                </p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">Haftung für Inhalte</h3>
                <p>Als Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG bin ich jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">Haftung für Links</h3>
                <p>Diese Website enthält ggf. Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss habe. Für diese fremden Inhalte kann daher keine Gewähr übernommen werden. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.</p>
              </div>
              <div>
                <h3 className="text-white font-black uppercase mb-2 text-base">Urheberrecht</h3>
                <p>Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : <SequencerView onExit={() => setMode('home')} />;
};

const root = createRoot(document.getElementById('root')!); 
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

