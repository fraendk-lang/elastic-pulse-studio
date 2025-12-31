import { useRef, useEffect } from 'react';
import type { TimelineClip } from '../types';

export const useHistory = (clips: TimelineClip[], setClips: (clips: TimelineClip[] | ((prev: TimelineClip[]) => TimelineClip[])) => void) => {
  const historyRef = useRef<TimelineClip[][]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef(false);
  const maxHistorySize = 50;

  const saveToHistory = (newClips: TimelineClip[]) => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }
    
    historyRef.current.push(JSON.parse(JSON.stringify(newClips)));
    
    if (historyRef.current.length > maxHistorySize) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
  };

  const undo = () => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current--;
      setClips(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current++;
      setClips(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    }
  };

  useEffect(() => {
    if (historyRef.current.length === 0 && clips.length === 0) {
      saveToHistory([]);
    }
  }, []);

  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    
    const timeoutId = setTimeout(() => {
      const currentState = JSON.stringify(clips);
      const lastState = historyRef.current.length > 0 && historyIndexRef.current >= 0
        ? JSON.stringify(historyRef.current[historyIndexRef.current]) 
        : null;
      
      if (currentState !== lastState) {
        saveToHistory(clips);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [clips]);

  return {
    undo,
    redo,
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1
  };
};

