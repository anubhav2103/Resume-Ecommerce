import { createScene, particles } from './scene-base.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* E-commerce: wireframe globe with shipping arcs & moving parcels, floating parcels, warehouse grid */
function parcelTexture(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 256, 256); grd.addColorStop(0, '#f6a25a'); grd.addColorStop(1, '#c8742f');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(255,240,210,.85)'; g.fillRect(112, 0, 32, 256);
  g.fillStyle = 'rgba(90,40,10,.35)'; g.fillRect(28, 176, 70, 44);
  g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 9; i++) g.fillRect(34 + i * 7, 184, i % 2 ? 2 : 4, 28);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

createScene(ctx => {
  const { THREE, scene, renderer, camera, state } = ctx;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const l1 = new THREE.PointLight(0xff7ab6, 320, 120); l1.position.set(14, 10, 18); scene.add(l1);
  const l2 = new THREE.PointLight(0x7c5cff, 320, 120); l2.position.set(-16, -6, 12); scene.add(l2);

  const hero = new THREE.Group(); scene.add(hero);
  const R = 7;

  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.97, 64, 64),
    new THREE.MeshStandardMaterial({ color: 0x1a0f3d, emissive: 0x3b1d8f, emissiveIntensity: 0.35, metalness: 0.4, roughness: 0.5 }));
  const wire = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0xa78bfa, wireframe: true, transparent: true, opacity: 0.22 }));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.18, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xff7ab6, transparent: true, opacity: 0.06, side: THREE.BackSide, blending: THREE.AdditiveBlending }));
  const globe = new THREE.Group(); globe.add(core, wire, halo); hero.add(globe);

  // City dots on the globe surface
  const cities = Array.from({ length: 26 }, () => new THREE.Vector3().randomDirection().multiplyScalar(R));
  const cityPts = new THREE.Points(new THREE.BufferGeometry().setFromPoints(cities),
    new THREE.PointsMaterial({ color: 0xffd166, size: 0.5, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  globe.add(cityPts);

  // Shipping arcs with parcels travelling along them
  const parcelMat = new THREE.MeshStandardMaterial({ map: parcelTexture(THREE), metalness: 0.1, roughness: 0.6 });
  const arcs = [];
  for (let i = 0; i < 12; i++) {
    const a = cities[i], b = cities[(i * 7 + 5) % cities.length];
    const mid = a.clone().add(b).multiplyScalar(0.5); mid.setLength(R + 2 + a.distanceTo(b) * 0.35);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)),
      new THREE.LineBasicMaterial({ color: i % 2 ? 0xff7ab6 : 0x22d3ee, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }));
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), parcelMat);
    globe.add(line, box);
    arcs.push({ curve, box, p: Math.random(), v: 0.12 + Math.random() * 0.12 });
  }

  // Floating parcels around the scene
  const pGeo = new THREE.BoxGeometry(1, 1, 1);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.6 });
  const floaters = Array.from({ length: state.isMobile ? 8 : 18 }, () => {
    const m = new THREE.Mesh(pGeo, parcelMat);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(pGeo), edgeMat));
    const s = 0.8 + Math.random() * 1.6; m.scale.setScalar(s);
    const side = Math.random() < 0.5 ? -1 : 1;
    m.position.set(side * (22 + Math.random() * 40), (Math.random() - 0.5) * 60, -25 - Math.random() * 40);
    m.userData = { r: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.8), p: Math.random() * 10, y: m.position.y };
    scene.add(m); return m;
  });

  // Orbiting "order" ring
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(R + 3.5, 0.05, 12, 220),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
  orbit.rotation.x = 1.2; hero.add(orbit);
  const sat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), parcelMat); hero.add(sat);

  // Warehouse floor grid
  const grid = new THREE.GridHelper(220, 60, 0x7c5cff, 0x7c5cff);
  grid.material.transparent = true; grid.material.opacity = 0.12; grid.position.y = -22; scene.add(grid);

  const dust = particles(THREE, { count: state.isMobile ? 450 : 1200, spread: 130, colors: [0xff7ab6, 0x7c5cff, 0x22d3ee, 0xffd166], size: 0.3 });
  scene.add(dust);

  const layout = () => {
    if (state.isMobile) { hero.userData.baseX = 7; hero.userData.baseY = 14; hero.scale.setScalar(0.5); }
    else { hero.userData.baseX = 13; hero.userData.baseY = 0; hero.scale.setScalar(1); }
  };
  ctx.onResize = layout; layout();

  return (t, dt) => {
    const s = state.scroll, m = state.mouse;
    globe.rotation.y += dt * 0.18; globe.rotation.x = 0.25 + m.y * 0.3;
    arcs.forEach(a => {
      a.p = (a.p + dt * a.v) % 1;
      a.box.position.copy(a.curve.getPoint(a.p)); a.box.rotation.x += dt * 2; a.box.rotation.y += dt * 2;
      a.box.scale.setScalar(Math.sin(a.p * Math.PI) * 1.2 + 0.2);
    });
    const ang = t * 0.5;
    sat.position.set(Math.cos(ang) * (R + 3.5), Math.sin(ang) * (R + 3.5) * Math.cos(1.2), Math.sin(ang) * (R + 3.5) * Math.sin(1.2));
    sat.rotation.x += dt; sat.rotation.y += dt * 1.4;
    floaters.forEach(f => {
      f.rotation.x += dt * f.userData.r.x; f.rotation.y += dt * f.userData.r.y;
      f.position.y = f.userData.y + Math.sin(t * 0.7 + f.userData.p) * 1.5;
    });
    grid.position.z = (t * 4) % (220 / 60);
    dust.rotation.y = t * 0.025;

    hero.position.x = hero.userData.baseX * Math.cos(s * Math.PI * 3);
    hero.position.y = hero.userData.baseY + Math.sin(t) * 0.5;
    hero.rotation.y = m.x * 0.4 + s * Math.PI;
    camera.position.x += (m.x * 3 - camera.position.x) * 0.05;
    camera.position.y += (m.y * 2 - s * 6 - camera.position.y) * 0.05;
    camera.lookAt(0, -s * 6, 0);
  };
});
