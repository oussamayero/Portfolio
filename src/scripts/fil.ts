// Le fil : un seul tracé SVG calculé à partir des repères `.wp` / `[data-i]` posés dans la page,
// puis dessiné au rythme du défilement (il avance et recule avec la lecture).
import { desktopQuery, onReducedMotionChange, reducedMotion } from './motion';

interface NodeMark {
  el: SVGCircleElement;
  ring: SVGCircleElement;
  len: number;
  on: boolean;
}

const LOOP_WIDTH = 150;
const TIP_POSITION = 0.62; // pointe du fil : 62 % de la hauteur d'écran
const SMOOTHING = 0.12;
const SAMPLE_STEP = 6;
const START_DELAY = 380; // le fil attend la fin de l'entrée du titre

const esc = (v: string) => v.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`);

const fmt = (n: number) => n.toFixed(1);

function segment(x0: number, y0: number, x1: number, y1: number, route: string, radius: number): string {
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5) return ` L${fmt(x1)} ${fmt(y1)}`;
  const r = Math.min(radius, Math.abs(dx) / 2, Math.abs(dy) / 2);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  if (route === 'vh') {
    return ` L${fmt(x0)} ${fmt(y1 - sy * r)} Q${fmt(x0)} ${fmt(y1)} ${fmt(x0 + sx * r)} ${fmt(y1)} L${fmt(x1)} ${fmt(y1)}`;
  }
  return ` L${fmt(x1 - sx * r)} ${fmt(y0)} Q${fmt(x1)} ${fmt(y0)} ${fmt(x1)} ${fmt(y0 + sy * r)} L${fmt(x1)} ${fmt(y1)}`;
}

export function initFil(page: HTMLElement): void {
  const svg = page.querySelector<SVGSVGElement>('.fil-layer');
  const path = svg?.querySelector<SVGPathElement>('.fil');
  const nodesGroup = svg?.querySelector<SVGGElement>('.nodes');
  if (!svg || !path || !nodesGroup) return;

  let total = 0;
  let lengths: number[] = [];
  let maxY: number[] = [];
  let xs: number[] = [];
  let ys: number[] = [];
  let nodes: NodeMark[] = [];
  let current = 0;
  let target = 0;
  let frame = 0;
  let built = false;
  let pulses = false;
  let waiting = 0;
  const startAt = performance.now() + START_DELAY;

  const nearestLength = (x: number, y: number) => {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < lengths.length; i++) {
      const d = (xs[i] - x) ** 2 + (ys[i] - y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = lengths[i];
      }
    }
    return best;
  };

  const targetLength = () => {
    if (!lengths.length) return 0;
    const doc = document.documentElement;
    if (window.scrollY + window.innerHeight >= doc.scrollHeight - 4) return total;
    const y = window.innerHeight * TIP_POSITION - page.getBoundingClientRect().top;
    if (y < maxY[0]) return 0;
    let lo = 0;
    let hi = maxY.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (maxY[mid] <= y) lo = mid;
      else hi = mid - 1;
    }
    return lengths[lo];
  };

  const apply = () => {
    path.style.strokeDashoffset = String(total - current);
    for (const n of nodes) {
      const on = current >= n.len - 2;
      if (on === n.on) continue;
      n.on = on;
      n.el.classList.toggle('on', on);
      // Une impulsion quand le fil atteint le nœud.
      if (on && pulses && !reducedMotion()) {
        n.ring.classList.remove('pulse');
        void n.ring.getBoundingClientRect();
        n.ring.classList.add('pulse');
      }
    }
  };

  const tick = () => {
    current += (target - current) * SMOOTHING;
    if (Math.abs(target - current) < 0.5) current = target;
    apply();
    frame = current !== target ? requestAnimationFrame(tick) : 0;
  };

  const update = () => {
    if (!built) return;
    if (reducedMotion()) {
      current = target = total;
      apply();
      return;
    }
    const wait = startAt - performance.now();
    if (wait > 0) {
      if (!waiting) waiting = window.setTimeout(() => ((waiting = 0), update()), wait);
      return;
    }
    target = targetLength();
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const build = () => {
    const desktop = desktopQuery.matches;
    const width = page.clientWidth;
    const height = page.scrollHeight;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.height = `${height}px`;
    const origin = page.getBoundingClientRect();

    const marks = Array.from(page.querySelectorAll<HTMLElement>('[data-i]'))
      .filter((el) => (el.classList.contains('d') ? desktop : el.classList.contains('m') ? !desktop : true))
      .sort((a, b) => Number(a.dataset.i) - Number(b.dataset.i));

    const scale = desktop ? Math.max(0.62, Math.min(1, width / 1280)) : 1;
    const radius = desktop ? 22 : 0;
    let d = '';
    let cx = 0;
    let cy = 0;
    const found: { x: number; y: number; type: string; href?: string }[] = [];

    marks.forEach((el, k) => {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2 - origin.left;
      const y = r.top + r.height / 2 - origin.top;
      d += k === 0 ? `M${fmt(x)} ${fmt(y)}` : segment(cx, cy, x, y, el.dataset.route ?? 'hv', radius);
      cx = x;
      cy = y;
      if (el.hasAttribute('data-loop')) {
        const p = (a: number, b: number) => `${fmt(cx + a * scale)} ${fmt(cy + b * scale)}`;
        d += ` C${p(80, 0)} ${p(104, 54)} ${p(72, 74)} C${p(42, 93)} ${p(6, 66)} ${p(24, 34)} C${p(40, 6)} ${p(90, 0)} ${p(LOOP_WIDTH, 0)}`;
        cx += LOOP_WIDTH * scale;
      }
      if (el.dataset.node) found.push({ x, y, type: el.dataset.node, href: el.dataset.href });
    });

    path.setAttribute('d', d);
    total = d ? path.getTotalLength() : 0;
    lengths = [];
    maxY = [];
    xs = [];
    ys = [];
    let highest = -Infinity;
    for (let l = 0; l <= total + SAMPLE_STEP; l += SAMPLE_STEP) {
      const len = Math.min(l, total);
      const pt = path.getPointAtLength(len);
      highest = Math.max(highest, pt.y);
      lengths.push(len);
      maxY.push(highest);
      xs.push(pt.x);
      ys.push(pt.y);
    }

    const radiusNode = desktop ? 9 : 8;
    const stroke = desktop ? 4 : 3;
    nodesGroup.innerHTML = found
      .map((n) => {
        const at = `cx="${fmt(n.x)}" cy="${fmt(n.y)}"`;
        const inner =
          `<circle class="nd-ring" ${at} r="${radiusNode}" stroke-width="${stroke - 1}"></circle>` +
          `<circle class="nd ${n.type}" ${at} r="${radiusNode}" stroke-width="${stroke}"></circle>`;
        return n.href
          ? `<a class="nd-g nd-link" href="${esc(n.href)}" tabindex="-1"><circle class="nd-hit" ${at} r="18"></circle>${inner}</a>`
          : `<g class="nd-g">${inner}</g>`;
      })
      .join('');
    nodes = Array.from(nodesGroup.children).map((g, i) => ({
      el: g.querySelector<SVGCircleElement>('.nd')!,
      ring: g.querySelector<SVGCircleElement>('.nd-ring')!,
      len: nearestLength(found[i].x, found[i].y),
      on: false,
    }));
    path.style.strokeWidth = `${stroke}px`;
    path.style.strokeDasharray = `${total} ${total + 20}`;
    if (reducedMotion()) current = total;
    else if (current > total) current = total;
    built = true;
    pulses = false;
    apply();
    pulses = true;
    update();
  };

  let queued = 0;
  const queueBuild = () => {
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      build();
    });
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  desktopQuery.addEventListener('change', queueBuild);
  onReducedMotionChange(update);
  if ('ResizeObserver' in window) new ResizeObserver(queueBuild).observe(page);
  document.fonts?.ready.then(queueBuild);
  build();
}
