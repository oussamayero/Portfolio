// Séquence signature : chronologie GSAP en trois chapitres, jouée une fois quand la scène
// est à moitié visible, mise en pause hors écran, en images fixes si les animations sont réduites.
import { desktopQuery, onReducedMotionChange, reducedMotion } from './motion';

type Gsap = typeof import('gsap').gsap;
type Timeline = ReturnType<Gsap['timeline']>;
type Point = [number, number];

interface Layout {
  lift: { x: number; y: number; width: number; height: number; rx: number };
  ad: { x: number; y: number; scale: number; svgOrigin: string };
  orderFrom: { x: number; y: number };
  orderMid: { x: number; y: number };
  adFades: boolean;
  tap: [number, number];
  // Curseur : entrée, saisie de la photo, dépôt dans la publicité, bouton « Découvrir ».
  cursor: { from: Point; grab: Point; drop: Point; button: Point };
}

const CHAPTERS: [number, number][] = [
  [0, 4.4],
  [4.4, 8.2],
  [8.2, 14],
];

const DESKTOP: Layout = {
  lift: { x: 812, y: 40, width: 360, height: 640, rx: 20 },
  ad: { x: -652, y: 120, scale: 0.62, svgOrigin: '812 40' },
  orderFrom: { x: 380, y: 0 },
  orderMid: { x: 320, y: 0 },
  adFades: true,
  tap: [8, 60],
  cursor: { from: [1100, 780], grab: [317, 360], drop: [992, 360], button: [915, 627] },
};

const MOBILE: Layout = {
  lift: { x: 88, y: 30, width: 224, height: 398, rx: 14 },
  ad: { x: -68, y: -6, scale: 0.42, svgOrigin: '88 30' },
  orderFrom: { x: 40, y: 0 },
  orderMid: { x: 0, y: 0 },
  adFades: false,
  tap: [6, 30],
  cursor: { from: [340, 540], grab: [115, 195], drop: [200, 229], button: [152, 397] },
};

const EASE = 'power3.inOut'; // équivalent GSAP de la courbe « geste »
const RESTORED = ['x', 'y', 'width', 'height', 'rx', 'r'];

export function initSequence(section: HTMLElement): void {
  const stage = section.querySelector<HTMLElement>('[data-stage]');
  const playBtn = section.querySelector<HTMLButtonElement>('[data-seq-play]');
  const replayBtn = section.querySelector<HTMLButtonElement>('[data-seq-replay]');
  const chapters = Array.from(section.querySelectorAll<HTMLLIElement>('[data-chapter]'));
  if (!stage || !playBtn || !replayBtn) return;

  // Valeurs d'origine des attributs animés, pour reconstruire proprement la chronologie.
  const animatedAttrs = Array.from(stage.querySelectorAll<SVGElement>('.s-liftclip, .s-liftimg, .s-tap')).map((el) => ({
    el,
    attrs: RESTORED.filter((k) => el.hasAttribute(k)).map((k) => [k, el.getAttribute(k) ?? '0'] as const),
  }));

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
    animatedAttrs.forEach(({ el, attrs }) => attrs.forEach(([k, v]) => el.setAttribute(k, v)));

    const desktop = desktopQuery.matches;
    const svg = stage.querySelector(desktop ? '.sv-d' : '.sv-m');
    if (!svg) return;
    const L = desktop ? DESKTOP : MOBILE;
    const C = L.cursor;
    const { rx, ...box } = L.lift;
    const q = (selector: string) => svg.querySelectorAll(selector);
    const cursor = q('.s-cursor');
    const t = g.timeline({ paused: true, defaults: { ease: EASE }, onUpdate: update, onComplete: update });
    const draw = (selector: string, duration: number, at: number) =>
      t.fromTo(q(selector), { strokeDasharray: '1 1', strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration }, at);

    // 1 · La boutique : le fil trace la fiche, puis la photo, les textes et les vignettes se posent.
    draw('.s-filin', 1.2, 0);
    draw('.s-cardline', 1.6, 1.0);
    draw('.s-imgline', 0.9, 1.6);
    draw('.s-tline', 0.8, 2.0);
    t.fromTo(q('.s-card'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 3.0);
    t.fromTo(q('.s-head'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 3.0);
    t.to(q('.s-cardline'), { opacity: 0, duration: 0.6 }, 3.1);
    t.fromTo(q('.s-img'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 3.1);
    t.fromTo(q('.s-imgph'), { scale: 1.14, transformOrigin: '50% 50%' }, { scale: 1, duration: 1.3, ease: 'power3.out' }, 3.1);
    t.to(q('.s-imgline'), { opacity: 0, duration: 0.4 }, 3.3);
    t.to(q('.s-tline'), { opacity: 0, duration: 0.3 }, 3.3);
    t.fromTo(q('.s-info > *'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08 }, 3.3);
    t.fromTo(q('.s-thumbs > *'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: 'power3.out' }, 3.6);
    t.fromTo(cursor, { x: C.from[0], y: C.from[1], opacity: 0 }, { x: C.grab[0], y: C.grab[1], duration: 0.9, ease: 'power3.out' }, 3.4);
    t.to(cursor, { opacity: 1, duration: 0.3, ease: 'none' }, 3.4);
    t.to(cursor, { scale: 0.78, transformOrigin: '50% 50%', duration: 0.15, ease: 'power2.out' }, 4.25);

    // 2 · Le produit s'anime : le curseur sort la photo de la page, elle devient une publicité 9:16.
    t.to(q('.s-page'), { opacity: 0.28, duration: 1.2 }, 4.4);
    t.fromTo(q('.s-lift'), { opacity: 0 }, { opacity: 1, duration: 0.05 }, 4.4);
    t.to(q('.s-liftclip'), { attr: { ...box, rx }, duration: 1.4 }, 4.45);
    t.to(q('.s-liftimg'), { attr: box, duration: 1.4 }, 4.45);
    t.fromTo(q('.s-liftb'), { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'none' }, 4.85);
    t.to(cursor, { x: C.drop[0], y: C.drop[1], duration: 1.4 }, 4.45);
    t.fromTo(q('.s-arc'), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 4.5);
    t.fromTo(q('.s-ad'), { opacity: 0 }, { opacity: 1, duration: 0.2 }, 5.8);
    t.to(q('.s-lift'), { opacity: 0, duration: 0.25 }, 5.85);
    t.to(cursor, { scale: 1, duration: 0.25, ease: 'power2.out' }, 5.85);
    t.fromTo(q('.s-adimg'), { scale: 1, transformOrigin: '50% 50%' }, { scale: 1.08, duration: 3.2, ease: 'sine.out' }, 5.8);
    t.fromTo(q('.s-adlabel'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 5.95);
    t.fromTo(q('.s-adfmt'), { opacity: 0 }, { opacity: 0.8, duration: 0.4 }, 5.95);
    t.fromTo(q('.s-adw'), { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.16, ease: 'power3.out' }, 6.15);
    t.fromTo(q('.s-adbtn'), { opacity: 0, scale: 0.85, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.5 }, 6.8);
    t.to(cursor, { x: C.button[0], y: C.button[1], duration: 0.9 }, 7.1);
    t.to(cursor, { scale: 0.78, duration: 0.12, ease: 'power2.out' }, 8.05);
    t.to(q('.s-adbtn'), { scale: 0.94, duration: 0.12, ease: 'power2.out' }, 8.05);

    // 3 · La commande part : le clic devient une commande, qui déclenche trois actions.
    t.fromTo(q('.s-tap'), { opacity: 0, attr: { r: L.tap[0] } }, { opacity: 0.9, duration: 0.01, immediateRender: false }, 8.19);
    t.to(q('.s-tap'), { opacity: 0, attr: { r: L.tap[1] }, duration: 0.6, ease: 'power2.out' }, 8.2);
    t.to(q('.s-adbtn'), { scale: 1, duration: 0.3, ease: 'power2.out' }, 8.2);
    t.to(cursor, { scale: 1, opacity: 0, duration: 0.4, ease: 'power2.out' }, 8.25);
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
