// Séquence signature : chronologie GSAP en trois chapitres, jouée une fois quand la scène
// est à moitié visible, mise en pause hors écran, en images fixes si les animations sont réduites.
import { desktopQuery, onReducedMotionChange, reducedMotion } from './motion';

type Gsap = typeof import('gsap').gsap;
type Timeline = ReturnType<Gsap['timeline']>;

interface Layout {
  ad: { x: number; y: number; scale: number; svgOrigin: string };
  lift: { x: number; y: number; width: number; height: number };
  orderFrom: { x: number; y: number };
  orderMid: { x: number; y: number };
  adFades: boolean;
  tap: [number, number];
}

const CHAPTERS: [number, number][] = [
  [0, 4.4],
  [4.4, 8.2],
  [8.2, 14],
];

const DESKTOP: Layout = {
  ad: { x: -536, y: 48, scale: 0.744, svgOrigin: '680 56' },
  lift: { x: 680, y: 56, width: 344, height: 608 },
  orderFrom: { x: 428, y: -32 },
  orderMid: { x: 368, y: -32 },
  adFades: true,
  tap: [8, 60],
};

const MOBILE: Layout = {
  ad: { x: -64, y: -24, scale: 0.4, svgOrigin: '88 48' },
  lift: { x: 88, y: 48, width: 224, height: 398 },
  orderFrom: { x: 40, y: 0 },
  orderMid: { x: 0, y: 0 },
  adFades: false,
  tap: [6, 30],
};

const EASE = 'power3.inOut'; // équivalent GSAP de la courbe « geste »
const INK = '#1b1612';

export function initSequence(section: HTMLElement): void {
  const stage = section.querySelector<HTMLElement>('[data-stage]');
  const playBtn = section.querySelector<HTMLButtonElement>('[data-seq-play]');
  const replayBtn = section.querySelector<HTMLButtonElement>('[data-seq-replay]');
  const chapters = Array.from(section.querySelectorAll<HTMLLIElement>('[data-chapter]'));
  if (!stage || !playBtn || !replayBtn) return;

  // Valeurs d'origine des attributs animés, pour reconstruire proprement la chronologie.
  const lifts = Array.from(stage.querySelectorAll<SVGRectElement>('.s-lift')).map((el) => ({
    el,
    attrs: ['x', 'y', 'width', 'height'].map((k) => [k, el.getAttribute(k) ?? '0'] as const),
  }));
  const taps = Array.from(stage.querySelectorAll<SVGCircleElement>('.s-tap')).map((el) => ({ el, r: el.getAttribute('r') ?? '8' }));

  let gsap: Gsap | null = null;
  let tl: Timeline | null = null;
  let started = false;
  let visible = false;
  let autoPaused = false;

  const label = (key: 'play' | 'pause' | 'reduced') => playBtn.dataset[key] ?? '';

  const update = () => {
    if (!tl) return;
    const t = tl.time();
    const active = tl.isActive();
    chapters.forEach((li, i) => {
      const [a, b] = CHAPTERS[i];
      const current = t >= a && (t < b || i === CHAPTERS.length - 1);
      li.classList.toggle('is-done', t > a + 0.001 || (i === 0 && (started || reducedMotion())));
      li.classList.toggle('is-current', current);
      const button = li.querySelector('button');
      if (current) button?.setAttribute('aria-current', 'step');
      else button?.removeAttribute('aria-current');
      li.style.setProperty('--progress', String(Math.min(1, Math.max(0, (t - a) / (b - a)))));
    });
    playBtn.textContent = active ? label('pause') : reducedMotion() ? label('reduced') : label('play');
  };

  const still = (i: number) => {
    if (!tl) return;
    tl.pause();
    tl.seek(CHAPTERS[i][1] - 0.001, false);
    update();
  };

  const build = () => {
    if (!gsap) return;
    const g = gsap;
    const previous = tl ? tl.time() : 0;
    const wasActive = tl ? tl.isActive() : false;
    tl?.kill();
    g.set(stage.querySelectorAll('.sv *'), { clearProps: 'all' });
    lifts.forEach(({ el, attrs }) => attrs.forEach(([k, v]) => el.setAttribute(k, v)));
    taps.forEach(({ el, r }) => el.setAttribute('r', r));

    const desktop = desktopQuery.matches;
    const svg = stage.querySelector(desktop ? '.sv-d' : '.sv-m');
    if (!svg) return;
    const L = desktop ? DESKTOP : MOBILE;
    const q = (selector: string) => svg.querySelectorAll(selector);
    const t = g.timeline({ paused: true, defaults: { ease: EASE }, onUpdate: update, onComplete: update });
    const draw = (selector: string, duration: number, at: number) =>
      t.fromTo(q(selector), { strokeDasharray: '1 1', strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration }, at);

    // 1 · La boutique
    draw('.s-filin', 1.2, 0);
    draw('.s-cardline', 1.6, 1.0);
    draw('.s-imgline', 0.9, 1.6);
    draw('.s-tline', 0.8, 2.0);
    t.fromTo(q('.s-card'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 3.0);
    t.fromTo(q('.s-head'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 3.0);
    t.to(q('.s-cardline'), { opacity: 0, duration: 0.6 }, 3.1);
    t.fromTo(q('.s-img'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 3.1);
    t.to(q('.s-imgline'), { opacity: 0, duration: 0.4 }, 3.3);
    t.to(q('.s-tline'), { opacity: 0, duration: 0.3 }, 3.3);
    t.fromTo(q('.s-jar'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, 3.25);
    t.fromTo(q('.s-info > *'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08 }, 3.3);
    t.fromTo(q('.s-thumbs'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 3.6);

    // 2 · Le produit s'anime
    t.to(q('.s-page'), { opacity: 0.28, duration: 1.2 }, 4.4);
    t.fromTo(q('.s-lift'), { opacity: 0 }, { opacity: 1, duration: 0.05 }, 4.4);
    t.to(q('.s-lift'), { attr: L.lift, fill: INK, duration: 1.4 }, 4.45);
    t.fromTo(q('.s-arc'), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 4.5);
    t.fromTo(q('.s-ad'), { opacity: 0 }, { opacity: 1, duration: 0.2 }, 5.8);
    t.to(q('.s-lift'), { opacity: 0, duration: 0.25 }, 5.85);
    t.fromTo(q('.s-adfmt'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 5.9);
    t.fromTo(q('.s-adjar'), { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.8 }, 5.9);
    t.fromTo(q('.s-adt1, .s-adt2'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.15 }, 6.4);
    t.fromTo(q('.s-adbtn'), { opacity: 0, scale: 0.85, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.5 }, 6.8);

    // 3 · La commande part
    t.fromTo(q('.s-tap'), { opacity: 0.9, attr: { r: L.tap[0] } }, { opacity: 0, attr: { r: L.tap[1] }, duration: 0.6, ease: 'power2.out', immediateRender: false }, 8.2);
    t.to(q('.s-page'), { opacity: 0, duration: 0.5 }, 8.6);
    t.to(q('.s-arc'), { opacity: 0, duration: 0.3 }, 8.6);
    t.to(q('.s-ad'), { ...L.ad, duration: 1.0 }, 8.6);
    t.fromTo(q('.s-order'), { opacity: 0, ...L.orderFrom }, { opacity: 1, ...L.orderMid, duration: 0.7 }, 9.0);
    t.fromTo(q('.s-conn'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 9.4);
    if (L.adFades) {
      t.to(q('.s-ad'), { opacity: 0, duration: 0.5 }, 10.0);
      t.to(q('.s-conn'), { opacity: 0, duration: 0.4 }, 10.0);
      t.to(q('.s-order'), { x: 0, y: 0, duration: 0.9 }, 10.0);
    } else {
      t.to(q('.s-conn'), { opacity: 0, duration: 0.4 }, 10.2);
    }
    draw('.s-filout', 0.5, 10.8);
    t.fromTo(q('.s-br'), { strokeDasharray: '1 1', strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration: 0.7, stagger: 0.15 }, 11.2);
    t.fromTo(q('.s-nd'), { opacity: 1, scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.4, stagger: 0.15 }, 11.6);
    t.fromTo(q('.s-lb'), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.15 }, 11.7);
    t.to({}, { duration: 1.4 }, 12.6);

    tl = t;
    t.time(Math.min(previous, t.duration()), true);
    if (wasActive) t.play();
    else if (reducedMotion() && !started) still(0);
    update();
  };

  const play = (from?: number) => {
    if (!tl) return;
    started = true;
    if (from !== undefined) tl.play(from);
    else if (tl.progress() >= 1) tl.restart();
    else tl.play();
    update();
  };

  playBtn.addEventListener('click', () => {
    if (!tl) return;
    if (tl.isActive()) {
      tl.pause();
      autoPaused = false;
      update();
    } else play();
  });
  replayBtn.addEventListener('click', () => play(0));
  chapters.forEach((li, i) =>
    li.querySelector('button')?.addEventListener('click', () => {
      started = true;
      if (reducedMotion()) still(i);
      else play(CHAPTERS[i][0]);
    }),
  );

  // Lecture quand la scène est à moitié visible ; pause quand elle sort de l'écran.
  new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        visible = entry.isIntersecting;
        if (!tl) continue;
        if (visible) {
          if (!started && !reducedMotion()) play(0);
          else if (autoPaused) {
            autoPaused = false;
            tl.play();
          }
        } else if (tl.isActive()) {
          tl.pause();
          autoPaused = true;
        }
        update();
      }
    },
    { threshold: 0.5 },
  ).observe(stage);

  // GSAP n'est chargé qu'à l'approche de la section.
  const loader = new IntersectionObserver(
    async (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      loader.disconnect();
      const mod = await import('gsap');
      gsap = mod.gsap;
      stage.classList.add('is-ready');
      build();
      if (visible && !started && !reducedMotion()) play(0);
    },
    { rootMargin: '600px 0px' },
  );
  loader.observe(section);

  desktopQuery.addEventListener('change', build);
  onReducedMotionChange((reduced) => {
    if (!tl) return;
    if (reduced) {
      started = false;
      still(0);
    } else if (visible && !started) play(0);
    update();
  });
}
