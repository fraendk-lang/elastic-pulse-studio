import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;

export const loadFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance && ffmpegLoaded) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    ffmpegInstance = ffmpeg;
    ffmpegLoaded = true;
    return ffmpeg;
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    throw error;
  }
};

export const exportToMP4 = async (
  frames: string[], // Array of base64 data URLs
  fps: number,
  width: number,
  height: number,
  bitrate: number,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  if (frames.length === 0) {
    throw new Error('No frames to export');
  }
  
  const ffmpeg = await loadFFmpeg();
  
  try {
    // Write frames to FFmpeg
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (!frame || !frame.includes(',')) {
        console.warn(`Skipping invalid frame ${i}`);
        continue;
      }
      
      const frameData = frame.split(',')[1]; // Remove data:image/png;base64, prefix
      if (!frameData) {
        console.warn(`Skipping empty frame ${i}`);
        continue;
      }
      
      try {
        const frameBuffer = Uint8Array.from(atob(frameData), c => c.charCodeAt(0));
        const frameName = `frame-${i.toString().padStart(6, '0')}.png`;
        await ffmpeg.writeFile(frameName, frameBuffer);
        
        if (onProgress) {
          onProgress((i / frames.length) * 50); // First 50% is writing frames
        }
      } catch (frameError) {
        console.error(`Error writing frame ${i}:`, frameError);
        throw new Error(`Failed to write frame ${i}: ${frameError instanceof Error ? frameError.message : 'Unknown error'}`);
      }
    }
    
    if (onProgress) {
      onProgress(50);
    }
    
    // FFmpeg command to create MP4
    const bitrateKbps = Math.max(100, Math.floor(bitrate / 1000)); // Minimum 100kbps
    
    const ffmpegArgs = [
      '-framerate', fps.toString(),
      '-i', 'frame-%06d.png',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-b:v', `${bitrateKbps}k`,
      '-maxrate', `${bitrateKbps}k`,
      '-bufsize', `${bitrateKbps * 2}k`,
      '-r', fps.toString(),
      '-s', `${width}x${height}`,
      '-y',
      'output.mp4'
    ];
    
    await ffmpeg.exec(ffmpegArgs);
    
    if (onProgress) {
      onProgress(90);
    }
    
    // Read output file
    const data = await ffmpeg.readFile('output.mp4');
    
    if (!data || data.length === 0) {
      throw new Error('FFmpeg produced empty output file');
    }
    
    if (onProgress) {
      onProgress(100);
    }
    
    // Cleanup
    try {
      for (let i = 0; i < frames.length; i++) {
        await ffmpeg.deleteFile(`frame-${i.toString().padStart(6, '0')}.png`).catch(() => {});
      }
      await ffmpeg.deleteFile('output.mp4').catch(() => {});
    } catch (cleanupError) {
      console.warn('Cleanup error (non-critical):', cleanupError);
    }
    
    return new Blob([data], { type: 'video/mp4' });
    
  } catch (error) {
    // Cleanup on error
    try {
      for (let i = 0; i < frames.length; i++) {
        await ffmpeg.deleteFile(`frame-${i.toString().padStart(6, '0')}.png`).catch(() => {});
      }
      await ffmpeg.deleteFile('output.mp4').catch(() => {});
    } catch (cleanupError) {
      console.warn('Cleanup error during error handling:', cleanupError);
    }
    
    throw error;
  }
};

