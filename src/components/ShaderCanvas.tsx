import React, { forwardRef, useRef, useEffect, useImperativeHandle } from 'react';
import type { TimelineClip, Shader, MasterFX } from '../types';
import { getAutomatedValue, getLFOValue } from '../utils/math';

interface ShaderCanvasProps {
  playhead: number;
  clips: TimelineClip[];
  shaders: Shader[];
  audioAnalysis: any;
  masterFX: MasterFX;
  mutes: boolean[];
  solos: boolean[];
  onShaderError?: (id: string, log: string | null) => void;
}

export const ShaderCanvas = forwardRef<HTMLCanvasElement, ShaderCanvasProps>(
  ({ playhead, clips, shaders, audioAnalysis, masterFX, mutes, solos, onShaderError }, ref) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const programsRef = useRef<Map<string, WebGLProgram>>(new Map());
    const shaderVersionsRef = useRef<Map<string, string>>(new Map());
    const errorCacheRef = useRef<Map<string, string | null>>(new Map());
    const videoTexturesRef = useRef<Map<string, WebGLTexture>>(new Map());
    const stateRef = useRef({ playhead, clips, shaders, audioAnalysis, masterFX, mutes, solos });
    const internalClockRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(performance.now());
    // Cache background shader program to avoid recreating every frame
    const backgroundProgramRef = useRef<WebGLProgram | null>(null);
    
    useImperativeHandle(ref, () => internalCanvasRef.current!);
    
    // Update state ref whenever props change - this is critical for rendering
    // Use a ref callback to ensure it's always up to date
    stateRef.current = { playhead, clips, shaders, audioAnalysis, masterFX, mutes, solos };

    useEffect(() => {
      let gl = internalCanvasRef.current?.getContext('webgl', { alpha: true, antialias: true, preserveDrawingBuffer: true }); 
      if (!gl) return;
      
      // WebGL Context Loss Recovery
      const handleContextLost = (e: Event) => {
        e.preventDefault();
        console.warn('WebGL context lost, will attempt recovery');
      };
      
      const handleContextRestored = () => {
        gl = internalCanvasRef.current?.getContext('webgl', { alpha: true, antialias: true, preserveDrawingBuffer: true });
        if (!gl) return;
        // Recreate shader programs
        programsRef.current.clear();
        shaderVersionsRef.current.clear();
        // Reset background program so it gets recreated
        backgroundProgramRef.current = null;
        console.log('WebGL context restored');
      };
      
      const canvas = internalCanvasRef.current;
      if (canvas) {
        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);
      }
      
      const vs = gl.createShader(gl.VERTEX_SHADER)!; 
      gl.shaderSource(vs, `attribute vec4 a_position; void main() { gl_Position = a_position; }`); 
      gl.compileShader(vs);
      const quadBuffer = gl.createBuffer(); 
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer); 
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

      let lastRenderTime = 0;
      const minRenderInterval = 1000 / 30; // Max 30 FPS when idle
      let idleFrameCount = 0;
      
      const render = () => {
        // Check if context is lost
        if (!gl || gl.isContextLost()) {
          requestAnimationFrame(render);
          return;
        }
        
        const now = performance.now();
        const { playhead: t, clips: cList, shaders: sList, audioAnalysis: audio, masterFX: fx, mutes: mT, solos: sT } = stateRef.current;
        
        // Check if we're idle (no clips at all, not playing, no animations)
        // Only throttle when there are NO clips at all - always render if clips exist
        const hasAnyClips = cList.length > 0;
        const isIdle = !hasAnyClips && !fx.strobe && !fx.freeze;
        
        // Throttle rendering when idle to save resources (only when no clips exist)
        if (isIdle) {
          idleFrameCount++;
          // Only render every 2nd frame when idle (30 FPS max)
          if (idleFrameCount % 2 !== 0 && now - lastRenderTime < minRenderInterval) {
            requestAnimationFrame(render);
            return;
          }
        } else {
          idleFrameCount = 0;
        }
        
        const delta = (now - lastTimeRef.current) / 1000; 
        lastTimeRef.current = now;
        lastRenderTime = now;
        internalClockRef.current += isFinite(delta) ? delta : 0;
        
        const canvas = internalCanvasRef.current; if (!canvas) return;
        const w = canvas.clientWidth, h = canvas.clientHeight; if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, w, h); 
        
        // Render background directly on canvas for export compatibility
        if (fx.backgroundType && fx.backgroundType !== 'none') {
          // Use 2D context for background rendering (temporary)
          const bgCanvas = document.createElement('canvas');
          bgCanvas.width = w;
          bgCanvas.height = h;
          const bgCtx = bgCanvas.getContext('2d');
          
          if (bgCtx) {
            // Render background based on type
            switch (fx.backgroundType) {
              case 'gradient': {
                const gradient = bgCtx.createLinearGradient(0, 0, w, h);
                const hue = (internalClockRef.current * 50) % 360;
                gradient.addColorStop(0, `hsl(${hue}, 70%, 40%)`);
                gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 70%, 30%)`);
                bgCtx.fillStyle = gradient;
                bgCtx.fillRect(0, 0, w, h);
                break;
              }
              case 'noise': {
                const imageData = bgCtx.createImageData(w, h);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                  const noise = Math.random() * 0.2;
                  data[i] = noise * 255;
                  data[i + 1] = noise * 255;
                  data[i + 2] = noise * 255;
                  data[i + 3] = 255;
                }
                bgCtx.putImageData(imageData, 0, 0);
                break;
              }
              case 'grid': {
                bgCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                bgCtx.fillRect(0, 0, w, h);
                bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                bgCtx.lineWidth = 1;
                const gridSize = 50;
                const offsetX = (internalClockRef.current * 10) % gridSize;
                const offsetY = (internalClockRef.current * 10) % gridSize;
                for (let x = -offsetX; x < w; x += gridSize) {
                  bgCtx.beginPath();
                  bgCtx.moveTo(x, 0);
                  bgCtx.lineTo(x, h);
                  bgCtx.stroke();
                }
                for (let y = -offsetY; y < h; y += gridSize) {
                  bgCtx.beginPath();
                  bgCtx.moveTo(0, y);
                  bgCtx.lineTo(w, y);
                  bgCtx.stroke();
                }
                break;
              }
              case 'particles': {
                bgCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                bgCtx.fillRect(0, 0, w, h);
                bgCtx.fillStyle = 'rgba(255, 220, 94, 0.7)';
                const particleCount = 50;
                for (let i = 0; i < particleCount; i++) {
                  const x = (w * 0.5 + Math.sin(internalClockRef.current + i) * w * 0.3 + (internalClockRef.current * 20 + i * 10) % w) % w;
                  const y = (h * 0.5 + Math.cos(internalClockRef.current * 0.7 + i) * h * 0.3 + (internalClockRef.current * 15 + i * 7) % h) % h;
                  bgCtx.beginPath();
                  bgCtx.arc(x, y, 3 + Math.sin(internalClockRef.current + i) * 2, 0, Math.PI * 2);
                  bgCtx.fill();
                }
                break;
              }
              case 'waves': {
                bgCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                bgCtx.fillRect(0, 0, w, h);
                bgCtx.strokeStyle = 'rgba(255, 220, 94, 0.5)';
                bgCtx.lineWidth = 2;
                for (let i = 0; i < 5; i++) {
                  bgCtx.beginPath();
                  const amplitude = 30 + i * 10;
                  const frequency = 0.01 + i * 0.005;
                  for (let x = 0; x < w; x += 2) {
                    const y = h / 2 + Math.sin(x * frequency + internalClockRef.current * 2 + i) * amplitude;
                    if (x === 0) bgCtx.moveTo(x, y);
                    else bgCtx.lineTo(x, y);
                  }
                  bgCtx.stroke();
                }
                break;
              }
              case 'ken-burns-1': {
                const scale = 1 + (internalClockRef.current % 10) * 0.02;
                const panX = (internalClockRef.current % 10) * w * 0.05;
                const panY = (internalClockRef.current % 10) * h * 0.03;
                bgCtx.save();
                bgCtx.translate(w / 2, h / 2);
                bgCtx.scale(scale, scale);
                bgCtx.translate(-w / 2 + panX, -h / 2 + panY);
                const gradient = bgCtx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w);
                gradient.addColorStop(0, `hsl(${(internalClockRef.current * 20) % 360}, 70%, 30%)`);
                gradient.addColorStop(1, `hsl(${(internalClockRef.current * 20 + 60) % 360}, 70%, 15%)`);
                bgCtx.fillStyle = gradient;
                bgCtx.fillRect(-w, -h, w * 3, h * 3);
                bgCtx.fillStyle = `rgba(255, 220, 94, ${0.2 + Math.sin(internalClockRef.current) * 0.1})`;
                bgCtx.beginPath();
                bgCtx.arc(w * 0.3, h * 0.3, 100 + Math.sin(internalClockRef.current) * 20, 0, Math.PI * 2);
                bgCtx.fill();
                bgCtx.restore();
                break;
              }
              case 'ken-burns-2': {
                const scale = 1.2 + Math.sin(internalClockRef.current * 0.5) * 0.1;
                const panX = Math.sin(internalClockRef.current * 0.3) * w * 0.2;
                const panY = Math.cos(internalClockRef.current * 0.3) * h * 0.2;
                bgCtx.save();
                bgCtx.translate(w / 2, h / 2);
                bgCtx.scale(scale, scale);
                bgCtx.rotate(internalClockRef.current * 0.1);
                bgCtx.translate(-w / 2 + panX, -h / 2 + panY);
                const gradient = bgCtx.createLinearGradient(0, 0, w, h);
                gradient.addColorStop(0, `hsl(${(internalClockRef.current * 30) % 360}, 60%, 25%)`);
                gradient.addColorStop(0.5, `hsl(${(internalClockRef.current * 30 + 120) % 360}, 60%, 15%)`);
                gradient.addColorStop(1, `hsl(${(internalClockRef.current * 30 + 240) % 360}, 60%, 25%)`);
                bgCtx.fillStyle = gradient;
                bgCtx.fillRect(-w, -h, w * 3, h * 3);
                bgCtx.strokeStyle = `rgba(255, 220, 94, ${0.3 + Math.sin(internalClockRef.current * 2) * 0.1})`;
                bgCtx.lineWidth = 3;
                for (let i = 0; i < 6; i++) {
                  bgCtx.beginPath();
                  const angle = (Math.PI * 2 / 6) * i + internalClockRef.current;
                  const x = w / 2 + Math.cos(angle) * 150;
                  const y = h / 2 + Math.sin(angle) * 150;
                  bgCtx.moveTo(w / 2, h / 2);
                  bgCtx.lineTo(x, y);
                  bgCtx.stroke();
                }
                bgCtx.restore();
                break;
              }
              case 'ken-burns-3': {
                const scale = 1 + (internalClockRef.current % 8) * 0.03;
                const panX = Math.cos(internalClockRef.current * 0.4) * w * 0.15;
                const panY = Math.sin(internalClockRef.current * 0.4) * h * 0.15;
                bgCtx.save();
                bgCtx.translate(w / 2, h / 2);
                bgCtx.scale(scale, scale);
                bgCtx.translate(-w / 2 + panX, -h / 2 + panY);
                const baseHue = (internalClockRef.current * 15) % 360;
                const gradient = bgCtx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 1.5);
                gradient.addColorStop(0, `hsla(${baseHue}, 80%, 35%, 0.9)`);
                gradient.addColorStop(1, `hsla(${(baseHue + 180) % 360}, 80%, 15%, 0.9)`);
                bgCtx.fillStyle = gradient;
                bgCtx.fillRect(-w, -h, w * 3, h * 3);
                bgCtx.fillStyle = `rgba(255, 220, 94, 0.6)`;
                for (let i = 0; i < 30; i++) {
                  const angle = (Math.PI * 2 / 30) * i + internalClockRef.current;
                  const radius = 80 + Math.sin(internalClockRef.current * 2 + i) * 30;
                  const x = w * 0.7 + Math.cos(angle) * radius;
                  const y = h * 0.3 + Math.sin(angle) * radius;
                  bgCtx.beginPath();
                  bgCtx.arc(x, y, 3 + Math.sin(internalClockRef.current + i) * 2, 0, Math.PI * 2);
                  bgCtx.fill();
                }
                bgCtx.restore();
                break;
              }
            }
            
            // Draw background to WebGL canvas using a texture
            // Create or reuse background shader program
            if (!backgroundProgramRef.current) {
              const bgVs = gl.createShader(gl.VERTEX_SHADER)!;
              gl.shaderSource(bgVs, `attribute vec4 a_position; varying vec2 v_texCoord; void main() { gl_Position = a_position; v_texCoord = (a_position.xy * 0.5 + 0.5); }`);
              gl.compileShader(bgVs);
              
              const bgFs = gl.createShader(gl.FRAGMENT_SHADER)!;
              gl.shaderSource(bgFs, `precision mediump float; uniform sampler2D u_texture; varying vec2 v_texCoord; void main() { gl_FragColor = texture2D(u_texture, v_texCoord); }`);
              gl.compileShader(bgFs);
              
              if (!gl.getShaderParameter(bgVs, gl.COMPILE_STATUS)) {
                console.error('Background vertex shader error:', gl.getShaderInfoLog(bgVs));
                gl.deleteShader(bgVs);
                gl.deleteShader(bgFs);
              } else if (!gl.getShaderParameter(bgFs, gl.COMPILE_STATUS)) {
                console.error('Background fragment shader error:', gl.getShaderInfoLog(bgFs));
                gl.deleteShader(bgVs);
                gl.deleteShader(bgFs);
              } else {
                const bgProg = gl.createProgram()!;
                gl.attachShader(bgProg, bgVs);
                gl.attachShader(bgProg, bgFs);
                gl.linkProgram(bgProg);
                
                if (gl.getProgramParameter(bgProg, gl.LINK_STATUS)) {
                  backgroundProgramRef.current = bgProg;
                } else {
                  console.error('Background program link error:', gl.getProgramInfoLog(bgProg));
                  gl.deleteProgram(bgProg);
                }
                
                gl.deleteShader(bgVs);
                gl.deleteShader(bgFs);
              }
            }
            
            // Render background if program exists
            if (backgroundProgramRef.current) {
              // Create texture from 2D canvas
              const bgTexture = gl.createTexture();
              if (!bgTexture) {
                console.error('Failed to create background texture');
                gl.clearColor(0.1, 0.1, 0.1, 1);
                gl.clear(gl.COLOR_BUFFER_BIT);
              } else {
                gl.bindTexture(gl.TEXTURE_2D, bgTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgCanvas);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                
                // Clear canvas first to ensure background is visible
                gl.clearColor(0, 0, 0, 1);
                gl.clear(gl.COLOR_BUFFER_BIT);
                
                // Use background program
                gl.useProgram(backgroundProgramRef.current);
                gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
                
                const bgPosLoc = gl.getAttribLocation(backgroundProgramRef.current, 'a_position');
                if (bgPosLoc >= 0) {
                  gl.enableVertexAttribArray(bgPosLoc);
                  gl.vertexAttribPointer(bgPosLoc, 2, gl.FLOAT, false, 0, 0);
                } else {
                  console.warn('Background position attribute not found');
                }
                
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, bgTexture);
                const texLoc = gl.getUniformLocation(backgroundProgramRef.current, 'u_texture');
                if (texLoc) {
                  gl.uniform1i(texLoc, 0);
                } else {
                  console.warn('Background texture uniform not found');
                }
                
                gl.disable(gl.BLEND);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                
                // Check for WebGL errors
                const error = gl.getError();
                if (error !== gl.NO_ERROR) {
                  console.warn('WebGL error during background render:', error);
                }
                
                // Cleanup texture (but keep program for reuse)
                gl.deleteTexture(bgTexture);
              }
            } else {
              // Fallback: if shader fails, at least clear with a color
              console.warn('Background shader program not available, type:', fx.backgroundType);
              gl.clearColor(0.1, 0.1, 0.1, 1);
              gl.clear(gl.COLOR_BUFFER_BIT);
            }
            
            // Enable blending for clips on top
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          } else {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          }
        } else {
          gl.clearColor(0.12, 0.12, 0.12, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        if (fx.blackout) return requestAnimationFrame(render);
        const hasSolo = sT.some(s => s);

        [0, 1, 2, 3, 4, 5, 6, 7].forEach(trackIndex => {
          if (mT[trackIndex]) return;
          if (hasSolo && !sT[trackIndex]) return;
          cList.filter(c => c.track === trackIndex && t >= c.startTime && t < c.startTime + c.duration).forEach(clip => {
            // Handle video clips - render as WebGL texture
            if (clip.isVideo && clip.videoElement && clip.videoUrl) {
              const video = clip.videoElement;
              
              // Check if video is valid
              if (!video || !isFinite(video.duration) || video.duration <= 0) {
                return; // Skip rendering if video is invalid
              }
              
              const tRel = (t - clip.startTime) / clip.duration;
              const videoTime = Math.max(0, Math.min(tRel * video.duration, video.duration));
              
              // Update video time (only if video is ready)
              if (video.readyState >= 2) {
                if (Math.abs(video.currentTime - videoTime) > 0.1) {
                  try {
                    video.currentTime = videoTime;
                  } catch (e) {
                    // Ignore seek errors
                  }
                }
                
                // Play video if not playing
                if (video.paused) {
                  video.play().catch(() => {});
                }
              }
              
              // Render video as texture
              if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                let videoTexture = videoTexturesRef.current.get(clip.id);
                if (!videoTexture) {
                  videoTexture = gl.createTexture()!;
                  gl.bindTexture(gl.TEXTURE_2D, videoTexture);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                  videoTexturesRef.current.set(clip.id, videoTexture);
                }
                
                // Update texture from video
                gl.bindTexture(gl.TEXTURE_2D, videoTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
                
                // Calculate fade
                let fade = 1;
                if (tRel < clip.fadeIn / clip.duration) {
                  fade = tRel / (clip.fadeIn / clip.duration);
                } else if (tRel > 1 - (clip.fadeOut / clip.duration)) {
                  fade = (1 - tRel) / (clip.fadeOut / clip.duration);
                }
                
                // Simple shader to render video texture
                const videoFs = `precision mediump float;
                  uniform sampler2D u_video;
                  uniform float u_opacity;
                  uniform vec2 u_resolution;
                  void main() {
                    vec2 uv = gl_FragCoord.xy / u_resolution;
                    vec4 color = texture2D(u_video, uv);
                    gl_FragColor = vec4(color.rgb, color.a * u_opacity);
                  }`;
                
                let videoProgram = programsRef.current.get(`video-${clip.id}`);
                if (!videoProgram) {
                  const vs = gl.createShader(gl.VERTEX_SHADER)!;
                  gl.shaderSource(vs, `attribute vec4 a_position; void main() { gl_Position = a_position; }`);
                  gl.compileShader(vs);
                  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
                  gl.shaderSource(fs, videoFs);
                  gl.compileShader(fs);
                  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
                    console.error('Video shader error:', gl.getShaderInfoLog(fs));
                    return;
                  }
                  videoProgram = gl.createProgram()!;
                  gl.attachShader(videoProgram, vs);
                  gl.attachShader(videoProgram, fs);
                  gl.linkProgram(videoProgram);
                  if (!gl.getProgramParameter(videoProgram, gl.LINK_STATUS)) {
                    console.error('Video program error:', gl.getProgramInfoLog(videoProgram));
                    return;
                  }
                  programsRef.current.set(`video-${clip.id}`, videoProgram);
                }
                
                gl.useProgram(videoProgram);
                gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
                const posLoc = gl.getAttribLocation(videoProgram, 'a_position');
                gl.enableVertexAttribArray(posLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
                gl.uniform1i(gl.getUniformLocation(videoProgram, 'u_video'), 0);
                gl.uniform1f(gl.getUniformLocation(videoProgram, 'u_opacity'), clip.opacity * fade);
                gl.uniform2f(gl.getUniformLocation(videoProgram, 'u_resolution'), w, h);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, videoTexture);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                
                // If video has a shader, continue to shader rendering with video as input
                // Otherwise, return (video-only)
                if (!clip.shaderId) {
                  return; // Skip shader rendering for video-only clips
                }
                // Continue to shader rendering with video texture available
              }
            }
            
            let sData = sList.find(s => s.id === clip.shaderId);
            // For video clips without shader, skip (already handled above)
            if (!sData) {
              // Debug: Log missing shader
              if (clip.shaderId && cList.length > 0) {
                console.warn('Shader not found for clip:', clip.shaderId, 'Available shaders:', sList.map(s => s.id));
              }
              return;
            }
            
            // Check if this is a video clip with shader
            const isVideoWithShader = clip.isVideo && clip.videoElement && clip.videoUrl;
            const shaderKey = isVideoWithShader ? `${sData.id}-video-${clip.id}` : sData.id;
            if (shaderVersionsRef.current.get(shaderKey) !== sData.code) {
              const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
              // Add u_video uniform if this is a video clip with shader
              const videoUniform = isVideoWithShader ? 'uniform sampler2D u_video;' : '';
              const fullFs = `precision mediump float;
                uniform float u_time, u_speed, u_intensity, u_opacity, u_audio_val, u_zoom, u_kaleidoscope;
                uniform float u_invert, u_chroma_burst, u_glitch_hit, u_mirror_flip, u_distort, u_hue_rotate;
                uniform float u_contrast, u_saturation, u_brightness, u_particles;
                uniform float u_tie_effect, u_feedback_delay;
                uniform float u_freeze, u_frozen_time, u_pixelate, u_noise, u_rgb_shift, u_posterize;
                uniform float u_scanlines, u_edge_detection, u_fisheye, u_twirl, u_master_kaleidoscope;
                uniform vec2 u_resolution; uniform vec3 u_color;
                ${videoUniform}
                float dynamic_time;
                vec3 hsv2rgb(vec3 c) { vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0); vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www); return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y); }
                vec3 rgb2hsv(vec3 c) { vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x); }
                
                float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

                ${sData.code.replace(/\bu_time\b/g, 'dynamic_time').replace(/void\s+main\s*\([^)]*\)/gi, 'void user_main()')}
                void main() {
                  dynamic_time = u_freeze > 0.5 ? u_frozen_time : u_time;
                  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
                  
                  // Initialize gl_FragColor with transparent black to allow background to show through
                  gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                  
                  // Master Kaleidoscope (applied early)
                  if(u_master_kaleidoscope > 0.0) {
                    float a = atan(p.y, p.x); float r = length(p);
                    float segments = floor(u_master_kaleidoscope) + 2.0;
                    a = mod(a, 3.14159 * 2.0 / segments);
                    a = abs(a - 3.14159 / segments);
                    p = vec2(cos(a), sin(a)) * r;
                  }
                  
                  // Fisheye
                  if(u_fisheye > 0.0) {
                    float r = length(p);
                    float f = 1.0 + u_fisheye * r * r;
                    p *= f;
                  }
                  
                  // Twirl
                  if(u_twirl > 0.0) {
                    float a = atan(p.y, p.x) + u_twirl * (1.0 - length(p));
                    float r = length(p);
                    p = vec2(cos(a), sin(a)) * r;
                  }
                  
                  // Pixelate (simplified - quantize coordinates)
                  if(u_pixelate > 0.0) {
                    float pixelSize = 1.0 + u_pixelate * 0.01;
                    p = floor(p * pixelSize * 10.0) / (pixelSize * 10.0);
                  }
                  
                  // Tie Effect (Radial Distortion)
                  if(u_tie_effect > 0.0) {
                     float r = length(p); float a = atan(p.y, p.x);
                     a += sin(r * 10.0 - dynamic_time) * u_tie_effect;
                     p = vec2(cos(a), sin(a)) * r;
                  }

                  if(u_distort > 0.0) { p += sin(p.yx * 8.0 + dynamic_time * 2.0) * u_distort * 0.05; }
                  if(u_zoom > 0.0) p /= (1.0 + u_zoom);
                  if(u_mirror_flip > 0.5) p = abs(p);
                  
                  // Kaleidoscope
                  if(u_kaleidoscope > 0.0) {
                     float a = atan(p.y, p.x); float r = length(p);
                     a = mod(a, 3.14159 * 2.0 / u_kaleidoscope);
                     a = abs(a - 3.14159 / u_kaleidoscope);
                     p = vec2(cos(a), sin(a)) * r;
                  }

                  if(u_glitch_hit > 0.5) p.x += sin(p.y * 30.0 + dynamic_time * 10.0) * 0.05;
                  
                  // Final Render with Temporal Feedback Loop
                  if(u_feedback_delay > 0.0) {
                     vec4 baseColor = vec4(0.0);
                     float originalTime = dynamic_time;
                     for(float i=0.0; i<3.0; i++) {
                        dynamic_time = originalTime - i * u_feedback_delay * 0.2;
                        user_main();
                        baseColor += gl_FragColor * (1.0 - i*0.3);
                     }
                     gl_FragColor = baseColor / 2.0;
                     dynamic_time = originalTime;
                  } else {
                     user_main();
                  }

                  // Particle Engine (Integrated)
                  if(u_particles > 0.0) {
                    float part = 0.0;
                    vec2 gridUV = p * 15.0;
                    vec2 id = floor(gridUV);
                    for(float x=-1.0; x<=1.0; x++) {
                      for(float y=-1.0; y<=1.0; y++) {
                        vec2 nid = id + vec2(x, y);
                        vec2 offset = vec2(hash(nid), hash(nid + 123.45)) - 0.5;
                        vec2 pPos = nid + 0.5 + offset * sin(dynamic_time + hash(nid)*10.0);
                        float d = length(gridUV - pPos);
                        part += smoothstep(0.1 + u_audio_val * 0.2, 0.0, d) * (0.5 + 0.5 * sin(dynamic_time * hash(nid)));
                      }
                    }
                    gl_FragColor.rgb += u_color * part * u_particles * 2.5;
                  }

                  vec3 col = gl_FragColor.rgb;
                  col = (col - 0.5) * u_contrast + 0.5 + u_brightness;
                  float gray = dot(col, vec3(0.299, 0.587, 0.114));
                  col = mix(vec3(gray), col, u_saturation);
                  if(u_hue_rotate > 0.0) { vec3 hsv = rgb2hsv(col); hsv.x = fract(hsv.x + u_hue_rotate); col = hsv2rgb(hsv); }
                  if(u_invert > 0.5) col = 1.0 - col;
                  if(u_chroma_burst > 0.5) col.rb += vec2(0.2);
                  
                  // Master FX Post-Processing
                  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
                  
                  // Noise
                  if(u_noise > 0.0) {
                    col += (hash(gl_FragCoord.xy + dynamic_time) - 0.5) * u_noise;
                  }
                  
                  // Posterize
                  if(u_posterize > 0.0) {
                    float levels = floor(u_posterize) + 1.0;
                    col = floor(col * levels) / levels;
                  }
                  
                  // Scanlines
                  if(u_scanlines > 0.5) {
                    float scanline = step(0.5, mod(gl_FragCoord.y, 2.0));
                    col *= 0.7 + scanline * 0.3;
                  }
                  
                  // Edge Detection (simplified - based on color difference)
                  if(u_edge_detection > 0.5) {
                    float edge = abs(col.r - col.g) + abs(col.g - col.b) + abs(col.b - col.r);
                    col = vec3(edge * 3.0);
                  }
                  
                  gl_FragColor = vec4(col, gl_FragColor.a * u_opacity);
                }`;
              gl.shaderSource(fs, fullFs); gl.compileShader(fs);
              
              if (gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
                const prog = gl.createProgram()!; gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); programsRef.current.set(shaderKey, prog);
                if (onShaderError) onShaderError(sData.id, null);
                errorCacheRef.current.set(sData.id, null);
              } else {
                const log = gl.getShaderInfoLog(fs);
                if (onShaderError) onShaderError(sData.id, log);
                errorCacheRef.current.set(sData.id, log);
              }
              shaderVersionsRef.current.set(shaderKey, sData.code);
            }
            
            // Prepare video texture if this is a video clip with shader
            let videoTexture: WebGLTexture | null = null;
            if (isVideoWithShader) {
              const video = clip.videoElement!;
              
              // Check if video is valid
              if (!video || !isFinite(video.duration) || video.duration <= 0) {
                return; // Skip rendering if video is invalid
              }
              
              const tRel = (t - clip.startTime) / clip.duration;
              const videoTime = Math.max(0, Math.min(tRel * video.duration, video.duration));
              
              // Update video time (only if video is ready)
              if (video.readyState >= 2) {
                if (Math.abs(video.currentTime - videoTime) > 0.1) {
                  try {
                    video.currentTime = videoTime;
                  } catch (e) {
                    // Ignore seek errors
                  }
                }
                
                // Play video if not playing
                if (video.paused) {
                  video.play().catch(() => {});
                }
              }
              
              // Get or create video texture
              if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                let vTex = videoTexturesRef.current.get(clip.id);
                if (!vTex) {
                  vTex = gl.createTexture()!;
                  gl.bindTexture(gl.TEXTURE_2D, vTex);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                  videoTexturesRef.current.set(clip.id, vTex);
                }
                
                // Update texture from video
                gl.bindTexture(gl.TEXTURE_2D, vTex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
                videoTexture = vTex;
              }
            }
            
            let prog = programsRef.current.get(shaderKey); 
            if (!prog) {
              gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
              const scanline = Math.sin(gl.canvas.height * t * 0.1) * 0.1 + 0.1;
              gl.clearColor(0.2, 0.05, 0.05, scanline);
              return;
            }
            gl.useProgram(prog); 
            // Always enable blending when background is active
            if (fx.backgroundType && fx.backgroundType !== 'none') {
              gl.enable(gl.BLEND);
              // Use standard alpha blending to allow background to show through
              gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            } else {
              gl.enable(gl.BLEND);
              switch(clip.blendMode) {
                case 'add': gl.blendFunc(gl.SRC_ALPHA, gl.ONE); break;
                case 'multiply': gl.blendFunc(gl.DST_COLOR, gl.ZERO); break;
                case 'screen': gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR); break;
                default: gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); break;
              }
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            const posLoc = gl.getAttribLocation(prog, 'a_position'); gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
            
            // Set video texture if available (use TEXTURE1, TEXTURE0 is for other textures)
            if (isVideoWithShader && videoTexture) {
              gl.activeTexture(gl.TEXTURE1);
              gl.bindTexture(gl.TEXTURE_2D, videoTexture);
              const videoLoc = gl.getUniformLocation(prog, 'u_video');
              if (videoLoc) {
                gl.uniform1i(videoLoc, 1);
              }
            }
            
            const rel = t - clip.startTime; const timeRel = (rel / clip.duration) * (clip.timeStretch || 1); // Apply time stretch
            let fadeMult = 1.0;
            if (rel < clip.fadeIn) fadeMult = rel / Math.max(0.01, clip.fadeIn);
            else if (rel > clip.duration - clip.fadeOut) fadeMult = (clip.duration - rel) / Math.max(0.01, clip.fadeOut);
            fadeMult = Math.max(0, Math.min(1, fadeMult));
            const getVal = (key: string, base: number) => {
                let v = getAutomatedValue(clip.automation?.[key], base, timeRel);
                clip.lfos.forEach(lfo => { if (lfo.target === key) v += getLFOValue(lfo, internalClockRef.current, fx.bpm); });
                return v;
            };
            const setU = (n: string, v: number) => { const l = gl.getUniformLocation(prog!, n); if (l) gl.uniform1f(l, v); };
            setU('u_time', t + internalClockRef.current * 0.1); gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), canvas.width, canvas.height);
            setU('u_speed', getVal('speed', clip.params.speed)); setU('u_intensity', getVal('intensity', clip.params.intensity)); 
            setU('u_opacity', getVal('opacity', clip.opacity) * fadeMult);
            setU('u_zoom', fx.zoomPunch ? 0.9 : getVal('zoom', clip.params.zoom));
            setU('u_kaleidoscope', getVal('kaleidoscope', clip.params.kaleidoscope));
            setU('u_distort', getVal('distort', clip.params.distort));
            setU('u_hue_rotate', getVal('hueRotate', clip.params.hueRotate));
            setU('u_contrast', getVal('contrast', clip.params.contrast));
            setU('u_saturation', getVal('saturation', clip.params.saturation));
            setU('u_brightness', getVal('brightness', clip.params.brightness));
            setU('u_tie_effect', getVal('tieEffect', clip.params.tieEffect));
            setU('u_feedback_delay', getVal('feedbackDelay', clip.params.feedbackDelay));
            setU('u_particles', getVal('particles', clip.params.particles));
            setU('u_invert', fx.invert ? 1.0 : 0.0); setU('u_chroma_burst', fx.chromaBurst ? 1.0 : 0.0);
            setU('u_glitch_hit', fx.glitchHit ? 1.0 : 0.0); setU('u_mirror_flip', fx.mirrorFlip ? 1.0 : 0.0);
            setU('u_freeze', fx.freeze ? 1.0 : 0.0); setU('u_frozen_time', internalClockRef.current);
            setU('u_pixelate', fx.pixelate); setU('u_noise', fx.noise);
            setU('u_rgb_shift', fx.rgbShift); setU('u_posterize', fx.posterize);
            setU('u_scanlines', fx.scanlines ? 1.0 : 0.0); setU('u_edge_detection', fx.edgeDetection ? 1.0 : 0.0);
            setU('u_fisheye', fx.fisheye); setU('u_twirl', fx.twirl);
            setU('u_master_kaleidoscope', fx.kaleidoscope);
            const h_val = getVal('color', clip.params.color); const r = Math.max(0, Math.min(1, Math.abs(h_val * 6.0 - 3.0) - 1.0)), g = Math.max(0, Math.min(1, 2.0 - Math.abs(h_val * 6.0 - 2.0))), b = Math.max(0, Math.min(1, 2.0 - Math.abs(h_val * 6.0 - 4.0)));
            gl.uniform3f(gl.getUniformLocation(prog, 'u_color'), r, g, b); 
            setU('u_audio_val', audio[clip.audioTie || 'vol'] * clip.audioReactive);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
          });
        });
        if (fx.strobe && Math.floor(internalClockRef.current * 25) % 2 === 0) { 
          if (fx.backgroundType && fx.backgroundType !== 'none') {
            gl.clearColor(1,1,1,0.5); // Semi-transparent strobe when background is active
          } else {
            gl.clearColor(1,1,1,1);
          }
          gl.clear(gl.COLOR_BUFFER_BIT); 
        }
        requestAnimationFrame(render);
      };
      requestAnimationFrame(render);
      
      return () => {
        // Cleanup: Remove event listeners
        if (canvas) {
          canvas.removeEventListener('webglcontextlost', handleContextLost);
          canvas.removeEventListener('webglcontextrestored', handleContextRestored);
        }
        // Cleanup: Clear video textures when component unmounts
        videoTexturesRef.current.forEach((texture) => {
          if (gl && texture) {
            gl.deleteTexture(texture);
          }
        });
        videoTexturesRef.current.clear();
        // Cleanup: Delete background program
        if (backgroundProgramRef.current && gl) {
          gl.deleteProgram(backgroundProgramRef.current);
          backgroundProgramRef.current = null;
        }
        // Note: We don't stop the render loop here as it's needed for continuous rendering
      };
    }, []);
    
    const feedbackVal = masterFX.feedback + (masterFX.feedbackDrive ? 15 : 0);
    
    // Build CSS filter string for master effects
    const filters: string[] = [];
    if (feedbackVal > 0) filters.push(`blur(${feedbackVal}px)`);
    if (masterFX.bloom > 0) filters.push(`brightness(${1.0 + masterFX.bloom})`);
    if (masterFX.blur > 0) filters.push(`blur(${masterFX.blur}px)`);
    if (masterFX.invert) filters.push('invert(1)');
    if (masterFX.colorShift > 0) {
      filters.push(`hue-rotate(${masterFX.colorShift}deg)`);
    }
    if (masterFX.sharpen > 0) {
      // Sharpen via contrast
      filters.push(`contrast(${1 + masterFX.sharpen * 0.1})`);
    }
    if (masterFX.rgbShift > 0) {
      // RGB shift via CSS is limited, but we can use hue-rotate as approximation
    }
    
    const filterString = filters.length > 0 ? filters.join(' ') : 'none';
    
    // When background is active, make canvas completely transparent so background shows through
    const canvasStyle: React.CSSProperties = {
      filter: filterString,
      backgroundColor: masterFX.backgroundType && masterFX.backgroundType !== 'none' ? 'transparent' : '#1e1e1e',
      zIndex: 1,
      position: 'relative',
      mixBlendMode: masterFX.backgroundType && masterFX.backgroundType !== 'none' ? 'normal' : 'normal'
    };
    
    return <canvas ref={internalCanvasRef} className="w-full h-full block relative" style={canvasStyle} />;
  }
);

ShaderCanvas.displayName = 'ShaderCanvas';

