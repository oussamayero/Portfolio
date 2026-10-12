// Lampe de démonstration (marque fictive) : on la fait tourner, on l'allume, on change sa finition,
// on affiche ses dimensions. L'état arrive par l'évènement « p3d:state » sur le conteneur.
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
} from 'three';
import { bands, createStage, PALETTE, spinner } from './common';
import { reducedMotion } from '../motion';

interface LampState {
  light: boolean;
  finish: string;
  dims: boolean;
}

const SHADE_R = 1.5;
const SHADE_H = 0.62;
const STEM_TOP = 2.05;
const SHADE_Y = STEM_TOP + SHADE_H / 2 - 0.05;
const O = 0.022; // épaisseur du contour

// Halo de lumière : dégradé radial dessiné une fois.
function glowTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,236,200,1)');
  grad.addColorStop(0.45, 'rgba(255,214,160,0.45)');
  grad.addColorStop(1, 'rgba(255,200,140,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

export function mountLamp(container: HTMLElement): () => void {
  const read = (): LampState => ({
    light: container.dataset.light === 'on',
    finish: container.dataset.finish || 'terracotta',
    dims: container.dataset.dims === 'on',
  });
  let state = read();

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  const lamp = new Group();
  scene.add(lamp);

  const shadeMat = bands(state.finish);
  const bodyMat = bands(state.finish);
  const rim = new MeshBasicMaterial({ color: new Color(PALETTE[state.finish][0]), side: BackSide });
  const disposables: { dispose(): void }[] = [shadeMat, bodyMat, rim];

  const part = (geo: BufferGeometry, hullGeo: BufferGeometry, mat: typeof shadeMat, y: number) => {
    const g = new Group();
    g.add(new Mesh(hullGeo, rim), new Mesh(geo, mat));
    g.position.y = y;
    disposables.push(geo, hullGeo);
    lamp.add(g);
    return g;
  };
  // Socle, tige, abat-jour (tambour large et plat).
  part(new CylinderGeometry(0.46, 0.5, 0.5, 48), new CylinderGeometry(0.46 + O, 0.5 + O, 0.5 + 2 * O, 48), bodyMat, 0.25);
  part(new CylinderGeometry(0.055, 0.055, STEM_TOP - 0.5, 16), new CylinderGeometry(0.055 + O, 0.055 + O, STEM_TOP - 0.5, 16), bodyMat, 0.5 + (STEM_TOP - 0.5) / 2);
  part(new CylinderGeometry(SHADE_R, SHADE_R, SHADE_H, 72, 1, true), new CylinderGeometry(SHADE_R + O, SHADE_R + O, SHADE_H + 2 * O, 72, 1, true), shadeMat, SHADE_Y);
  const topCap = new Mesh(new CircleGeometry(SHADE_R, 72), shadeMat);
  topCap.rotation.x = -Math.PI / 2;
  topCap.position.y = SHADE_Y + SHADE_H / 2;
  lamp.add(topCap);

  // Dessous de l'abat-jour : sombre éteint, blanc chaud allumé.
  const underMat = new MeshBasicMaterial({ color: new Color('#3b2b22'), side: DoubleSide });
  const under = new Mesh(new CircleGeometry(SHADE_R - 0.01, 72), underMat);
  under.rotation.x = Math.PI / 2;
  under.position.y = SHADE_Y - SHADE_H / 2 + 0.02;
  lamp.add(under);
  disposables.push(underMat, under.geometry, topCap.geometry);

  // Faisceau et flaque de lumière sur la table.
  const glow = glowTexture();
  const beamMat = new MeshBasicMaterial({ color: new Color('#ffd9a8'), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
  const beam = new Mesh(new ConeGeometry(2.6, SHADE_Y - SHADE_H / 2, 64, 1, true), beamMat);
  beam.position.y = (SHADE_Y - SHADE_H / 2) / 2;
  lamp.add(beam);
  const poolMat = new MeshBasicMaterial({ map: glow, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
  const pool = new Mesh(new PlaneGeometry(6, 6), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.005;
  scene.add(pool);
  disposables.push(glow, beamMat, beam.geometry, poolMat, pool.geometry);

  // Cotes : hauteur à droite, diamètre au-dessus.
  const top = SHADE_Y + SHADE_H / 2;
  const dx = SHADE_R + 0.45;
  const dy = top + 0.4;
  const seg = [
    [dx, 0, 0, dx, top, 0],
    [dx - 0.12, 0, 0, dx + 0.12, 0, 0],
    [dx - 0.12, top, 0, dx + 0.12, top, 0],
    [-SHADE_R, dy, 0, SHADE_R, dy, 0],
    [-SHADE_R, dy - 0.12, 0, -SHADE_R, dy + 0.12, 0],
    [SHADE_R, dy - 0.12, 0, SHADE_R, dy + 0.12, 0],
  ].flat();
  const dimGeo = new BufferGeometry();
  dimGeo.setAttribute('position', new Float32BufferAttribute(seg, 3));
  const dimMat = new LineBasicMaterial({ color: new Color('#1b1612'), transparent: true, opacity: 0 });
  const dimLines = new LineSegments(dimGeo, dimMat);
  scene.add(dimLines);
  disposables.push(dimGeo, dimMat);
  const labels = Array.from(container.querySelectorAll<HTMLElement>('[data-dim]'));
  // Hauteur : étiquette à gauche de la cote (côté lampe) pour rester dans le cadre.
  const anchors = [new Vector3(dx - 0.12, top * 0.42, 0), new Vector3(0, dy + 0.2, 0)];

  let lit = state.light ? 1 : 0;
  let dimsOn = state.dims ? 1 : 0;
  const spin = spinner(container, { auto: 0.22, tilt: 0.6 });
  const warmOff = new Color('#3b2b22');
  const warmOn = new Color('#fff3da');

  const stage = createStage(container, {
    resize(w, h) {
      camera.aspect = w / h;
      const t = Math.tan((camera.fov * Math.PI) / 360);
      const dist = Math.max(2.3 / t, 3.15 / (t * camera.aspect));
      camera.position.set(0, 2.6, dist);
      camera.lookAt(0, 1.45, 0);
      camera.updateProjectionMatrix();
    },
    frame(_time, dt) {
      const still = reducedMotion();
      const k = still ? 1 : Math.min(1, dt * 5 || 1);
      let moving = spin.step(dt, still);

      const litTarget = state.light ? 1 : 0;
      if (Math.abs(litTarget - lit) > 0.002) {
        lit += (litTarget - lit) * k;
        moving = true;
      } else lit = litTarget;
      const dimTarget = state.dims ? 1 : 0;
      if (Math.abs(dimTarget - dimsOn) > 0.002) {
        dimsOn += (dimTarget - dimsOn) * k;
        moving = true;
      } else dimsOn = dimTarget;

      // Teintes : la finition choisie, éclaircie par la lumière.
      if (shadeMat.toward(lit > 0.5 ? `${state.finish}-on` : state.finish, k)) moving = true;
      if (bodyMat.toward(state.finish, k)) moving = true;
      rim.color.lerp(new Color(PALETTE[state.finish][0]), k);
      underMat.color.copy(warmOff).lerp(warmOn, lit);
      beamMat.opacity = 0.16 * lit;
      poolMat.opacity = 0.9 * lit;
      dimMat.opacity = dimsOn;
      dimMat.color.set(lit > 0.5 ? '#f7f2eb' : '#1b1612');

      lamp.rotation.set(spin.state.pitch, spin.state.yaw, 0);
      pool.rotation.z = spin.state.yaw;
      stage.renderer.render(scene, camera);

      // Étiquettes des cotes, projetées à l'écran.
      labels.forEach((el, i) => {
        const v = anchors[i].clone().project(camera);
        el.style.opacity = String(dimsOn);
        el.style.transform = `translate(${((v.x + 1) / 2) * stage.width}px, ${((1 - v.y) / 2) * stage.height}px) translate(${i === 0 ? '-100%' : '-50%'}, -50%)`;
      });
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
