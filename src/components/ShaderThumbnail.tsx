import React, { useState, useEffect, useRef } from 'react';
import type { Shader } from '../types';

interface ShaderThumbnailProps {
  shader: Shader;
}

export const ShaderThumbnail: React.FC<ShaderThumbnailProps> = ({ shader }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (snapshot) return; 

    const gl = canvasRef.current?.getContext('webgl', { preserveDrawingBuffer: true }); 
    if (!gl) return;

    const vs = gl.createShader(gl.VERTEX_SHADER)!; 
    gl.shaderSource(vs, `attribute vec4 a_position; void main() { gl_Position = a_position; }`); 
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    const stripRegex = /uniform\s+(float|vec2|vec3)\s+[\w, ]+;/g;
    const processedCode = shader.code
      .replace(/precision\s+\w+\s+float\s*;/g, '')
      .replace(stripRegex, '')
      .replace(/\bu_time\b/g, 'dynamic_time')
      .replace(/void\s+main\s*\([^)]*\)/gi, 'void user_main()');
    
    const fullFs = `
      precision mediump float; 
      uniform float u_time, u_speed, u_intensity, u_opacity, u_audio_val, u_zoom, u_kaleidoscope;
      uniform float u_distort, u_hue_rotate, u_contrast, u_saturation, u_brightness;
      uniform float u_tie_effect, u_feedback_delay, u_particles;
      uniform vec2 u_resolution; uniform vec3 u_color; 
      float dynamic_time;
      vec3 hsv2rgb(vec3 c) { vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0); vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www); return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y); }
      vec3 rgb2hsv(vec3 c) { vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0); vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g)); vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r)); float d = q.x - min(q.w, q.y); return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x); }
      ${processedCode} 
      void main() { 
        dynamic_time = u_time;
        vec2 p = gl_FragCoord.xy/u_resolution.xy; 
        user_main(); 
      }`;
      
    gl.shaderSource(fs, fullFs); 
    gl.compileShader(fs);
    const prog = gl.createProgram()!; 
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); 
    gl.linkProgram(prog);
    
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setSnapshot('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'); 
      return;
    }
    
    gl.useProgram(prog);
    const buf = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); 
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position'); 
    if (pos >= 0) { gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0); }
    
    gl.viewport(0, 0, 80, 80);
    const setU = (n: string, v: number) => { const l = gl.getUniformLocation(prog, n); if (l) gl.uniform1f(l, v); };
    gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), 1.5); 
    gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), 80, 80);
    setU('u_speed', 1.0); setU('u_intensity', 1.0); setU('u_opacity', 1.0); 
    gl.uniform3f(gl.getUniformLocation(prog, 'u_color'), 1.0, 0.86, 0.37);
    setU('u_audio_val', 0.2); setU('u_zoom', 0.0); setU('u_kaleidoscope', 0.0);
    setU('u_distort', 0.0); setU('u_hue_rotate', 0.0); setU('u_contrast', 1.0);
    setU('u_saturation', 1.0); setU('u_brightness', 0.0);
    setU('u_tie_effect', 0.0); setU('u_feedback_delay', 0.0); setU('u_particles', 0.0);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    const dataUrl = canvasRef.current!.toDataURL('image/png');
    setSnapshot(dataUrl);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(buf);
    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const extension = gl.getExtension('WEBGL_lose_context');
    if (extension) extension.loseContext();
  }, [shader, snapshot]);

  return (
    <div className="w-14 h-14 rounded-md bg-[#0a0a0a] border border-white/5 group-hover:border-[#ffdc5e]/50 transition-all shadow-lg overflow-hidden flex items-center justify-center">
      {snapshot && snapshot.length > 0 ? (
        <img src={snapshot} alt={shader.name} className="w-full h-full object-cover" />
      ) : (
        <canvas ref={canvasRef} width={80} height={80} className="w-full h-full opacity-0" />
      )}
    </div>
  );
};

