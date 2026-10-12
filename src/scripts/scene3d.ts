// Chargeur des scènes 3D : three.js n'est téléchargé qu'à l'approche d'une scène visible,
// une fois la page chargée. Sans WebGL, le conteneur reste vide (les scènes sont décoratives).
import { desktopQuery } from './motion';

type Mount = (el: HTMLElement) => () => void;

const loaders: Record<string, () => Promise<Mount>> = {
  knot: () => import('./three/knot').then((m) => (el: HTMLElement) => m.mountKnot(el, el.dataset.mode === 'tangle' ? 'tangle' : 'hero')),
  network: () => import('./three/network').then((m) => (el: HTMLElement) => m.mountNetwork(el)),
  lamp: () => import('./three/lamp').then((m) => (el: HTMLElement) => m.mountLamp(el)),
  bottle: () => import('./three/bottle').then((m) => (el: HTMLElement) => m.mountBottle(el)),
};

const shown = (el: HTMLElement) => el.offsetParent !== null && el.clientWidth > 0;

const whenIdle = (fn: () => void) => {
  const run = () => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
};

export function init3d(): void {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-3d]'));
  if (!elements.length) return;
  const mounted = new Map<HTMLElement, (() => void) | null>();

  const mount = async (el: HTMLElement) => {
    if (mounted.has(el) || !shown(el)) return;
    const load = loaders[el.dataset['3d'] ?? ''];
    if (!load) return;
    mounted.set(el, null);
    try {
      const fn = await load();
      if (!shown(el)) {
        mounted.delete(el);
        return;
      }
      mounted.set(el, fn(el));
      el.classList.add('is-3d');
    } catch {
      mounted.delete(el);
      el.classList.add('no-3d');
    }
  };

  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && whenIdle(() => mount(e.target as HTMLElement))),
    { rootMargin: '400px 0px' },
  );
  elements.forEach((el) => io.observe(el));

  // Les scènes desktop et mobile ont chacune leur conteneur : on démonte celle qui disparaît.
  desktopQuery.addEventListener('change', () => {
    for (const [el, unmount] of mounted) {
      if (shown(el)) continue;
      unmount?.();
      mounted.delete(el);
      el.classList.remove('is-3d');
    }
    elements.forEach((el) => {
      io.unobserve(el);
      io.observe(el);
    });
  });
}
