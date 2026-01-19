<template>
  <div class="glass-panel">
    <canvas ref="canvasRef" class="panel-canvas"></canvas>
    <div class="content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.glass-panel {
  position: relative;
  overflow: hidden;
}

.panel-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.content {
  position: relative;
  z-index: 1;
}
</style>

<script setup lang="ts">
import { ref, inject, onMounted, nextTick, type Ref } from "vue";

interface BackgroundRef {
  getCanvas: () => HTMLCanvasElement | null;
  getDom: () => HTMLElement | null;
}

const backgroundRef = inject<Ref<BackgroundRef | null>>("backgroundRef");

const canvasRef = ref<HTMLCanvasElement | null>(null);
const registerPanel = inject<(panel: any) => void>("registerPanel");

onMounted(() => {
  registerPanel?.(backgroundReady);
});

async function backgroundReady() {
  await nextTick();

  const panelCanvas = canvasRef.value;
  const bgCanvas = backgroundRef?.value?.getCanvas();
  const bgDom = await backgroundRef?.value?.getDom();

  if (!panelCanvas || !bgCanvas || !bgDom) {
    console.error("GlassPanel missing refs");
    return;
  }

  let panelOffset = [0, 0];
  let panelSize = [0, 0];
  const updateOffset = () => {
    const panelRect = panelCanvas.getBoundingClientRect();
    const bgRect = bgDom.getBoundingClientRect();

console.log("Panel Rect:", panelRect);
console.log("BG Rect:", bgRect);

    // CSS offset relative to BG DOM
    const ox = panelRect.left - bgRect.left;
    const oy = panelRect.top  - bgRect.top;

console.log("Offset:", ox, oy);

    panelOffset = [ox, oy];

    panelSize = [panelRect.width, panelRect.height];
  };

  updateOffset();
  window.addEventListener("resize", updateOffset);

  // Set canvas size in device pixels
  const setSize = () => {
    const dpr = window.devicePixelRatio || 1;
    panelCanvas.width  = panelCanvas.clientWidth  * dpr;
    panelCanvas.height = panelCanvas.clientHeight * dpr;
  };
  setSize();
  window.addEventListener("resize", setSize);

  const gl = (panelCanvas.getContext("webgl") || panelCanvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
  if (!gl) {
    console.error("WebGL not supported");
    return;
  }

  // Vertex shader: fullscreen quad
  const vsSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  // Fragment shader: pure copy, vertical flip handled here
const fsSource = `
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_bgSize;
uniform vec2 u_offset;
uniform vec2 u_panelSize;

void main() {
  // Flip Y inside the panel
  vec2 flippedCoord = vec2(gl_FragCoord.x, u_panelSize.y - gl_FragCoord.y);

  // Map to background pixel coordinates with offset
  vec2 bgPixel = flippedCoord + u_offset;

  // Convert to UV for texture sampling
  vec2 uv = vec2(
    bgPixel.x / u_bgSize.x,
    bgPixel.y / u_bgSize.y
  );

  gl_FragColor = texture2D(u_texture, uv);
}
`;


  const createShader = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
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

  // Fullscreen quad
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

  // Uniforms
  const uniforms = {
    bgSize: gl.getUniformLocation(program, "u_bgSize")!,
    texture: gl.getUniformLocation(program, "u_texture")!,
    offset:  gl.getUniformLocation(program, "u_offset")!,
    panelSize: gl.getUniformLocation(program, "u_panelSize")!,
  };

  // Texture setup
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const render = async () => {
    const currentBg = await backgroundRef?.value?.getCanvas();
    if (!currentBg) return;

    gl.viewport(0, 0, panelCanvas.width, panelCanvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, currentBg);

    const dpr = window.devicePixelRatio || 1;
    gl.uniform2f(uniforms.bgSize, currentBg.width, currentBg.height);
    gl.uniform1i(uniforms.texture, 0);
    gl.uniform2f(uniforms.offset, panelOffset[0] * dpr, panelOffset[1] * dpr);
    gl.uniform2f(uniforms.panelSize, panelSize[0] * dpr, panelSize[1] * dpr);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  };

  render();
}
</script>
