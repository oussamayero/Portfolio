// Vitrine produits : onglets, réglages de chaque fiche, et lien entre chaque bloc et son explication.
export function initProduits(root: HTMLElement): void {
  // Onglets (clic, flèches, Début/Fin)
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = tabs.map((t) => root.querySelector<HTMLElement>(`#${t.getAttribute('aria-controls')}`)!);
  let current = 0;
  const select = (i: number, focus = false) => {
    current = i;
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
    });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
  root.querySelector('[role="tablist"]')?.addEventListener('keydown', (event) => {
    const e = event as KeyboardEvent;
    const keys: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    select((keys[e.key] + tabs.length) % tabs.length, true);
  });

  const toggle = (btn: HTMLButtonElement, on: boolean) => {
    btn.setAttribute('aria-pressed', String(on));
    const label = btn.querySelector('span');
    if (label) label.textContent = (on ? btn.dataset.on : btn.dataset.off) ?? '';
  };
  const send = (el: HTMLElement | null) => el?.dispatchEvent(new CustomEvent('p3d:state'));

  // Lampe
  const lamp = root.querySelector<HTMLElement>('[data-3d="lamp"]');
  const lampMedia = lamp?.closest<HTMLElement>('.media');
  root.querySelector<HTMLButtonElement>('[data-lamp-light]')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const on = btn.getAttribute('aria-pressed') !== 'true';
    toggle(btn, on);
    if (lamp) lamp.dataset.light = on ? 'on' : 'off';
    if (lampMedia) lampMedia.dataset.light = on ? 'on' : 'off';
    send(lamp);
  });
  root.querySelectorAll<HTMLInputElement>('[data-lamp-finish]').forEach((input) =>
    input.addEventListener('change', () => {
      if (lamp) lamp.dataset.finish = input.value;
      send(lamp);
    }),
  );
  root.querySelector<HTMLButtonElement>('[data-lamp-dims]')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const on = btn.getAttribute('aria-pressed') !== 'true';
    toggle(btn, on);
    if (lamp) lamp.dataset.dims = on ? 'on' : 'off';
    send(lamp);
  });

  // Vêtement : couleur portée, zoom matière (la loupe suit le pointeur sur ordinateur).
  const coat = root.querySelector<HTMLElement>('.photo-media');
  const matiere = coat?.querySelector<HTMLElement>('[data-matiere]');
  const zoomBtn = root.querySelector<HTMLButtonElement>('[data-coat-zoom]');
  const photo = () => coat?.querySelector<HTMLImageElement>('img.on');
  root.querySelectorAll<HTMLInputElement>('[data-coat-color]').forEach((input) =>
    input.addEventListener('change', () => {
      if (!coat) return;
      coat.dataset.color = input.value;
      coat.querySelectorAll<HTMLImageElement>('img').forEach((img) => img.classList.toggle('on', img.dataset.photo === input.value));
      if (coat.dataset.zoom === 'on') hiRes();
    }),
  );
  const hiRes = () => {
    const img = photo();
    if (img?.dataset.zoomSrc && img.src !== img.dataset.zoomSrc) img.src = img.dataset.zoomSrc;
  };
  zoomBtn?.addEventListener('click', () => {
    if (!coat) return;
    const on = coat.dataset.zoom !== 'on';
    coat.dataset.zoom = on ? 'on' : 'off';
    toggle(zoomBtn, on);
    if (matiere) matiere.textContent = on ? (zoomBtn.dataset.texte ?? '') : '';
    if (on) hiRes();
  });
  coat?.addEventListener('pointermove', (e) => {
    if (coat.dataset.zoom !== 'on' || e.pointerType !== 'mouse') return;
    const r = coat.getBoundingClientRect();
    const img = photo();
    if (img) img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  });

  // Parfum : la note change l'ambiance et le jus, le format change la taille du flacon.
  const bottle = root.querySelector<HTMLElement>('[data-3d="bottle"]');
  const bottleMedia = bottle?.closest<HTMLElement>('.media');
  const notesOut = root.querySelector<HTMLElement>('[data-notes-out]');
  const formatOut = root.querySelector<HTMLElement>('[data-format-out]');
  root.querySelectorAll<HTMLInputElement>('[data-perf-note]').forEach((input) =>
    input.addEventListener('change', () => {
      if (bottle) bottle.dataset.note = input.value;
      if (bottleMedia) bottleMedia.dataset.note = input.value;
      if (notesOut) {
        notesOut.innerHTML = '';
        const strong = document.createElement('strong');
        strong.textContent = input.dataset.notes ?? '';
        notesOut.append(strong, ` ${input.dataset.desc ?? ''}`);
      }
      send(bottle);
    }),
  );
  root.querySelectorAll<HTMLInputElement>('[data-perf-format]').forEach((input) =>
    input.addEventListener('change', () => {
      if (bottle) bottle.dataset.format = input.value;
      if (formatOut) formatOut.textContent = input.dataset.h ?? '';
      send(bottle);
    }),
  );

  // Chaque réglage numéroté s'éclaire avec son explication, et inversement.
  panels.forEach((panel) => {
    const pairs = (n: string) => panel.querySelectorAll<HTMLElement>(`[data-point="${n}"]`);
    panel.querySelectorAll<HTMLElement>('[data-point]').forEach((el) => {
      const n = el.dataset.point ?? '';
      const on = () => pairs(n).forEach((x) => x.classList.add('is-hot'));
      const off = () => pairs(n).forEach((x) => x.classList.remove('is-hot'));
      el.addEventListener('pointerenter', on);
      el.addEventListener('pointerleave', off);
      el.addEventListener('focusin', on);
      el.addEventListener('focusout', off);
    });
  });
}
