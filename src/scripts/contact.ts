// Formulaire de contact : validation champ par champ, envoi réel vers le service configuré,
// et pré-remplissage du besoin depuis les liens « Présenter mon projet » de chaque section.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type State = 'sending' | 'success' | 'error' | 'unlinked';

export function initContact(form: HTMLFormElement): void {
  const d = form.dataset;
  const status = form.querySelector<HTMLElement>('[data-status]');
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
  const situation = form.querySelector<HTMLInputElement>('[data-situation]');
  if (!status || !submit) return;
  const label = submit.textContent ?? '';
  let tried = false;

  const field = (name: string) => form.querySelector<HTMLElement>(`[data-field="${name}"]`);
  const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value.trim() ?? '';
  const needs = () => Array.from(form.querySelectorAll<HTMLInputElement>('input[name="besoin"]:checked'));

  const checks: Record<string, () => boolean> = {
    nom: () => value('nom').length > 0,
    email: () => EMAIL.test(value('email')),
    besoin: () => needs().length > 0,
    projet: () => value('projet').length > 0,
  };

  const mark = (name: string, ok: boolean) => {
    const box = field(name);
    if (!box) return;
    box.querySelector('.err')?.toggleAttribute('hidden', ok);
    const control = name === 'besoin' ? box : box.querySelector('input, textarea');
    control?.setAttribute('aria-invalid', String(!ok));
  };

  const validate = () => {
    const invalid = Object.entries(checks).filter(([name, check]) => {
      const ok = check();
      mark(name, ok);
      return !ok;
    });
    return invalid.map(([name]) => name);
  };

  // Après une première tentative, les erreurs se mettent à jour pendant la saisie.
  form.addEventListener('input', () => tried && validate());
  form.addEventListener('change', () => tried && validate());

  const show = (state: State, html: string) => {
    status.hidden = false;
    status.dataset.state = state;
    status.innerHTML = html;
  };

  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

  const mailto = () => {
    const lines = [
      `Nom : ${value('nom')}`,
      `Email : ${value('email')}`,
      `Besoin : ${needs().map((n) => n.parentElement?.textContent?.trim()).join(', ')}`,
      value('site') && `Site ou marque : ${value('site')}`,
      value('echeance') && `Échéance : ${value('echeance')}`,
      '',
      value('projet'),
    ].filter((l) => l !== '');
    return `mailto:${d.email}?subject=${encodeURIComponent('Présentation de projet')}&body=${encodeURIComponent(lines.join('\n'))}`;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    tried = true;
    const invalid = validate();
    if (invalid.length) {
      status.hidden = true;
      const first = field(invalid[0]);
      (first?.querySelector<HTMLElement>('input, textarea') ?? first)?.focus();
      return;
    }
    // Champ piège rempli : envoi automatisé, rien ne part.
    if (value('_gotcha')) return;

    // Aucun service d'envoi configuré : on le dit, sans simuler de succès.
    if (!d.action) {
      const fallback = d.email ? ` ${esc(d.msgUnlinkedFallback ?? '')} <a href="${esc(mailto())}">${esc(d.msgUnlinkedLink ?? '')}</a>.` : '';
      show('unlinked', `${esc(d.msgUnlinked ?? '')}${fallback}`);
      return;
    }

    submit.setAttribute('aria-busy', 'true');
    submit.textContent = d.msgSending ?? label;
    show('sending', esc(d.msgSending ?? ''));
    try {
      const response = await fetch(d.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(String(response.status));
      show('success', esc(d.msgSuccess ?? ''));
      form.reset();
      tried = false;
    } catch {
      const fallback = d.email ? ` ${esc(d.msgFallback ?? '')} <a href="mailto:${esc(d.email)}">${esc(d.email)}</a>.` : '';
      show('error', `${esc(d.msgError ?? '')}${fallback}`);
    } finally {
      submit.removeAttribute('aria-busy');
      submit.textContent = label;
    }
  });

  // Les liens de fin de section cochent déjà le besoin correspondant.
  document.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-need]');
    if (!link) return;
    const [need, detail] = (link.dataset.need ?? '').split('-');
    const box = form.querySelector<HTMLInputElement>(`input[name="besoin"][value="${need}"]`);
    if (box) box.checked = true;
    if (situation) situation.value = detail ?? '';
    if (tried) validate();
  });
}
