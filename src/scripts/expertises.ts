// Onglets des expertises : clic, flèches du clavier, ancres (#shopify, #motion, #automatisation).
import { reducedMotion } from './motion';

export function initExpertises(root: HTMLElement): void {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls') ?? ''));
  if (panels.some((p) => !p)) return;
  let current = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');

  const select = (i: number, opts: { focus?: boolean; scroll?: boolean } = {}) => {
    const changed = i !== current;
    current = i;
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[k]!.hidden = !on;
    });
    root.dataset.active = tabs[i].dataset.tab;
    if (opts.focus) tabs[i].focus();
    if (changed) document.dispatchEvent(new Event('fil:refresh'));
    // Si l'on a déjà défilé dans la section, on revient au début du nouveau panneau.
    if (opts.scroll && root.getBoundingClientRect().top < 0) {
      panels[i]!.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  };

  tabs.forEach((t, i) => t.addEventListener('click', () => select(i, { scroll: true })));
  root.querySelector('[role="tablist"]')?.addEventListener('keydown', (event) => {
    const e = event as KeyboardEvent;
    const keys: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    select((keys[e.key] + tabs.length) % tabs.length, { focus: true });
  });

  // Ancre vers un panneau : on ouvre l'onglet avant que le navigateur ne défile.
  const indexOf = (hash: string) => panels.findIndex((p) => `#${p!.id}` === hash);
  document.addEventListener(
    'click',
    (event) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="#"]');
      if (!link) return;
      const url = new URL(link.href, location.href);
      if (url.pathname !== location.pathname) return;
      const i = indexOf(url.hash);
      if (i >= 0) select(i);
    },
    true,
  );
  const fromHash = () => {
    const i = indexOf(location.hash);
    if (i < 0) return;
    select(i);
    requestAnimationFrame(() => panels[i]!.scrollIntoView({ block: 'start' }));
  };
  window.addEventListener('hashchange', fromHash);
  fromHash();

  // Sans JavaScript tout est visible ; avec, seuls l'onglet actif s'affiche.
  tabs.forEach((_, k) => (panels[k]!.hidden = k !== current));
}
