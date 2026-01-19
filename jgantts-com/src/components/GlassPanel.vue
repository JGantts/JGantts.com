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
  overflow: hidden; /* so canvas never peeks out */
}

/* canvas sits behind */
.panel-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* so it won't eat mouse events */
  z-index: 0;
}

/* content goes above */
.content {
  position: relative;
  z-index: 1;
}
</style>

<script setup lang="ts">
import { ref, inject, onMounted, nextTick, type Ref } from "vue";

// Interface for the background component
interface BackgroundRef {
  getCanvas: () => HTMLCanvasElement | null;
  getDom: () => HTMLElement | null;
}

// Inject the live background ref
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
  console.log("GlassPanel: backgroundReady called");
  console.log("panelCanvas:", backgroundRef);
  const bgDom = await backgroundRef?.value?.getDom();
  console.log("bgDOM:", bgDom);

let panelOffset = [0, 0];

const updateOffset = () => {
  if (!panelCanvas || !bgDom) return;
  const rect = panelCanvas.getBoundingClientRect();
  const bgRect = bgDom.getBoundingClientRect();
  panelOffset = [
    rect.left - bgRect.left,
    bgRect.height - (rect.top - bgRect.top) - panelCanvas.height
  ];
};

updateOffset();
window.addEventListener("resize", updateOffset);

  if (!panelCanvas || !bgCanvas) {
    console.error("GlassPanel: Missing canvas refs");
    console.log("panelCanvas:", panelCanvas);
    console.log("bgCanvas:", bgCanvas);
    return;
  }

  // Set panel canvas size to match container
  const setSize = () => {
    panelCanvas.width = panelCanvas.clientWidth;
    panelCanvas.height = panelCanvas.clientHeight;
  };
  setSize();
  window.addEventListener("resize", setSize);

  const gl = (panelCanvas.getContext("webgl") || panelCanvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
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
    uniform vec2 u_panelSize;
    uniform vec2 u_bgSize;

    void main() {
      // Map fragment coord to background UV
      vec2 uv = gl_FragCoord.xy / u_panelSize;
      uv *= u_panelSize / u_bgSize;

      vec2 center = vec2(0.5, 0.5);
      vec2 offset = uv - center;
      float r = length(offset);

      // Lens distortion
      uv += offset * 0.2 * exp(-5.0 * r*r);

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
    panelSize: gl.getUniformLocation(program, "u_panelSize")!,
    bgSize: gl.getUniformLocation(program, "u_bgSize")!,
    texture: gl.getUniformLocation(program, "u_texture")!,
    offset:  gl.getUniformLocation(program, "u_offset")!,
  };

  // Texture
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const render = async () => {
    const currentBg = await backgroundRef?.value?.getCanvas();
    console.log("hfiudshfiuhfiu")
    if (!currentBg) return;

    gl.viewport(0, 0, panelCanvas.width, panelCanvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, currentBg);

    gl.uniform2f(uniforms.panelSize, panelCanvas.width, panelCanvas.height);
    gl.uniform2f(uniforms.bgSize, currentBg.width, currentBg.height);
    gl.uniform1i(uniforms.texture, 0);
    gl.uniform2f(uniforms.offset, panelOffset[0], panelOffset[1]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  };

  render();
}
</script>

