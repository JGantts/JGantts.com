<template>
  <div class="glass-panel">
    <canvas ref="canvas"></canvas>
    <div class="content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, nextTick } from "vue";

// Inject the background reference provided by your Background component
interface BackgroundRef {
  getCanvas: () => HTMLCanvasElement | null;
}
const backgroundRef = inject<Ref<BackgroundRef | null>>("backgroundRef");

onMounted(async () => {
  await nextTick();



  const canvas = backgroundRef.value?.getCanvas();
  if (!canvas) {
    console.error("GlassPanel: canvas ref missing");
    return;
  }
  console.log(canvas)

  const bgCanvas = backgroundRef?.value?.getCanvas();
  if (!bgCanvas) {
    console.warn("GlassPanel: background canvas not ready");
    return;
  }

  // Set canvas size to match container
  const setSize = () => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  };
  setSize();
  window.addEventListener("resize", setSize);

  // Initialize WebGL
  gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    console.error("GlassPanel: WebGL not supported");
    return;
  }

  // Vertex shader
  const vsSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  // Fragment shader: simple lens distortion
  const fsSource = `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform vec2 u_resolution;
    uniform vec2 u_mouse;

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      vec2 center = u_mouse / u_resolution;
      vec2 offset = uv - center;
      float r = length(offset);
      uv += offset * 0.2 * exp(-5.0 * r*r); // lens warp
      gl_FragColor = texture2D(u_texture, uv);
    }
  `;

  const createShader = (type: number, source: string) => {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error(gl!.getShaderInfoLog(shader));
      gl!.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vs = createShader(gl.VERTEX_SHADER, vsSource)!;
  const fs = createShader(gl.FRAGMENT_SHADER, fsSource)!;

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  // Quad covering the canvas
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const uniforms = {
    resolution: gl.getUniformLocation(program, "u_resolution")!,
    mouse: gl.getUniformLocation(program, "u_mouse")!,
    texture: gl.getUniformLocation(program, "u_texture")!,
  };

  // Mouse tracking
  let mouse = [canvas.width / 2, canvas.height / 2];
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse = [e.clientX - rect.left, canvas.height - (e.clientY - rect.top)];
  });

  // Texture setup
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Render loop
  const render = () => {
    const bgCanvasCurrent = backgroundRef?.value?.getCanvas();
    if (!bgCanvasCurrent) return;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      bgCanvasCurrent
    );

    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.mouse, mouse[0], mouse[1]);
    gl.uniform1i(uniforms.texture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  };
  render();
});
</script>

<style scoped>
.glass-panel {
  position: relative;
  display: inline-block;
  border-radius: 1.5rem;
  overflow: hidden;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.glass-panel canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.glass-panel .content {
  position: relative;
  z-index: 1;
  pointer-events: auto;
  color: white;
  padding: 2rem;
}
</style>
