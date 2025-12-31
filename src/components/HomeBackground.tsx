import React, { useEffect, useRef } from 'react';

export const HomeBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const gl = canvasRef.current?.getContext('webgl'); 
    if (!gl) return;
    const vs = gl.createShader(gl.VERTEX_SHADER)!; 
    gl.shaderSource(vs, `attribute vec4 a_position; void main() { gl_Position = a_position; }`); 
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, `precision mediump float;
      uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_mouse;
      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.y, u_resolution.x);
        float d = length(uv - u_mouse * 0.1);
        vec3 col = vec3(0.18, 0.18, 0.2);
        col += (0.01 / d) * vec3(1.0, 0.86, 0.37) * (sin(u_time * 0.5) * 0.2 + 0.8);
        gl_FragColor = vec4(col * 0.4, 1.0);
      }`); 
    gl.compileShader(fs);
    const prog = gl.createProgram()!; 
    gl.attachShader(prog, vs); 
    gl.attachShader(prog, fs); 
    gl.linkProgram(prog); 
    gl.useProgram(prog);
    const buf = gl.createBuffer(); 
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); 
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position'); 
    gl.enableVertexAttribArray(pos); 
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const mouse = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => { 
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1; 
      mouse.y = (e.clientY / window.innerHeight) * -2 + 1; 
    };
    window.addEventListener('mousemove', onMove);
    const render = (t: number) => {
      const w = window.innerWidth, h = window.innerHeight;
      if(canvasRef.current && (canvasRef.current.width !== w || canvasRef.current.height !== h)) { 
        canvasRef.current.width = w; 
        canvasRef.current.height = h; 
      }
      gl.viewport(0, 0, w, h);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), t * 0.001);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), w, h);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_mouse'), mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 6); 
      requestAnimationFrame(render);
    };
    const raf = requestAnimationFrame(render); 
    return () => { 
      cancelAnimationFrame(raf); 
      window.removeEventListener('mousemove', onMove); 
    };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
};

