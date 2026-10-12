// Flacon de démonstration (marque fictive) : il tourne, change de taille selon le format,
// et son jus prend la teinte de la note choisie. L'état arrive par « p3d:state » sur le conteneur.
import { BackSide, CanvasTexture, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, PlaneGeometry, Scene } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { bands, createStage, spinner } from './common';
import { reducedMotion } from '../motion';

const SCALE: Record<string, number> = { '30': 0.78, '50': 0.92, '100': 1.08 };
const O = 0.02;

// Étiquette dessinée avec les polices du site.
function labelTexture(brand: string, name: string, kind: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fffcf8';
  g.fillRect(0, 0, 512, 320);
  g.fillStyle = '#1b1612';
  g.textAlign = 'center';
  g.font = '700 38px "Figtree Variable", sans-serif';
  g.letterSpacing = '14px';
  g.fillText(brand, 263, 92);
  g.letterSpacing = '0px';
  g.font = '800 78px "Bricolage Grotesque Variable", sans-serif';
  g.fillText(name, 256, 192);
  g.font = '600 28px "Figtree Variable", sans-serif';
  g.letterSpacing = '6px';
  g.fillText(kind.toUpperCase(), 259, 252);
  return new CanvasTexture(c);
}

export function mountBottle(container: HTMLElement): () => void {
  const read = () => ({ note: container.dataset.note || 'fond', format: container.dataset.format || '50' });
  let state = read();

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.1, 100);
  const bottle = new Group();
  scene.add(bottle);

  const ink = new MeshBasicMaterial({ color: new Color('#3a312a'), side: BackSide });
  const glass = bands('verre', 0.32);
  const liquid = bands(`liquide-${state.note}`);
  const cap = bands('bouchon');
  const disposables: { dispose(): void }[] = [ink, glass, liquid, cap];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  // Verre : coque arrondie, contour fin ; le jus à l'intérieur.
  const W = 1.5;
  const H = 1.9;
  const D = 0.78;
  const hull = new Mesh(keep(new RoundedBoxGeometry(W + 2 * O, H + 2 * O, D + 2 * O, 4, 0.16 + O)), ink);
  const body = new Mesh(keep(new RoundedBoxGeometry(W, H, D, 4, 0.16)), glass);
  const juice = new Mesh(keep(new RoundedBoxGeometry(W - 0.22, H * 0.72, D - 0.2, 4, 0.1)), liquid);
  juice.position.y = -H * 0.12;
  body.renderOrder = 2;
  hull.position.y = body.position.y = 0;
  bottle.add(hull, juice, body);

  // Col et bouchon.
  const neck = new Mesh(keep(new CylinderGeometry(0.2, 0.2, 0.18, 32)), cap);
  neck.position.y = H / 2 + 0.09;
  const capHull = new Mesh(keep(new CylinderGeometry(0.42 + O, 0.42 + O, 0.62 + 2 * O, 48)), ink);
  const capBody = new Mesh(keep(new CylinderGeometry(0.42, 0.42, 0.62, 48)), cap);
  capHull.position.y = capBody.position.y = H / 2 + 0.18 + 0.31;
  bottle.add(neck, capHull, capBody);

  // Étiquette sur la face avant.
  const tex = keep(labelTexture(container.dataset.brand || '', container.dataset.name || '', container.dataset.kind || ''));
  const labelMat = keep(new MeshBasicMaterial({ map: tex }));
  const label = new Mesh(keep(new PlaneGeometry(1.04, 0.65)), labelMat);
  label.position.set(0, -0.12, D / 2 + 0.004);
  label.renderOrder = 3;
  bottle.add(label);
  document.fonts?.ready.then(() => {
    const fresh = labelTexture(container.dataset.brand || '', container.dataset.name || '', container.dataset.kind || '');
    labelMat.map = fresh;
    labelMat.needsUpdate = true;
    tex.dispose();
    disposables.push(fresh);
    stage.wake();
  });

  let scale = SCALE[state.format] ?? 1;
  const spin = spinner(container, { auto: 0.3, tilt: 0.5 });

  const stage = createStage(container, {
    resize(w, h) {
      camera.aspect = w / h;
      const t = Math.tan((camera.fov * Math.PI) / 360);
      const dist = Math.max(2.05 / t, 1.6 / (t * camera.aspect));
      camera.position.set(0, 0.7, dist);
      camera.lookAt(0, 0.3, 0);
      camera.updateProjectionMatrix();
    },
    frame(_time, dt) {
      const still = reducedMotion();
      const k = still ? 1 : Math.min(1, dt * 5 || 1);
      let moving = spin.step(dt, still);
      const target = SCALE[state.format] ?? 1;
      if (Math.abs(target - scale) > 0.001) {
        scale += (target - scale) * k;
        moving = true;
      } else scale = target;
      if (liquid.toward(`liquide-${state.note}`, k)) moving = true;
      bottle.scale.setScalar(scale);
      bottle.position.y = -1.25 + (H / 2) * scale; // la base reste posée
      bottle.rotation.set(spin.state.pitch, spin.state.yaw - 0.35, 0);
      stage.renderer.render(scene, camera);
      return !still || moving;
    },
  });

  const onState = () => {
    state = read();
    stage.wake();
  };
  container.addEventListener('p3d:state', onState);

  return () => {
    container.removeEventListener('p3d:state', onState);
    stage.dispose();
    disposables.forEach((d) => d.dispose());
  };
}
