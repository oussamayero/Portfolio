// Le fil en volume : la boucle du logo (le O d'Ouza) en tube, ombrée en aplats corail.
// « hero » : le fil se trace, suit le pointeur et se dénoue quand on fait défiler la page.
// « tangle » : un fil emmêlé, pour la page introuvable.
import {
  BackSide,
  CatmullRomCurve3,
  Color,
  Curve,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { bands, clamp01, createStage, easeInOut, easeOut, smooth } from './common';
import { reducedMotion } from '../motion';

const R = 1.15;
const ENTRY = 2.0;
const EXIT = 2.0;
const LOOP = Math.PI * 2 * R;
const TOTAL = ENTRY + LOOP + EXIT;
const DEPTH = 0.36; // écart avant/arrière au croisement
const TILT = 0.95; // la boucle penche vers l'avant
const RADIUS = 0.17;
const SEGMENTS = 260;
const RADIAL = 16;
const DRAW_TIME = 1.6;
const OUTLINE = 0.022;

// Entrée horizontale, boucle complète, sortie horizontale ; `u` la redresse en ligne droite.
class FilCurve extends Curve<Vector3> {
  u = 0;

  getPoint(t: number, target = new Vector3()): Vector3 {
    const s = t * TOTAL;
    let x: number;
    let y: number;
    let z: number;
    if (s <= ENTRY) {
      x = s - ENTRY;
      y = -R;
      z = -DEPTH;
    } else if (s <= ENTRY + LOOP) {
      const a = (s - ENTRY) / LOOP;
      const th = -Math.PI / 2 + a * Math.PI * 2;
      x = R * Math.cos(th);
      y = R * Math.sin(th);
      z = -DEPTH + 2 * DEPTH * smooth(a) + (TILT * (1 + Math.sin(th))) / 2;
    } else {
      x = s - ENTRY - LOOP;
      y = -R;
      z = DEPTH;
    }
    if (this.u > 0) {
      const k = easeInOut(this.u);
      x += (s - ENTRY - x) * k;
      y += (-R - y) * k;
      z += (0 - z) * k;
    }
    return target.set(x, y + 0.15, z);
  }
}

// Pseudo-aléatoire déterministe : le même nœud à chaque visite.
function tangleCurve(): CatmullRomCurve3 {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const points: Vector3[] = [];
  for (let i = 0; i < 16; i++) {
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    const r = 1.05 + rnd() * 0.45;
    points.push(new Vector3(r * Math.sin(ph) * Math.cos(th) * 1.35, r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)));
  }
  return new CatmullRomCurve3(points, true, 'centripetal');
}

export function mountKnot(container: HTMLElement, mode: 'hero' | 'tangle' = 'hero'): () => void {
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);

  const group = new Group();
  scene.add(group);
  const material = bands('corail');
  const tube = new Mesh(undefined, material);
  // Contour brique, épaisseur constante : la forme se lit même en petit.
  const rim = new MeshBasicMaterial({ color: new Color('#8f1f15'), side: BackSide });
  const hull = new Mesh(undefined, rim);
  group.add(hull, tube);

  const capGeo = new SphereGeometry(RADIUS, 20, 14);
  const capHull = new SphereGeometry(RADIUS + OUTLINE, 20, 14);
  const withRim = (geo: SphereGeometry, hullGeo: SphereGeometry) => {
    const g = new Group();
    g.add(new Mesh(hullGeo, rim), new Mesh(geo, material));
    return g;
  };
  const startCap = withRim(capGeo, capHull);
  const tipCap = withRim(capGeo, capHull);
  const nodeGeo = new SphereGeometry(RADIUS * 1.9, 28, 20);
  const nodeHull = new SphereGeometry(RADIUS * 1.9 + OUTLINE, 28, 20);
  const node = withRim(nodeGeo, nodeHull);
  if (mode === 'hero') group.add(startCap, tipCap, node);

  const curve = mode === 'hero' ? new FilCurve() : tangleCurve();
  const closed = mode === 'tangle';
  let geometry: TubeGeometry | null = null;
  let hullGeometry: TubeGeometry | null = null;
  const rebuild = () => {
    geometry?.dispose();
    hullGeometry?.dispose();
    const r = closed ? RADIUS * 0.8 : RADIUS;
    geometry = new TubeGeometry(curve, closed ? 420 : SEGMENTS, r, RADIAL, closed);
    hullGeometry = new TubeGeometry(curve, closed ? 420 : SEGMENTS, r + OUTLINE, RADIAL, closed);
    tube.geometry = geometry;
    hull.geometry = hullGeometry;
  };
  rebuild();

  const half = mode === 'hero' ? { w: 3.0, h: 2.0 } : { w: 2.5, h: 2.1 };
  let started = -1;
  let drawn = reducedMotion() ? 1 : 0;
  let unravel = 0;
  let unravelTarget = 0;
  const rot = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const base = mode === 'hero' ? { x: 0.34, y: -0.62 } : { x: 0.3, y: 0 };

  const applyDraw = () => {
    if (!geometry) return;
    const segments = closed ? 420 : SEGMENTS;
    const count = drawn >= 1 ? Infinity : Math.floor(drawn * segments) * RADIAL * 6;
    geometry.setDrawRange(0, count);
    hullGeometry?.setDrawRange(0, count);
    if (mode !== 'hero') return;
    startCap.position.copy(curve.getPointAt(0));
    tipCap.position.copy(curve.getPointAt(Math.max(0.0001, drawn)));
    startCap.visible = tipCap.visible = drawn > 0;
    node.position.copy(curve.getPointAt(1));
    const pop = clamp01((drawn - 0.94) / 0.06);
    node.scale.setScalar(Math.max(0.0001, easeOut(pop)));
  };

  const stage = createStage(container, {
    resize(w, h) {
      camera.aspect = w / h;
      const t = Math.tan((camera.fov * Math.PI) / 360);
      const dist = Math.max(half.h / t, half.w / (t * camera.aspect));
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    },
    frame(time, dt) {
      const still = reducedMotion();
      if (started < 0) started = time;
      let moving = false;

      if (still) drawn = 1;
      else if (drawn < 1) {
        drawn = clamp01(easeInOut(clamp01((time - started - 0.15) / DRAW_TIME)));
        moving = true;
      }

      const wanted = still ? 0 : unravelTarget;
      if (mode === 'hero' && Math.abs(wanted - unravel) > 0.001) {
        unravel += (wanted - unravel) * Math.min(1, dt * 7 || 1);
        if (Math.abs(wanted - unravel) < 0.002) unravel = wanted;
        (curve as FilCurve).u = unravel;
        curve.needsUpdate = true;
        curve.updateArcLengths();
        rebuild();
        moving = true;
      }
      applyDraw();

      // Léger balancement, plus l'orientation vers le pointeur.
      const sway = still ? 0 : Math.sin(time * 0.6) * 0.16;
      const spin = mode === 'tangle' && !still ? time * 0.18 : 0;
      const k = still ? 1 : Math.min(1, dt * 4 || 1);
      rot.x += (target.x - rot.x) * k;
      rot.y += (target.y - rot.y) * k;
      group.rotation.set(base.x + rot.x, base.y + rot.y + sway + spin, 0);

      stage.renderer.render(scene, camera);
      return !still || moving;
    },
  });

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || reducedMotion()) return;
    target.y = (e.clientX / window.innerWidth - 0.5) * 1.1;
    target.x = (e.clientY / window.innerHeight - 0.5) * 0.6;
    stage.wake();
  };
  const onScroll = () => {
    if (mode !== 'hero') return;
    const rect = container.getBoundingClientRect();
    // Le fil se dénoue pendant que son cadre sort par le haut de l'écran.
    unravelTarget = clamp01((90 - rect.top) / Math.max(200, rect.height * 1.4));
    stage.wake();
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  unravel = unravelTarget;
  (curve as FilCurve).u = mode === 'hero' ? unravel : 0;
  if (unravel > 0) rebuild();

  return () => {
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('scroll', onScroll);
    stage.dispose();
    geometry?.dispose();
    hullGeometry?.dispose();
    [capGeo, capHull, nodeGeo, nodeHull].forEach((g) => g.dispose());
    material.dispose();
    rim.dispose();
  };
}
