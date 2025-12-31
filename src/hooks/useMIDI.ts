import { useState, useEffect, useRef } from 'react';

export interface MIDIMessage {
  type: 'noteon' | 'noteoff' | 'cc' | 'clock' | 'start' | 'stop';
  channel: number;
  note?: number;
  velocity?: number;
  controller?: number;
  value?: number;
  timestamp: number;
}

export interface MIDIDevice {
  id: string;
  name: string;
  manufacturer?: string;
}

export interface MIDILearn {
  parameter: string;
  type: 'cc' | 'note';
  controller?: number;
  note?: number;
  channel?: number;
  min: number;
  max: number;
  inverted: boolean;
}

export const useMIDI = () => {
  const [devices, setDevices] = useState<MIDIDevice[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeDevice, setActiveDevice] = useState<MIDIDevice | null>(null);
  const [messages, setMessages] = useState<MIDIMessage[]>([]);
  const [learnMode, setLearnMode] = useState<{ parameter: string; type: 'cc' | 'note' } | null>(null);
  const [learnedMappings, setLearnedMappings] = useState<MIDILearn[]>([]);
  const [bpm, setBPM] = useState<number | null>(null);
  
  const midiAccessRef = useRef<WebMidi.MIDIAccess | null>(null);
  const inputRef = useRef<WebMidi.MIDIInput | null>(null);
  const clockTimesRef = useRef<number[]>([]);
  const lastClockTimeRef = useRef<number>(0);
  const callbacksRef = useRef<Map<string, (value: number) => void>>(new Map());

  useEffect(() => {
    const initMIDI = async () => {
      if (!navigator.requestMIDIAccess) {
        console.warn('Web MIDI API not supported');
        return;
      }

      try {
        const access = await navigator.requestMIDIAccess({ sysex: false });
        midiAccessRef.current = access;

        const inputs: MIDIDevice[] = [];
        access.inputs.forEach((input) => {
          inputs.push({
            id: input.id,
            name: input.name,
            manufacturer: input.manufacturer || undefined,
          });
        });

        setDevices(inputs);

        // Listen for new devices
        access.onstatechange = () => {
          const newInputs: MIDIDevice[] = [];
          access.inputs.forEach((input) => {
            newInputs.push({
              id: input.id,
              name: input.name,
              manufacturer: input.manufacturer || undefined,
            });
          });
          setDevices(newInputs);
        };
      } catch (e) {
        console.error('Failed to access MIDI:', e);
      }
    };

    initMIDI();
  }, []);

  const connectDevice = (deviceId: string) => {
    if (!midiAccessRef.current) return;

    const input = midiAccessRef.current.inputs.get(deviceId);
    if (!input) return;

    // Disconnect previous device
    if (inputRef.current) {
      inputRef.current.onmidimessage = null;
    }

    inputRef.current = input;
    setActiveDevice({
      id: input.id,
      name: input.name,
      manufacturer: input.manufacturer || undefined,
    });
    setIsConnected(true);

    input.onmidimessage = (event) => {
      const [status, data1, data2] = event.data;
      const messageType = status & 0xf0;
      const channel = status & 0x0f;
      const timestamp = event.timeStamp;

      let message: MIDIMessage | null = null;

      // Note On
      if (messageType === 0x90 && data2 > 0) {
        message = {
          type: 'noteon',
          channel,
          note: data1,
          velocity: data2,
          timestamp,
        };
      }
      // Note Off
      else if (messageType === 0x80 || (messageType === 0x90 && data2 === 0)) {
        message = {
          type: 'noteoff',
          channel,
          note: data1,
          velocity: data2 || 0,
          timestamp,
        };
      }
      // Control Change
      else if (messageType === 0xb0) {
        message = {
          type: 'cc',
          channel,
          controller: data1,
          value: data2,
          timestamp,
        };
      }
      // Clock
      else if (status === 0xf8) {
        message = {
          type: 'clock',
          channel: 0,
          timestamp,
        };
        
        // Calculate BPM from clock
        const now = performance.now();
        if (lastClockTimeRef.current > 0) {
          const interval = now - lastClockTimeRef.current;
          clockTimesRef.current.push(interval);
          if (clockTimesRef.current.length > 24) {
            clockTimesRef.current.shift();
          }
          
          if (clockTimesRef.current.length >= 12) {
            const avgInterval = clockTimesRef.current.reduce((a, b) => a + b, 0) / clockTimesRef.current.length;
            const calculatedBPM = Math.round(60000 / (avgInterval * 24)); // 24 clocks per beat
            if (calculatedBPM >= 60 && calculatedBPM <= 200) {
              setBPM(calculatedBPM);
            }
          }
        }
        lastClockTimeRef.current = now;
      }
      // Start
      else if (status === 0xfa) {
        message = { type: 'start', channel: 0, timestamp };
        clockTimesRef.current = [];
        lastClockTimeRef.current = performance.now();
      }
      // Stop
      else if (status === 0xfc) {
        message = { type: 'stop', channel: 0, timestamp };
      }

      if (message) {
        setMessages((prev) => [...prev.slice(-99), message!]);

        // Handle learned mappings
        if (learnMode) {
          if (message.type === learnMode.type) {
            const mapping: MIDILearn = {
              parameter: learnMode.parameter,
              type: learnMode.type,
              controller: message.controller,
              note: message.note,
              channel: message.channel,
              min: 0,
              max: 127,
              inverted: false,
            };
            setLearnedMappings((prev) => [...prev.filter((m) => m.parameter !== learnMode.parameter), mapping]);
            setLearnMode(null);
          }
        } else {
          // Apply learned mappings
          learnedMappings.forEach((mapping) => {
            let matches = false;
            let value = 0;

            if (mapping.type === 'cc' && message.type === 'cc' && message.controller === mapping.controller) {
              matches = true;
              value = message.value! / 127.0;
            } else if (mapping.type === 'note' && message.type === 'noteon' && message.note === mapping.note) {
              matches = true;
              value = message.velocity! / 127.0;
            }

            if (matches) {
              if (mapping.inverted) value = 1.0 - value;
              const mappedValue = mapping.min + (mapping.max - mapping.min) * value;
              const callback = callbacksRef.current.get(mapping.parameter);
              if (callback) callback(mappedValue);
            }
          });
        }
      }
    };
  };

  const disconnectDevice = () => {
    if (inputRef.current) {
      inputRef.current.onmidimessage = null;
      inputRef.current = null;
    }
    setActiveDevice(null);
    setIsConnected(false);
    setBPM(null);
  };

  const startLearn = (parameter: string, type: 'cc' | 'note') => {
    setLearnMode({ parameter, type });
  };

  const cancelLearn = () => {
    setLearnMode(null);
  };

  const removeMapping = (parameter: string) => {
    setLearnedMappings((prev) => prev.filter((m) => m.parameter !== parameter));
  };

  const updateMapping = (parameter: string, updates: Partial<MIDILearn>) => {
    setLearnedMappings((prev) =>
      prev.map((m) => (m.parameter === parameter ? { ...m, ...updates } : m))
    );
  };

  const registerCallback = (parameter: string, callback: (value: number) => void) => {
    callbacksRef.current.set(parameter, callback);
    return () => {
      callbacksRef.current.delete(parameter);
    };
  };

  return {
    devices,
    isConnected,
    activeDevice,
    messages: messages.slice(-10), // Last 10 messages
    learnMode,
    learnedMappings,
    bpm,
    connectDevice,
    disconnectDevice,
    startLearn,
    cancelLearn,
    removeMapping,
    updateMapping,
    registerCallback,
  };
};

