// Scénario d'automatisation en volume : une commande Shopify part dans le workflow,
// qui déclenche quatre actions. Maquette isométrique ombrée en aplats, jouée une fois.
import {
  BackSide,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  type Material,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { bands, C, clamp01, createStage, easeInOut, easeOut, type BandMaterial } from './common';
import { reducedMotion } from '../motion';

const OUTLINE = 0.028;
const DURATION = 3.4;

export function mountNetwork(container: HTMLElement): () => void {
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);

  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);
  const ink = keep(new MeshBasicMaterial({ color: new Color(C.encre), side: BackSide }));
  const mat = {
    papier: keep(bands('papier')),
    sable: keep(bands('sable')),
    corail: keep(bands('corail')),
    trait: keep(bands('trait')),
    menthe: keep(bands('menthe')),
    encre: keep(bands('encre')),
    socle: keep(bands('socle')),
  };

  // Bloc arrondi avec contour encre d'épaisseur constante (coque retournée).
  const block = (w: number, h: number, d: number, r: number, m: Material, o = OUTLINE) => {
    const g = new Group();
    g.add(new Mesh(keep(new RoundedBoxGeometry(w + 2 * o, h + 2 * o, d + 2 * o, 3, r + o)), ink));
    g.add(new Mesh(keep(new RoundedBoxGeometry(w, h, d, 3, r)), m));
    return g;
  };
  const ball = (r: number, m: Material, o = OUTLINE) => {
    const g = new Group();
    g.add(new Mesh(keep(new SphereGeometry(r + o, 24, 16)), ink));
    g.add(new Mesh(keep(new SphereGeometry(r, 24, 16)), m));
    return g;
  };

  const world = new Group();
  scene.add(world);

  // Socle
  const plinth = block(9.8, 0.16, 7.2, 0.34, mat.socle);
  plinth.position.set(-0.35, -0.08, 0);
  world.add(plinth);

  // Commande Shopify : une carte, une pastille corail, deux lignes.
  const source = new Group();
  const card = block(1.7, 0.14, 1.15, 0.12, mat.papier);
  card.position.y = 0.07;
  const dot = ball(0.11, mat.corail);
  dot.position.set(-0.5, 0.24, -0.22);
  const line1 = block(0.7, 0.03, 0.09, 0.03, mat.encre, 0);
  line1.position.set(0.12, 0.16, -0.22);
  const line2 = block(1.1, 0.03, 0.09, 0.03, mat.trait, 0);
  line2.position.set(-0.08, 0.16, 0.12);
  const line3 = block(0.5, 0.03, 0.09, 0.03, mat.corail, 0);
  line3.position.set(-0.38, 0.16, 0.36);
  source.add(card, dot, line1, line2, line3);
  source.position.set(-3.55, 0, 0);
  source.scale.setScalar(1.2);
  world.add(source);

  // Le workflow : un nœud qui passe du gris au sapin.
  const hubMat = keep(bands('trait'));
  const hub = ball(0.3, hubMat);
  hub.position.set(-0.95, 0.34, 0);
  world.add(hub);

  // Quatre destinations
  const ends: Group[] = [];
  const badges: Group[] = [];
  const zs = [-2.55, -0.85, 0.85, 2.55];
  const endX = 1.95;
  zs.forEach((z, i) => {
    const g = new Group();
    g.position.set(endX, 0, z);
    g.scale.setScalar(1.22);
    const tile = block(1.25, 0.1, 1.0, 0.1, mat.papier);
    tile.position.y = 0.05;
    g.add(tile);
    if (i === 0) {
      // Tableau de suivi : une grille de cellules.
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) {
          const cell = block(0.24, 0.05, 0.18, 0.03, r === 0 ? mat.encre : c === 2 && r === 2 ? mat.menthe : mat.trait, 0);
          cell.position.set(-0.3 + c * 0.3, 0.13, -0.24 + r * 0.24);
          g.add(cell);
        }
    } else if (i === 1) {
      // Fournisseur : un colis.
      const box = block(0.62, 0.48, 0.5, 0.05, mat.sable);
      box.position.set(0, 0.34, 0);
      const tape = block(0.64, 0.02, 0.12, 0.01, mat.corail, 0);
      tape.position.set(0, 0.59, 0);
      g.add(box, tape);
    } else if (i === 2) {
      // Équipe : une bulle de messagerie.
      const bubble = block(0.8, 0.5, 0.12, 0.12, mat.papier);
      bubble.position.set(0, 0.48, 0);
      const tail = new Group();
      tail.add(new Mesh(keep(new CylinderGeometry(0, 0.11 + OUTLINE, 0.22 + OUTLINE, 3)), ink));
      tail.add(new Mesh(keep(new CylinderGeometry(0, 0.11, 0.22, 3)), mat.papier));
      tail.rotation.z = Math.PI;
      tail.position.set(-0.2, 0.18, 0);
      const l1 = block(0.5, 0.05, 0.03, 0.02, mat.encre, 0);
      l1.position.set(0, 0.55, 0.07);
      const l2 = block(0.34, 0.05, 0.03, 0.02, mat.trait, 0);
      l2.position.set(-0.08, 0.42, 0.07);
      g.add(tail, bubble, l1, l2);
    } else {
      // Client : une enveloppe.
      const env = block(0.78, 0.07, 0.52, 0.04, mat.papier);
      env.position.set(0, 0.15, 0);
      const flapL = block(0.47, 0.025, 0.05, 0.02, mat.encre, 0);
      flapL.position.set(-0.19, 0.2, -0.1);
      flapL.rotation.y = -0.6;
      const flapR = flapL.clone();
      flapR.position.x = 0.19;
      flapR.rotation.y = 0.6;
      g.add(env, flapL, flapR);
    }
    const badge = ball(0.13, keep(bands('sapin')));
    badge.position.set(0.55, 0.32, -0.42);
    badge.scale.setScalar(0.0001);
    g.add(badge);
    badges.push(badge);
    ends.push(g);
    world.add(g);
  });

  // Tubes : le fil corail jusqu'au workflow, puis quatre branches.
  const tube = (curve: CatmullRomCurve3, m: Material, r = 0.05) => {
    const g = new Group();
    g.add(new Mesh(keep(new TubeGeometry(curve, 64, r + OUTLINE * 0.8, 10)), ink));
    g.add(new Mesh(keep(new TubeGeometry(curve, 64, r, 10)), m));
    world.add(g);
    return g;
  };
  const filCurve = new CatmullRomCurve3([new Vector3(-2.5, 0.16, 0), new Vector3(-1.8, 0.32, 0), new Vector3(-1.25, 0.34, 0)]);
  tube(filCurve, mat.corail, 0.055);
  const branchMats: BandMaterial[] = [];
  const branchCurves = zs.map((z) => {
    const c = new CatmullRomCurve3([
      new Vector3(-0.66, 0.34, 0),
      new Vector3(0.05, 0.44, z * 0.5),
      new Vector3(0.75, 0.2, z),
      new Vector3(endX - 0.8, 0.12, z),
    ]);
    const m = keep(bands('trait'));
    branchMats.push(m);
    tube(c, m, 0.045);
    return c;
  });

  // Impulsions
  const filPulse = ball(0.1, mat.corail);
  const pulses = branchCurves.map(() => ball(0.085, mat.menthe));
  world.add(filPulse, ...pulses);

  const at = new Vector3();

  // État du scénario à l'instant t (0 → DURATION).
  const pose = (t: number) => {
    const pFil = clamp01((t - 0.2) / 0.8);
    filPulse.visible = pFil > 0 && pFil < 1;
    filPulse.position.copy(filCurve.getPointAt(easeInOut(pFil), at));

    const hubOn = clamp01((t - 1.0) / 0.3);
    hubMat.setTone('trait', 'sapin', hubOn);
    hub.scale.setScalar(1 + Math.sin(Math.PI * hubOn) * 0.25);

    branchCurves.forEach((curve, i) => {
      const start = 1.2 + i * 0.12;
      const lit = clamp01((t - start) / 0.25);
      branchMats[i].setTone('trait', 'sapin', lit);
      const p = clamp01((t - start) / 0.9);
      pulses[i].visible = p > 0 && p < 1;
      pulses[i].position.copy(curve.getPointAt(easeInOut(p), at));
      const arrive = clamp01((t - start - 0.9) / 0.35);
      ends[i].position.y = Math.sin(Math.PI * arrive) * 0.12;
      badges[i].scale.setScalar(Math.max(0.0001, easeOut(arrive)));
    });
    source.position.y = Math.sin(Math.PI * clamp01(t / 0.35)) * 0.1;
  };

  let startedAt = -1;
  let playing = false;
  let progress = reducedMotion() ? DURATION : 0;
  let lastSent = -1;
  const view = { yaw: 0, target: 0 };
  // Emprise à cadrer ; sur petit écran, on garde de la place à droite pour les étiquettes.
  const bounds = (narrow: boolean) =>
    [-5.25, narrow ? 6.3 : 4.6].flatMap((x) => [-0.2, 1.0].flatMap((y) => [-3.65, 3.65].map((z) => new Vector3(x, y, z))));
  let corners = bounds(false);

  const placeCamera = () => {
    const yaw = 0.2 + view.yaw;
    const dist = 20;
    camera.position.set(Math.sin(yaw) * dist - 0.35, dist * 1.05, Math.cos(yaw) * dist);
    camera.lookAt(-0.35, 0.2, 0);
    camera.updateMatrixWorld();
  };

  const fit = (w: number, h: number) => {
    corners = bounds(w < 560);
    placeCamera();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const c of corners) {
      const v = c.clone().applyMatrix4(camera.matrixWorldInverse);
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    let halfW = (maxX - minX) / 2;
    let halfH = (maxY - minY) / 2;
    const aspect = w / h;
    if (halfW / halfH > aspect) halfH = halfW / aspect;
    else halfW = halfH * aspect;
    camera.left = cx - halfW;
    camera.right = cx + halfW;
    camera.top = cy + halfH;
    camera.bottom = cy - halfH;
    camera.updateProjectionMatrix();
  };

  const labels = Array.from(container.querySelectorAll<HTMLElement>('[data-anchor]'));
  const anchors: Record<string, Vector3> = {
    source: new Vector3(-3.55, 0, 1.05),
    hub: new Vector3(-0.95, 0.9, -0.55),
    e0: new Vector3(endX + 0.95, 0.2, zs[0]),
    e1: new Vector3(endX + 0.95, 0.2, zs[1]),
    e2: new Vector3(endX + 0.95, 0.2, zs[2]),
    e3: new Vector3(endX + 0.95, 0.2, zs[3]),
  };
  const placeLabels = () => {
    for (const el of labels) {
      const a = anchors[el.dataset.anchor ?? ''];
      if (!a) continue;
      const v = a.clone().project(camera);
      const key = el.dataset.anchor ?? '';
      const shift = key.startsWith('e') ? 'translate(0, -50%)' : key === 'hub' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';
      el.style.transform = `translate(${((v.x + 1) / 2) * stage.width}px, ${((1 - v.y) / 2) * stage.height}px) ${shift}`;
    }
  };

  const stage = createStage(container, {
    resize(w, h) {
      fit(w, h);
    },
    frame(time, dt) {
      const still = reducedMotion();
      if (still) progress = DURATION;
      else if (playing) {
        if (startedAt < 0) startedAt = time;
        progress = Math.min(DURATION, time - startedAt);
        if (progress >= DURATION) playing = false;
      }
      view.yaw += (view.target - view.yaw) * (still ? 1 : Math.min(1, dt * 4 || 1));
      fit(stage.width, stage.height);
      pose(progress);
      stage.renderer.render(scene, camera);
      placeLabels();
      if (progress !== lastSent) {
        lastSent = progress;
        container.dispatchEvent(new CustomEvent('net:progress', { detail: progress }));
      }
      return playing || Math.abs(view.target - view.yaw) > 0.0005;
    },
  });

  const play = () => {
    if (reducedMotion()) return stage.wake();
    playing = true;
    startedAt = -1;
    progress = 0;
    stage.wake();
  };

  // Le scénario démarre quand la maquette est bien visible, une seule fois.
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      play();
    },
    { threshold: 0.45 },
  );
  io.observe(container);

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || reducedMotion()) return;
    const r = container.getBoundingClientRect();
    if (e.clientY < r.top - 200 || e.clientY > r.bottom + 200) return;
    view.target = ((e.clientX - r.left) / r.width - 0.5) * 0.22;
    stage.wake();
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  const replay = container.parentElement?.querySelector<HTMLButtonElement>('[data-net-replay]');
  replay?.addEventListener('click', play);

  return () => {
    io.disconnect();
    window.removeEventListener('pointermove', onPointer);
    replay?.removeEventListener('click', play);
    stage.dispose();
    disposables.forEach((d) => d.dispose());
  };
}
