// Outils communs aux scènes 3D : rendu, ombrage en aplats, boucle d'animation économe.
import { Color, ShaderMaterial, Vector3, WebGLRenderer } from 'three';
import { onReducedMotionChange, reducedMotion } from '../motion';

// Couleurs du design system (tokens.css).
export const C = {
  ivoire: '#f7f2eb',
  ivoire2: '#eee6da',
  papier: '#fffcf8',
  trait: '#dcd1c3',
  encre: '#1b1612',
  corail: '#f2482a',
  sapin: '#0f5a53',
  menthe: '#d9eee6',
  sable: '#bfb3a6',
};

// Aplats : trois teintes franches (ombre, base, lumière) choisies selon l'orientation de la face.
// La lumière est fixée par rapport à la caméra : quand l'objet tourne, les bandes glissent sur sa forme.
export const PALETTE: Record<string, [string, string, string]> = {
  corail: ['#b3261e', '#f2482a', '#ff8566'],
  papier: ['#d9cdbf', '#fffcf8', '#ffffff'],
  trait: ['#c2b4a3', '#dcd1c3', '#ece5db'],
  sable: ['#978a7c', '#bfb3a6', '#d8cfc5'],
  sapin: ['#093d38', '#0f5a53', '#2e7c72'],
  menthe: ['#a9d3c3', '#d9eee6', '#f2f9f6'],
  encre: ['#0e0b09', '#2f2823', '#4c433b'],
  socle: ['#ddd2c4', '#f7f2eb', '#fcfaf6'],
  // Vitrine produits : finitions de la lampe (éteinte / allumée), flacon, liquide selon les notes.
  terracotta: ['#8f4127', '#c4603c', '#e48a64'],
  'terracotta-on': ['#d0693f', '#f39466', '#ffd2ab'],
  sauge: ['#56664f', '#83947b', '#aebba5'],
  'sauge-on': ['#93a589', '#c3d1b4', '#eef4e0'],
  ivoire: ['#b9ad9d', '#e6ddcf', '#fbf8f2'],
  'ivoire-on': ['#efe4d2', '#fff4e2', '#ffffff'],
  verre: ['#d8d2c8', '#f4f1ec', '#ffffff'],
  bouchon: ['#1c1714', '#3a312a', '#6b5d50'],
  'liquide-tete': ['#c9a94b', '#efd585', '#fff1c4'],
  'liquide-coeur': ['#cc8a79', '#efb6a4', '#fde3da'],
  'liquide-fond': ['#a5662a', '#d8984c', '#f2c48a'],
};

const vertex = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uDark;
  uniform vec3 uBase;
  uniform vec3 uLight;
  uniform vec3 uDir;
  uniform float uAlpha;
  varying vec3 vNormal;
  void main() {
    float d = dot(normalize(vNormal), uDir);
    vec3 col = d > 0.62 ? uLight : (d > -0.08 ? uBase : uDark);
    gl_FragColor = vec4(col, uAlpha);
    #include <colorspace_fragment>
  }
`;

const LIGHT = new Vector3(-0.45, 0.75, 0.5).normalize();

export type BandMaterial = ShaderMaterial & {
  setTone(name: string, mix?: string, t?: number): void;
  toward(name: string, k: number): boolean;
};

export function bands(name: string, alpha = 1): BandMaterial {
  const [d, b, l] = PALETTE[name];
  const m = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: alpha < 1,
    depthWrite: alpha >= 1,
    uniforms: {
      uDark: { value: new Color(d) },
      uBase: { value: new Color(b) },
      uLight: { value: new Color(l) },
      uDir: { value: LIGHT },
      uAlpha: { value: alpha },
    },
  }) as BandMaterial;
  // Glisse vers une autre teinte (k = part du chemin parcourue à cette image). Renvoie true tant que ça bouge.
  const target = new Color();
  m.toward = (to, k) => {
    let moving = false;
    (['uDark', 'uBase', 'uLight'] as const).forEach((key, i) => {
      const c: Color = m.uniforms[key].value;
      target.set(PALETTE[to][i]);
      if (Math.abs(c.r - target.r) + Math.abs(c.g - target.g) + Math.abs(c.b - target.b) > 0.002) {
        c.lerp(target, k);
        moving = true;
      } else c.copy(target);
    });
    return moving;
  };
  // Passe d'une teinte à l'autre (ex. gris → sapin quand une branche s'allume).
  m.setTone = (from, to = from, t = 0) => {
    const a = PALETTE[from];
    const z = PALETTE[to];
    (['uDark', 'uBase', 'uLight'] as const).forEach((k, i) => m.uniforms[k].value.set(a[i]).lerp(new Color(z[i]), t));
  };
  return m;
}

export interface Stage {
  renderer: WebGLRenderer;
  width: number;
  height: number;
  dispose(): void;
}

interface LoopOptions {
  // Appelée à chaque image ; renvoie false quand la scène est immobile (la boucle s'arrête).
  frame(time: number, dt: number): boolean;
  resize(width: number, height: number): void;
}

// Crée le rendu dans le conteneur et ne fait tourner la boucle que si la scène est visible.
export function createStage(container: HTMLElement, loop: LoopOptions): Stage & { wake(): void } {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  container.appendChild(canvas);

  const stage = { renderer, width: 0, height: 0 } as Stage & { wake(): void };
  let visible = false;
  let raf = 0;
  let last = 0;
  let disposed = false;

  const tick = (now: number) => {
    raf = 0;
    if (disposed) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    const more = loop.frame(now / 1000, dt);
    if (more && visible && !document.hidden && !reducedMotion()) raf = requestAnimationFrame(tick);
    else last = 0;
  };
  stage.wake = () => {
    if (!raf && !disposed) raf = requestAnimationFrame(tick);
  };

  const size = () => {
    const w = Math.max(1, Math.round(container.clientWidth));
    const h = Math.max(1, Math.round(container.clientHeight));
    if (w === stage.width && h === stage.height) return;
    stage.width = w;
    stage.height = h;
    renderer.setSize(w, h, false);
    loop.resize(w, h);
    stage.wake();
  };

  const ro = new ResizeObserver(size);
  ro.observe(container);
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) stage.wake();
  });
  io.observe(container);
  const onVisibility = () => !document.hidden && stage.wake();
  document.addEventListener('visibilitychange', onVisibility);
  onReducedMotionChange(() => stage.wake());
  size();

  stage.dispose = () => {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    renderer.dispose();
    canvas.remove();
  };
  return stage;
}

export const smooth = (x: number) => x * x * (3 - 2 * x);
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

// Rotation à la main : glisser fait tourner l'objet ; sans geste, il tourne doucement tout seul.
export function spinner(canvas: HTMLElement, opts: { auto?: number; tilt?: number } = {}) {
  const state = { yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0, dragging: false, idle: 0 };
  let lastX = 0;
  let lastY = 0;
  canvas.style.touchAction = 'pan-y';
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', (e) => {
    state.dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    state.targetYaw += (e.clientX - lastX) * 0.012;
    state.targetPitch = Math.max(-0.35, Math.min(0.35, state.targetPitch + (e.clientY - lastY) * 0.004 * (opts.tilt ?? 1)));
    lastX = e.clientX;
    lastY = e.clientY;
  });
  const end = () => {
    state.dragging = false;
    state.idle = 0;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  return {
    state,
    step(dt: number, still: boolean) {
      if (!state.dragging && !still) {
        state.idle += dt;
        if (state.idle > 1.2) state.targetYaw += dt * (opts.auto ?? 0.25);
      }
      const k = still ? 1 : Math.min(1, dt * 6 || 1);
      state.yaw += (state.targetYaw - state.yaw) * k;
      state.pitch += (state.targetPitch - state.pitch) * k;
      return Math.abs(state.targetYaw - state.yaw) > 0.0005 || Math.abs(state.targetPitch - state.pitch) > 0.0005;
    },
  };
}
