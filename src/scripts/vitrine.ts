// Vitrine motion design : un lecteur, des démonstrations codées (GSAP + SVG) et, plus tard, des vidéos.
// Une seule pièce joue à la fois ; lecture quand le lecteur est à moitié visible, pause hors écran,
// images fixes si les animations sont réduites. Les coulisses (calques, images clés) sont lues
// directement dans les chronologies GSAP : elles ne peuvent pas diverger de l'animation.
import { desktopQuery, onReducedMotionChange, reducedMotion } from './motion';

type Gsap = typeof import('gsap').gsap;
type Timeline = ReturnType<Gsap['timeline']>;
type Tween = ReturnType<Gsap['to']>;

const EASE = 'power3.inOut'; // courbe « geste »
const SETTLE = 'power4.out'; // posé, sans rebond
const DRAWN = { strokeDasharray: '1 1', strokeDashoffset: 0 };
const HIDDEN_STROKE = { strokeDasharray: '1 1', strokeDashoffset: 1.05 };

interface Demo {
  loop: boolean;
  still: number; // image fixe montrée quand les animations sont réduites
  build: (t: Timeline, scene: HTMLElement, desktop: boolean) => void;
}

interface Media {
  play(from?: number): void;
  pause(): void;
  seek(time: number): void;
  playing(): boolean;
  ended(): boolean;
  progress(): number;
  time(): number;
  duration(): number;
  destroy(): void;
  tl?: Timeline;
  loop: boolean;
}

interface Row {
  label: string;
  nobox: boolean;
  spans: [number, number][];
  targets: Element[];
  els: Element[]; // éléments du calque hors <defs>, un par format affiché
}

const $ = <T extends Element = SVGGraphicsElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T;
const $$ = <T extends Element = SVGGraphicsElement>(root: ParentNode, sel: string) => Array.from(root.querySelectorAll<T>(sel));
const hold = (t: Timeline, end: number) => t.to({}, { duration: 0.001 }, end - 0.001);

/* ---------------- Pièce 1 · Annonce typographique (16:9 desktop, 1:1 mobile) ---------------- */
function annonce(t: Timeline, scene: HTMLElement, desktop: boolean): void {
  const svg = $(scene, desktop ? '.fr-d' : '.fr-m');
  const W = desktop ? 1600 : 1080;
  const H = desktop ? 900 : 1080;
  const travel = desktop ? 270 : 245;
  const words = $$(svg, '.a-w');
  const disc = $(svg, '.a-disc');
  const ring = $(svg, '.a-ring');
  const ink = $(svg, '.a-ink');
  const logo = $(svg, '.a-logo');
  const origin = disc.getAttribute('data-origin') ?? '0 0';

  // Le trait encre traverse l'image : il s'allonge depuis le bord gauche puis se retire vers la droite.
  const bar = $(svg, '.a-bar');
  t.fromTo(bar, { attr: { x: 0, width: 0 } }, { attr: { width: W }, duration: 0.5, ease: 'power3.in' }, 0);
  t.to(bar, { attr: { x: W, width: 0 }, duration: 0.55, ease: 'power3.out' }, 0.5);
  words.forEach((w, i) => t.fromTo(w, { y: travel }, { y: 0, duration: 0.8 }, [0.6, 1.2, 1.42][i]));
  t.fromTo(disc, { scale: 0, rotation: -160, svgOrigin: origin }, { scale: 1, rotation: 0, duration: 1.0, ease: 'expo.out' }, 2.2);
  t.fromTo(ring, { rotation: 0, svgOrigin: origin }, { rotation: 48, duration: 2.6, ease: 'none' }, 2.2);

  // 4,8 s : les mots sortent par le haut, le fond passe à l'encre, le logo apparaît.
  words.forEach((w, i) => t.to(w, { y: -travel, duration: 0.6 }, 4.8 + i * 0.08));
  t.to(disc, { scale: 0, rotation: 60, duration: 0.5, ease: 'power3.in' }, 4.8);
  t.fromTo(ink, { y: 0 }, { y: -H - 10, duration: 0.7 }, 4.9);
  t.fromTo(logo, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6 }, 5.3);
  // Une seconde de pause sur le logo, puis le fond encre remonte et libère le corail du début.
  t.to(logo, { opacity: 0, y: -60, duration: 0.5 }, 6.4);
  t.to(ink, { y: -2 * H - 20, duration: 0.6 }, 6.4);
  hold(t, 7);
}

/* ---------------- Pièces 2 et 4 · Publicité produit ---------------- */
// Version 9:16 : flacon au centre, étiquettes autour, image de fin empilée.
function adVertical(t: Timeline, svg: Element): void {
  const fl = $(svg, '.b-fl');
  const labels = $$(svg, '.b-lab');
  t.fromTo(fl, { y: -1400, rotation: -5, transformOrigin: '50% 100%' }, { y: 0, rotation: 0, duration: 1.6, ease: SETTLE }, 0);
  labels.forEach((l, i) =>
    t.fromTo(l, { opacity: 0, scale: 0.5, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }, 1.8 + i * 0.22),
  );
  t.fromTo($(svg, '.b-bg'), { x: 0 }, { x: -1090, duration: 0.8 }, 4.5);
  t.to(fl, { rotation: 6, duration: 1.0 }, 4.6);
  labels.forEach((l, i) => t.to(l, { opacity: 0, scale: 0.7, duration: 0.35, ease: 'power3.in' }, 7.0 + i * 0.06));
  t.to(fl, { rotation: 0, scale: 0.5, y: -400, duration: 0.9 }, 7.0);
  endCard(t, svg);
}

// Version 16:9 : flacon à gauche, informations en colonne, logo et bouton côte à côte.
function adHorizontal(t: Timeline, svg: Element): void {
  const fl = $(svg, '.b-fl');
  const labels = $$(svg, '.b-lab');
  t.fromTo(fl, { y: -1000, rotation: -5, transformOrigin: '50% 100%' }, { y: 0, rotation: 0, duration: 1.6, ease: SETTLE }, 0);
  labels.forEach((l, i) =>
    t.fromTo(
      l,
      { opacity: 0, x: -40, scale: 0.9, transformOrigin: '0% 50%' },
      { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: 'power3.out' },
      1.8 + i * 0.22,
    ),
  );
  t.fromTo($(svg, '.b-bg'), { x: 0 }, { x: -1610, duration: 0.8 }, 4.5);
  t.to(fl, { rotation: 6, duration: 1.0 }, 4.6);
  labels.forEach((l, i) => t.to(l, { opacity: 0, scale: 0.7, duration: 0.35, ease: 'power3.in' }, 7.0 + i * 0.06));
  t.to(fl, { rotation: 0, duration: 0.9 }, 7.0);
  endCard(t, svg);
}

function endCard(t: Timeline, svg: Element): void {
  t.fromTo($(svg, '.b-brand'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 7.45);
  t.fromTo($(svg, '.b-title'), { opacity: 1, y: 220 }, { y: 0, duration: 0.8 }, 7.55);
  t.fromTo(
    $(svg, '.b-btn'),
    { opacity: 0, scale: 0.7, transformOrigin: '50% 50%' },
    { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' },
    8.0,
  );
}

function publicite(t: Timeline, scene: HTMLElement): void {
  adVertical(t, $(scene, '.ad-v'));
  hold(t, 10);
}

function formats(t: Timeline, scene: HTMLElement): void {
  adHorizontal(t, $(scene, '.ad-h'));
  adVertical(t, $(scene, '.ad-v'));
  hold(t, 10);
}

/* ---------------- Pièce 3 · Logo et système graphique ---------------- */
function logo(t: Timeline, scene: HTMLElement): void {
  const dot = $(scene, '.c-dot');
  const mono = $(scene, '.c-mono');
  const arcs = $$(scene, '.c-arc');
  const bar = $(scene, '.c-bar');
  const clip = $(scene, '.c-nclip');
  const pattern = $$(scene, '.c-pat path');
  // Délais du motif : il se déploie depuis le centre, puis se replie des bords vers le logo.
  const dist = pattern.map((p) => Math.hypot(Number(p.dataset.x) - 800, (Number(p.dataset.y) - 450) * 1.4));
  const far = Math.max(...dist);

  // Le monogramme démarre au centre de l'image (358 = décalage entre le centre et sa place dans le logo).
  t.fromTo(dot, { y: 83, scale: 0, transformOrigin: '50% 50%' }, { scale: 2.6, duration: 0.5, ease: 'power3.out' }, 0);
  t.to(dot, { y: 0, scale: 1, duration: 0.45 }, 0.8);
  t.fromTo(arcs, HIDDEN_STROKE, { ...DRAWN, duration: 0.7 }, 1.05);
  t.fromTo(bar, { scaleY: 0, transformOrigin: '50% 0%' }, { scaleY: 1, duration: 0.6 }, 1.1);
  t.fromTo(mono, { x: 358 }, { x: 0, duration: 0.8 }, 1.8);
  t.fromTo(clip, { attr: { width: 0 } }, { attr: { width: 715 }, duration: 0.9 }, 1.95);
  t.fromTo(pattern, HIDDEN_STROKE, { ...DRAWN, duration: 0.45, ease: 'power3.out', stagger: (i: number) => (dist[i] / far) * 0.45 }, 3.0);
  t.to(pattern, { strokeDashoffset: 1.05, duration: 0.35, ease: 'power3.in', stagger: (i: number) => (1 - dist[i] / far) * 0.4 }, 4.1);
  // Pause sur le logo, puis il se replie en point pour reprendre la boucle.
  t.to(clip, { attr: { width: 0 }, duration: 0.45 }, 5.6);
  t.to(mono, { x: 358, duration: 0.6 }, 5.7);
  t.to(arcs, { strokeDashoffset: 1.05, duration: 0.45 }, 5.8);
  t.to(bar, { scaleY: 0, duration: 0.4 }, 5.8);
  t.to(dot, { y: 83, scale: 2.6, duration: 0.4 }, 6.0);
  t.to(dot, { scale: 0, duration: 0.25, ease: 'power3.in' }, 6.35);
  hold(t, 6.8);
}

const DEMOS: Record<string, Demo> = {
  annonce: { loop: true, still: 3.6, build: annonce },
  publicite: { loop: false, still: 9.99, build: publicite },
  logo: { loop: true, still: 3.98, build: logo },
  formats: { loop: false, still: 9.99, build: formats },
};

/* ---------------- Lecteur ---------------- */
export function initVitrine(section: HTMLElement): void {
  const pbox = $<HTMLElement>(section, '[data-pbox]');
  const player = $<HTMLElement>(section, '[data-player]');
  const scenes = $$<HTMLElement>(section, '[data-scene]').sort((a, b) => Number(a.dataset.scene) - Number(b.dataset.scene));
  const buttons = $$<HTMLButtonElement>(section, '[data-piece]');
  const infos = $$<HTMLElement>(section, '[data-info]');
  const descs = $$<HTMLElement>(section, '[data-desc]');
  const playBtn = $<HTMLButtonElement>(section, '[data-play]');
  const playText = $<HTMLElement>(section, '[data-play-text]');
  const coulBtn = $<HTMLButtonElement>(section, '[data-coul]');
  const panel = $<HTMLElement>(section, '[data-coulp]');
  const panelBody = $<HTMLElement>(section, '[data-cp-body]');
  const panelRows = $<HTMLElement>(section, '[data-cp-rows]');
  const ruler = $<HTMLElement>(section, '[data-cp-ruler]');
  const durText = $<HTMLElement>(section, '[data-cp-dur]');
  const nowText = $<HTMLElement>(section, '[data-now]');
  const live = $<HTMLElement>(section, '[data-live]');
  const fmtGroup = $<HTMLElement>(section, '[data-fmt]');
  const fmtButtons = $$<HTMLButtonElement>(section, '[data-fmt-b]');
  const ov = $<HTMLElement>(section, '[data-ov]');
  const ants = $<SVGSVGElement>(section, '[data-ov-ants]');
  if (!pbox || !player || !playBtn || !coulBtn || scenes.length !== buttons.length) return;

  const label = { play: playBtn.dataset.lPlay ?? '', pause: playBtn.dataset.lPause ?? '', loop: panel.dataset.lLoop ?? '', s: panel.dataset.lS ?? 's' };
  const media: (Media | null)[] = scenes.map(() => null);
  let gsap: Gsap | null = null;
  let cur = Math.max(0, buttons.findIndex((b) => b.getAttribute('aria-pressed') === 'true'));
  let visible = false; // au moins la moitié du lecteur est à l'écran
  let pending = true; // la pièce attend d'être visible pour démarrer
  let userPaused = false;
  let autoPaused = false;
  let atStill = false;
  let coul = false;
  let fmt: 'h' | 'v' = 'h';
  let rows: Row[] = [];
  let frame = 0;

  const kind = (i: number) => scenes[i].dataset.kind;
  const demoOf = (i: number) => DEMOS[scenes[i].dataset.demo ?? ''];

  /* ---- Médias : chronologie GSAP ou vidéo, mêmes commandes ---- */
  const demoMedia = (g: Gsap, def: Demo, scene: HTMLElement): Media => {
    const tl = g.timeline({ paused: true, repeat: def.loop ? -1 : 0, defaults: { ease: EASE }, onUpdate: render, onComplete: render });
    def.build(tl, scene, desktopQuery.matches);
    return {
      tl,
      loop: def.loop,
      play: (from) => (from === undefined ? tl.play() : tl.play(from)),
      pause: () => tl.pause(),
      seek: (time) => {
        tl.pause();
        tl.totalTime(Math.min(time, tl.duration()));
      },
      playing: () => tl.isActive(),
      ended: () => !def.loop && tl.progress() >= 1,
      progress: () => tl.progress(),
      time: () => tl.time(),
      duration: () => tl.duration(),
      destroy: () => tl.revert(),
    };
  };

  const videoMedia = (video: HTMLVideoElement): Media => {
    const tick = () => {
      render();
      if (!video.paused) requestAnimationFrame(tick);
    };
    ['play', 'pause', 'ended', 'loadedmetadata', 'seeked'].forEach((e) => video.addEventListener(e, () => (e === 'play' ? tick() : render())));
    return {
      loop: video.loop,
      play: (from) => {
        if (from !== undefined) video.currentTime = from;
        video.play().catch(() => render());
      },
      pause: () => video.pause(),
      seek: (time) => {
        video.pause();
        if (video.readyState > 0) video.currentTime = time;
      },
      playing: () => !video.paused && !video.ended,
      ended: () => video.ended,
      progress: () => (video.duration ? video.currentTime / video.duration : 0),
      time: () => video.currentTime,
      duration: () => video.duration || 0,
      destroy: () => video.pause(),
    };
  };

  const ensure = (i: number): Media | null => {
    if (media[i]) return media[i];
    if (kind(i) === 'video') {
      const video = scenes[i].querySelector('video');
      if (video) media[i] = videoMedia(video);
    } else if (gsap && demoOf(i)) {
      media[i] = demoMedia(gsap, demoOf(i), scenes[i]);
    }
    return media[i];
  };

  /* ---- Coulisses : rangs lus dans la chronologie ---- */
  // Un rang par calque (attribut data-layer), dans l'ordre de la scène ; les intervalles viennent des tweens.
  const readRows = (m: Media | null, scene: HTMLElement): Row[] => {
    if (!m?.tl) return [];
    const map = new Map<string, Row>();
    for (const el of $$(scene, '[data-layer]').filter((e) => !e.closest('defs'))) {
      const name = el.getAttribute('data-layer') ?? '';
      if (!map.has(name)) map.set(name, { label: name, nobox: el.hasAttribute('data-nobox'), spans: [], targets: [], els: [] });
      map.get(name)?.els.push(el);
    }
    for (const tw of m.tl.getChildren(false, true, false) as Tween[]) {
      const start = tw.startTime();
      const end = start + tw.duration();
      for (const target of tw.targets()) {
        const row = target instanceof Element ? map.get(target.closest('[data-layer]')?.getAttribute('data-layer') ?? '') : undefined;
        if (!row) continue;
        row.spans.push([start, end]);
        if (!row.targets.includes(target as Element)) row.targets.push(target as Element);
      }
    }
    // Les intervalles qui se chevauchent forment un seul passage : une image clé au début, une à la fin.
    return [...map.values()]
      .filter((r) => r.spans.length)
      .map((r) => {
        const sorted = r.spans.sort((a, b) => a[0] - b[0]);
        const merged: [number, number][] = [];
        for (const [a, b] of sorted) {
          const last = merged[merged.length - 1];
          if (last && a <= last[1] + 0.02) last[1] = Math.max(last[1], b);
          else merged.push([a, b]);
        }
        return { ...r, spans: merged };
      });
  };

  const seconds = (n: number) => `${n.toFixed(n % 1 ? 1 : 0).replace('.', ',')} ${label.s}`;

  const buildPanel = () => {
    const m = media[cur];
    rows = coul ? readRows(m, scenes[cur]) : [];
    if (!coul) return;
    const dur = m?.duration() ?? 0;
    durText.textContent = dur ? `${seconds(Math.round(dur * 10) / 10)}${m?.loop ? ` · ${label.loop}` : ''}` : '';
    const pct = (s: number) => `${((s / (dur || 1)) * 100).toFixed(3)}%`;
    ruler.innerHTML = Array.from(
      { length: Math.floor(dur + 0.001) + 1 },
      (_, s) => `<span${s % 2 && dur > 6 ? ' class="odd"' : ''} style="left:${pct(s)}">${s}</span>`,
    ).join('');
    panelRows.innerHTML = rows
      .map((r) => {
        const [name, props] = r.label.split(' · ');
        const keys = r.spans.flatMap(([a, b]) => (b - a < 0.05 ? [a] : [a, b]));
        const spoken = keys.map((k) => seconds(Math.round(k * 100) / 100)).join(', ');
        return (
          `<li><span class="cp-n">${name}${props ? `<span class="cp-p"> · ${props}</span>` : ''}</span>` +
          `<span class="sr-only">${spoken}</span>` +
          `<span class="cp-tr" aria-hidden="true">` +
          r.spans.map(([a, b]) => `<i class="cp-sp" style="left:${pct(a)};width:${pct(b - a)}"></i>`).join('') +
          keys.map((k) => `<i class="cp-k" style="left:${pct(k)}"></i>`).join('') +
          `</span></li>`
        );
      })
      .join('');
  };

  // Contours en pointillés et noms des calques, à la position réelle des éléments visibles.
  const area = (a: DOMRect, b: { left: number; top: number; right: number; bottom: number }) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

  const shows = (row: Row, el: Element, svg: SVGSVGElement): boolean => {
    // Calque masqué : visible quand son contenu passe dans le masque.
    const clipped = el.querySelector('[clip-path]');
    if (clipped) {
      const id = clipped.getAttribute('clip-path')?.match(/#([^)]+)/)?.[1];
      const shape = id ? document.getElementById(id)?.firstElementChild : null;
      const content = clipped.firstElementChild;
      const ctm = svg.getScreenCTM();
      if (!shape || !content || !ctm || Number(getComputedStyle(content).opacity) < 0.02) return false;
      const n = (k: string) => Number(shape.getAttribute(k) ?? 0);
      const a = new DOMPoint(n('x'), n('y')).matrixTransform(ctm);
      const b = new DOMPoint(n('x') + n('width'), n('y') + n('height')).matrixTransform(ctm);
      return area(content.getBoundingClientRect(), { left: a.x, top: a.y, right: b.x, bottom: b.y }) > 4;
    }
    const own = row.targets.filter((t) => t === el || el.contains(t));
    if (!own.length) return true;
    return own.some((t) => {
      const cs = getComputedStyle(t);
      const undrawn = cs.strokeDasharray !== 'none' && parseFloat(cs.strokeDashoffset) >= 0.999;
      return Number(cs.opacity) > 0.02 && !undrawn;
    });
  };

  const drawOverlay = () => {
    const pr = player.getBoundingClientRect();
    const boxes: { x: number; y: number; w: number; h: number; label: string }[] = [];
    for (const row of rows) {
      if (row.nobox) continue;
      for (const el of row.els) {
        const svg = el.closest('svg');
        const fr = svg?.getBoundingClientRect();
        if (!svg || !fr || !fr.width || getComputedStyle(svg).visibility === 'hidden') continue;
        // Petit format : seulement les calques de premier niveau.
        if (fr.width < 420 && el.parentElement?.closest('[data-layer]')) continue;
        if (!shows(row, el, svg)) continue;
        const r = (el.querySelector(':scope > [data-box]') ?? el).getBoundingClientRect();
        const x1 = Math.max(r.left, fr.left);
        const y1 = Math.max(r.top, fr.top);
        const x2 = Math.min(r.right, fr.right);
        const y2 = Math.min(r.bottom, fr.bottom);
        if (x2 - x1 < 3 || y2 - y1 < 3) continue;
        // Très petit format : le nom court du calque.
        const text = fr.width < 300 ? row.label.split(' · ')[0] : row.label;
        boxes.push({ x: x1 - pr.left, y: y1 - pr.top, w: x2 - x1, h: y2 - y1, label: text });
      }
    }
    ants.innerHTML = boxes
      .map((b) => {
        const a = `x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="${b.w.toFixed(1)}" height="${b.h.toFixed(1)}"`;
        return `<rect class="ant-a" ${a}></rect><rect class="ant-b" ${a}></rect>`;
      })
      .join('');
    let tags = ov.querySelectorAll<HTMLElement>('.ov-tag');
    for (let i = tags.length; i < boxes.length; i++) ov.insertAdjacentHTML('beforeend', '<span class="ov-tag"></span>');
    tags = ov.querySelectorAll<HTMLElement>('.ov-tag');
    // Étiquettes : au-dessus du contour, sinon dedans, sinon dessous, sans se chevaucher.
    const placed: { x: number; y: number; w: number }[] = [];
    const TH = 18;
    tags.forEach((tag, i) => {
      const b = boxes[i];
      tag.hidden = !b;
      if (!b) return;
      if (tag.textContent !== b.label) tag.textContent = b.label;
      const w = Math.min(pr.width - 8, b.label.length * 6.1 + 14);
      const right = b.x + b.w / 2 > pr.width / 2;
      const x = Math.min(Math.max(4, right ? b.x + b.w - w : b.x), pr.width - w - 4);
      const spots = [b.y - TH - 2, b.y + 3, b.y + b.h + 3, b.y + b.h - TH - 3].filter((y) => y >= 2 && y <= pr.height - TH - 2);
      const free = (y: number) => !placed.some((o) => Math.abs(o.y - y) < TH + 1 && x < o.x + o.w + 2 && o.x < x + w + 2);
      const y = spots.find(free) ?? spots[0] ?? b.y + 3;
      placed.push({ x, y, w });
      tag.style.left = `${x.toFixed(1)}px`;
      tag.style.top = `${y.toFixed(1)}px`;
    });
  };

  /* ---- Rendu de l'état : piste, bouton, coulisses ---- */
  function render(): void {
    const m = media[cur];
    const p = m ? Math.min(1, Math.max(0, m.progress())) : 0;
    pbox.style.setProperty('--p', p.toFixed(4));
    const on = !!m && m.playing();
    playBtn.classList.toggle('is-playing', on);
    const text = on ? label.pause : label.play;
    if (playText.textContent !== text) playText.textContent = text;
    if (coul) {
      panelBody.style.setProperty('--p', p.toFixed(4));
      if (!frame) frame = requestAnimationFrame(() => ((frame = 0), drawOverlay()));
    }
  }

  const setRatio = () => {
    const scene = scenes[cur];
    const formatsPiece = scene.dataset.demo === 'formats';
    const ratio = formatsPiece ? (fmt === 'v' ? '9/16' : '16/9') : (scene.dataset.ar ?? '16/9');
    const [w, h] = ratio.split('/');
    pbox.style.setProperty('--arw', w);
    pbox.style.setProperty('--arh', h);
    if (formatsPiece) scene.dataset.show = fmt;
  };

  // Prépare la pièce courante : image fixe, lecture depuis le début, ou attente d'être visible.
  const prepare = () => {
    const m = ensure(cur);
    if (m) {
      if (reducedMotion()) {
        m.seek(kind(cur) === 'video' ? 0 : demoOf(cur).still);
        pending = false;
        atStill = true;
      } else if (visible) {
        m.play(0);
        pending = false;
      } else {
        m.seek(0);
      }
    }
    buildPanel();
    render();
  };

  const select = (i: number, fromUser: boolean) => {
    if (i !== cur) {
      media[cur]?.pause();
      scenes[cur].hidden = true;
      infos[cur].hidden = true;
      descs[cur].hidden = true;
      buttons[cur].setAttribute('aria-pressed', 'false');
      cur = i;
      scenes[cur].hidden = false;
      infos[cur].hidden = false;
      descs[cur].hidden = false;
      buttons[cur].setAttribute('aria-pressed', 'true');
      const text = buttons[cur].dataset.now ?? '';
      nowText.textContent = text;
      live.textContent = text;
      fmtGroup.hidden = scenes[cur].dataset.demo !== 'formats';
      coulBtn.hidden = kind(cur) === 'video';
      setRatio();
    }
    userPaused = false;
    autoPaused = false;
    pending = true;
    atStill = false;
    prepare();
    // Sur mobile, ramène le lecteur à l'écran s'il en est sorti.
    if (fromUser && !desktopQuery.matches) {
      requestAnimationFrame(() => {
        const r = player.getBoundingClientRect();
        const seen = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
        if (seen < r.height * 0.6) $(section, '[data-vtop]').scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
      });
    }
  };

  buttons.forEach((b, i) => b.addEventListener('click', () => select(i, true)));

  playBtn.addEventListener('click', () => {
    const m = ensure(cur);
    if (!m) {
      load();
      return;
    }
    if (m.playing()) {
      m.pause();
      userPaused = true;
      autoPaused = false;
    } else {
      userPaused = false;
      autoPaused = false;
      pending = false;
      if (m.ended() || atStill) m.play(0);
      else m.play();
      atStill = false;
    }
    render();
  });

  coulBtn.addEventListener('click', () => {
    coul = coulBtn.getAttribute('aria-pressed') !== 'true';
    coulBtn.setAttribute('aria-pressed', String(coul));
    player.classList.toggle('is-coul', coul);
    panel.hidden = !coul;
    buildPanel();
    render();
  });

  fmtButtons.forEach((b) =>
    b.addEventListener('click', () => {
      fmt = b.dataset.fmtB === 'v' ? 'v' : 'h';
      fmtButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      setRatio();
      render();
    }),
  );

  // Lecture quand la moitié du lecteur est visible ; pause quand il quitte l'écran.
  new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const m = media[cur];
        if (entry.intersectionRatio >= 0.5) {
          visible = true;
          if (!m || reducedMotion() || userPaused) continue;
          if (pending) {
            pending = false;
            m.play(0);
          } else if (autoPaused) {
            autoPaused = false;
            m.play();
          }
        } else if (!entry.isIntersecting) {
          visible = false;
          if (m?.playing()) {
            m.pause();
            autoPaused = true;
          }
        }
      }
      render();
    },
    { threshold: [0, 0.5] },
  ).observe(player);

  // GSAP n'est chargé qu'à l'approche de la section.
  let loading: Promise<void> | null = null;
  const load = () =>
    (loading ??= import('gsap')
      .then((mod) => {
        gsap = mod.gsap;
        prepare();
      })
      .catch(() => {
        loading = null; // nouvel essai au prochain clic sur « Lecture »
      }));
  const loader = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      loader.disconnect();
      load();
    },
    { rootMargin: '600px 0px' },
  );
  loader.observe(section);

  // Les compositions mobile et desktop diffèrent : on reconstruit en gardant le temps et l'état.
  desktopQuery.addEventListener('change', () => {
    const m = media[cur];
    const time = m?.time() ?? 0;
    const wasPlaying = m?.playing() ?? false;
    media.forEach((x, i) => {
      if (x && kind(i) !== 'video') {
        x.destroy();
        media[i] = null;
      }
    });
    setRatio();
    const n = ensure(cur);
    if (n && kind(cur) !== 'video') {
      n.seek(time);
      if (wasPlaying) n.play();
    }
    buildPanel();
    render();
  });

  onReducedMotionChange((reduced) => {
    const m = media[cur];
    if (!m) return;
    if (reduced) {
      m.seek(kind(cur) === 'video' ? 0 : demoOf(cur).still);
      atStill = true;
      pending = false;
    } else if (visible) {
      m.play(0);
      atStill = false;
    } else pending = true;
    render();
  });

  if ('ResizeObserver' in window) new ResizeObserver(() => render()).observe(player);
  setRatio();
  render();
}
