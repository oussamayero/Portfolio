// Préférence « réduire les animations », lue en direct.
const query = window.matchMedia('(prefers-reduced-motion: reduce)');

export function reducedMotion(): boolean {
  return query.matches;
}

export function onReducedMotionChange(callback: (reduced: boolean) => void): void {
  query.addEventListener('change', () => callback(query.matches));
}

export const desktopQuery = window.matchMedia('(min-width: 900px)');
