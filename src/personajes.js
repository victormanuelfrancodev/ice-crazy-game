// Personajes de Ice Crazy: datos de los 15 cubitos y la fábrica que construye su modelo 3D y su forma física.
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// forma: cubo | torre | pastilla | lata | hex | piramide | bola | gota
export const PJS = [
  { nombre: "Frapé",     forma: "cubo",     color: 0x5cbcff, gesto: "feliz",    accesorio: "gorro",     desc: "Cubo · gorrito de lana" },
  { nombre: "Mora",      forma: "cubo",     color: 0x9a5cf2, alto: 1.6, gesto: "risa", accesorio: "corona", desc: "Cubo · corona" },
  { nombre: "Limo",      forma: "cubo",     color: 0x72e85a, alto: 1.3, gesto: "sorpresa", accesorio: "brote", desc: "Cubo · brote" },
  { nombre: "Tuna",      forma: "cubo",     color: 0xff5c85, gesto: "dormido",  accesorio: "audifonos", desc: "Cubo · audífonos" },
  { nombre: "Coco",      forma: "bola",     color: 0xeef6ff, gesto: "feliz",    accesorio: "lentes",    desc: "Bola · lentes" },
  { nombre: "Mango",     forma: "lata",     color: 0xffa43a, alto: 1.5, gesto: "risa", accesorio: "mono", desc: "Lata · moño" },
  { nombre: "Kiwi",      forma: "hex",      color: 0xb8e04a, gesto: "enojado",  accesorio: "cuernitos", desc: "Hexágono · cuernitos" },
  { nombre: "Chispa",    forma: "piramide", color: 0xffe14d, alto: 1.6, gesto: "sorpresa", accesorio: "antena", desc: "Pirámide · antena" },
  { nombre: "Menta",     forma: "torre",    color: 0x3fe0c5, alto: 2.0, gesto: "feliz", accesorio: "copa", desc: "Torre · sombrero de copa" },
  { nombre: "Uva",       forma: "bola",     color: 0x7b4dff, gesto: "guino",    accesorio: "gato",      desc: "Bola · orejas de gato" },
  { nombre: "Cereza",    forma: "pastilla", color: 0xff3b4f, alto: 0.95, gesto: "risa", accesorio: "bigote", desc: "Pastilla · bigote" },
  { nombre: "Nube",      forma: "pastilla", color: 0xbfe3ff, alto: 1.0, gesto: "dormido", accesorio: "flor", desc: "Pastilla · flor" },
  { nombre: "Horchata",  forma: "lata",     color: 0xf3e2c4, alto: 1.4, gesto: "feliz", accesorio: "cresta", desc: "Lata · cresta" },
  { nombre: "Granizo",   forma: "gota",     color: 0x8fd3ff, alto: 1.9, gesto: "sorpresa", accesorio: "unicornio", desc: "Gota · cuerno" },
  { nombre: "Tamarindo", forma: "hex",      color: 0xb5651d, alto: 1.3, gesto: "guino", accesorio: "gorra", desc: "Hexágono · gorra" },
];
export const GESTOS = ["feliz", "risa", "sorpresa", "dormido", "enojado", "guino"];

export const M = {
  blanco: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }),
  negro: new THREE.MeshStandardMaterial({ color: 0x0b0d14, roughness: 0.2 }),
  cachete: new THREE.MeshStandardMaterial({ color: 0xff7d92, roughness: 0.6 }),
  hoja: new THREE.MeshStandardMaterial({ color: 0x3fb54a, roughness: 0.5 }),
  oro: new THREE.MeshStandardMaterial({ color: 0xffc04a, metalness: 1, roughness: 0.22, side: THREE.DoubleSide }),
  lana: new THREE.MeshStandardMaterial({ color: 0xf6d860, roughness: 0.9 }),
  lanaBlanca: new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 1 }),
  plastico: new THREE.MeshStandardMaterial({ color: 0x23262f, roughness: 0.35 }),
  cojin: new THREE.MeshStandardMaterial({ color: 0xff5c7f, roughness: 0.5 }),
  mono: new THREE.MeshStandardMaterial({ color: 0xff6fae, roughness: 0.45 }),
  rojo: new THREE.MeshStandardMaterial({ color: 0xe8333f, roughness: 0.45 }),
  foco: new THREE.MeshStandardMaterial({ color: 0x9dff6a, emissive: 0x6dff3a, emissiveIntensity: 1.4 }),
  negroMate: new THREE.MeshStandardMaterial({ color: 0x1c1d24, roughness: 0.7 }),
  petalo: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
  amarillo: new THREE.MeshStandardMaterial({ color: 0xffcf33, roughness: 0.5 }),
  rosaFuerte: new THREE.MeshStandardMaterial({ color: 0xff3d8b, roughness: 0.5 }),
};
export const matHielo = color => new THREE.MeshPhysicalMaterial({
  color, transmission: 1, thickness: 1.2, roughness: 0.07, ior: 1.31,
  attenuationColor: new THREE.Color(color), attenuationDistance: 1.6,
  clearcoat: 1, clearcoatRoughness: 0.05, emissive: new THREE.Color(color), emissiveIntensity: 0.06,
});
const esfera = new THREE.SphereGeometry(1, 28, 18);
function bola(mat, r, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(esfera, mat);
  m.scale.set(r * sx, r * sy, r * sz); m.position.set(x, y, z); m.castShadow = true;
  return m;
}
export const BASE = 0.18;
const ALTOS = { cubo: 1.4, torre: 2.0, pastilla: 1.0, lata: 1.4, hex: 1.4, piramide: 1.5, bola: 1.6, gota: 1.9 };

// Describe la geometría de cada forma: ancho a cada altura, dónde está el frente y su forma física
export function formaDe(def) {
  const f = def.forma || "cubo";
  const alto = def.alto ?? ALTOS[f];
  const yc = BASE + alto / 2;
  const V = (x, y, z) => new CANNON.Vec3(x, y, z);
  switch (f) {
    case "torre": return { f, alto, yc, geo: new RoundedBoxGeometry(1.0, alto, 0.9, 5, 0.2),
      semi: () => 0.5, frente: () => 0.45, topR: 0.42, sep: 0.22,
      fis: s => [[new CANNON.Box(V(0.5 * s, (alto / 2 + BASE / 2) * s, 0.45 * s))]] };
    case "pastilla": return { f, alto, yc, geo: new RoundedBoxGeometry(1.9, alto, 1.1, 5, 0.3),
      semi: () => 0.95, frente: () => 0.55, topR: 0.75, sep: 0.32, pies: 0.6,
      fis: s => [[new CANNON.Box(V(0.95 * s, (alto / 2 + BASE / 2) * s, 0.55 * s))]] };
    case "lata": return { f, alto, yc, geo: new THREE.CylinderGeometry(0.72, 0.72, alto, 48),
      semi: () => 0.72, frente: () => 0.72, topR: 0.66, sep: 0.28,
      fis: s => [[new CANNON.Cylinder(0.72 * s, 0.72 * s, (alto + BASE) * s, 16)]] };
    case "hex": { const g = new THREE.CylinderGeometry(0.8, 0.8, alto, 6); g.rotateY(Math.PI / 6);
      return { f, alto, yc, geo: g, semi: () => 0.76, frente: () => 0.69, topR: 0.66, sep: 0.28, plano: true,
        fis: s => [[new CANNON.Cylinder(0.8 * s, 0.8 * s, (alto + BASE) * s, 6)]] }; }
    case "piramide": { const rt = 0.36, rb = 1.0;
      const g = new THREE.CylinderGeometry(rt, rb, alto, 4); g.rotateY(Math.PI / 4);
      const r = y => rb + (rt - rb) * THREE.MathUtils.clamp((y - BASE) / alto, 0, 1);
      const q = new CANNON.Quaternion(); q.setFromEuler(0, Math.PI / 4, 0);
      return { f, alto, yc, geo: g, semi: y => r(y) * 0.707, frente: y => r(y) * 0.707 + 0.02, topR: 0.26, sep: 0.24, ojo: 0.42, plano: true,
        fis: s => [[new CANNON.Cylinder(rt * s, rb * s, (alto + BASE) * s, 4), new CANNON.Vec3(), q]] }; }
    case "bola": { const r = alto / 2;
      const g = new THREE.SphereGeometry(r, 48, 32);
      const semi = y => Math.sqrt(Math.max(0.01, r * r - (y - yc) ** 2));
      return { f, alto, yc, geo: g, semi, frente: y => semi(y) - 0.01, topR: 0.55, sep: 0.27, ojo: 0.58, curvo: true,
        fis: s => [[new CANNON.Sphere(r * s)]] }; }
    case "gota": { const R = 0.75, cy = BASE + R, tip = BASE + alto;
      const pts = [];
      for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + (i / 16) * (Math.PI / 2 + 0.5); pts.push(new THREE.Vector2(R * Math.cos(a), cy + R * Math.sin(a))); }
      const x0 = pts.at(-1).x, y0 = pts.at(-1).y;
      for (let k = 1; k <= 14; k++) { const t = k / 14; pts.push(new THREE.Vector2(Math.max(0.001, x0 * Math.pow(1 - t, 1.25)), y0 + (tip - y0) * t)); }
      const g = new THREE.LatheGeometry(pts, 48); g.translate(0, -yc, 0);
      const semi = y => y <= y0 ? Math.sqrt(Math.max(0.01, R * R - (y - cy) ** 2)) : x0 * Math.pow(1 - (y - y0) / (tip - y0), 1.25);
      return { f, alto, yc, geo: g, semi, frente: y => semi(y) - 0.01, topR: 0.18, sep: 0.26, ojo: (cy + 0.12 - BASE) / alto, curvo: true,
        fis: s => [[new CANNON.Sphere(R * s), new CANNON.Vec3(0, (cy - yc) * s, 0)], [new CANNON.Sphere(0.3 * s), new CANNON.Vec3(0, (tip - 0.35 - yc) * s, 0)]] }; }
    default: return { f: "cubo", alto, yc, geo: new RoundedBoxGeometry(1.4, alto, 1.29, 5, 0.24),
      semi: () => 0.7, frente: () => 0.645, topR: 0.6, sep: 0.3,
      fis: s => [[new CANNON.Box(V(0.7 * s, (alto / 2 + BASE / 2) * s, 0.645 * s))]] };
  }
}

export function crearCubito(def) {
  const { color, gesto = "feliz", accesorio = null } = def;
  const F = formaDe(def), alto = F.alto;
  const g = new THREE.Group();
  const hielo = matHielo(color);
  const cuerpo = new THREE.Mesh(F.geo, hielo);
  if (F.f !== "gota") cuerpo.position.y = F.yc; else cuerpo.position.y = F.yc;
  cuerpo.castShadow = true;
  g.add(cuerpo);

  const ojoY = BASE + alto * (F.ojo ?? 0.62);
  const sep = F.sep;
  const zEn = y => F.frente(y);
  const plano = { y: ojoY };

  // ojos
  for (const lado of [-1, 1]) {
    const ojo = new THREE.Group();
    ojo.position.set(lado * sep, ojoY, zEn(ojoY) - 0.02);
    if (gesto === "guino" && lado === -1) {
      const cerrado = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 20, Math.PI), M.negro);
      cerrado.position.z = 0.06;
      ojo.add(cerrado);
    } else {
      ojo.add(bola(M.blanco, 0.19, 0, 0, 0, 1, 1.15, 0.55));
      const mira = gesto === "dormido" ? 0 : 0.03;
      ojo.add(bola(M.negro, 0.095, mira, -0.02, 0.08, 1, 1.1, 0.5));
      ojo.add(bola(M.blanco, 0.033, mira + 0.04, 0.05, 0.13));
      if (gesto === "dormido") ojo.add(bola(new THREE.MeshStandardMaterial({ color, roughness: 0.3 }), 0.205, 0, 0.03, 0.01, 1, 0.62, 0.6));
    }
    if (gesto === "enojado") {
      const ceja = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.05), M.negro);
      ceja.position.set(0, 0.25, 0.06);
      ceja.rotation.z = lado * 0.42;
      ojo.add(ceja);
    }
    g.add(ojo);
    const cy = ojoY - 0.26;
    const cx = Math.min(sep + 0.22, F.semi(cy) - 0.14);
    g.add(bola(M.cachete, 0.09, lado * cx, cy, zEn(cy) - 0.02, 1.3, 0.8, 0.3));
  }

  // boca
  const bocaY = ojoY - (accesorio === "bigote" ? 0.38 : 0.32);
  const bz = zEn(bocaY);
  let boca;
  if (gesto === "feliz" || gesto === "dormido" || gesto === "guino") {
    const s = gesto === "dormido" ? 0.6 : 1;
    boca = new THREE.Mesh(new THREE.TorusGeometry(0.12 * s, 0.03, 10, 24, Math.PI), M.negro);
    boca.rotation.z = Math.PI; boca.position.set(0, bocaY + 0.06, bz + 0.01);
  } else if (gesto === "enojado") {
    boca = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 10, 24, Math.PI), M.negro);
    boca.position.set(0, bocaY - 0.04, bz + 0.01);
  } else if (gesto === "sorpresa") boca = bola(M.negro, 0.085, 0, bocaY, bz + 0.01, 1, 1.3, 0.4);
  else boca = bola(M.negro, 0.13, 0, bocaY, bz, 1.1, 0.7, 0.35);
  g.add(boca);

  // pies y brazos
  const px = F.pies ?? 0.35;
  for (const lado of [-1, 1]) {
    g.add(bola(hielo, 0.2, lado * px, BASE * 0.9, 0.1, 1, 0.55, 1.4));
    const by = F.f === "bola" ? F.yc - 0.1 : BASE + alto * 0.36;
    const b = bola(hielo, 0.14, lado * (F.semi(by) + 0.06), by, 0.05, 0.7, 1.5, 0.8);
    b.rotation.z = lado * 0.4;
    g.add(b);
  }

  // accesorios
  const tope = BASE + alto, R = F.topR;
  const topeEn = x => F.curvo ? F.yc + Math.sqrt(Math.max(0, (alto / 2) ** 2 - x * x)) - 0.04 : tope;
  const add = m => { m.castShadow = true; g.add(m); return m; };
  const malla = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return add(m); };

  if (accesorio === "brote") {
    malla(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), M.hoja, 0, tope + 0.12, 0);
    for (const l of [-1, 1]) { const h = bola(M.hoja, 0.14, l * 0.14, tope + 0.3, 0, 1.3, 0.6, 0.25); h.rotation.z = l * 0.5; add(h); }
  } else if (accesorio === "gorro") {
    add(bola(M.lana, R * 0.98, 0, tope - 0.05, 0, 1, 0.75, 1));
    const b = malla(new THREE.TorusGeometry(R * 0.94, 0.07, 12, 40), M.lanaBlanca, 0, tope - 0.02, 0); b.rotation.x = Math.PI / 2;
    add(bola(M.lanaBlanca, 0.13, 0, tope + R * 0.76, 0));
  } else if (accesorio === "corona") {
    malla(new THREE.CylinderGeometry(R * 0.7, R * 0.58, 0.22, 5, 1, true), M.oro, 0, tope + 0.08, 0);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; malla(new THREE.ConeGeometry(0.08, 0.2, 10), M.oro, R * 0.67 * Math.cos(a), tope + 0.28, R * 0.67 * Math.sin(a)); }
  } else if (accesorio === "audifonos") {
    const y = tope - 0.4, w = F.semi(y) + 0.06;
    malla(new THREE.TorusGeometry(w, 0.05, 10, 40, Math.PI), M.plastico, 0, y, 0);
    for (const l of [-1, 1]) { const c = malla(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 24), M.cojin, l * w, y, 0); c.rotation.z = Math.PI / 2; }
  } else if (accesorio === "lentes") {
    const z = zEn(ojoY) + 0.1;
    for (const l of [-1, 1]) malla(new THREE.TorusGeometry(0.24, 0.035, 10, 32), M.plastico, l * sep, ojoY, z);
    const puente = malla(new THREE.CylinderGeometry(0.025, 0.025, sep * 2 - 0.48, 8), M.plastico, 0, ojoY + 0.05, z);
    puente.rotation.z = Math.PI / 2;
  } else if (accesorio === "mono") {
    const cx = R * 0.45, y = tope + 0.08;
    for (const l of [-1, 1]) { const p = add(bola(M.mono, 0.17, cx + l * 0.2, y, 0.15, 1.2, 0.8, 0.45)); p.rotation.z = l * 0.35; }
    add(bola(M.mono, 0.08, cx, y, 0.18));
  } else if (accesorio === "cuernitos") {
    for (const l of [-1, 1]) { const c = malla(new THREE.ConeGeometry(0.1, 0.32, 16), M.rojo, l * R * 0.6, tope + 0.12, 0); c.rotation.z = -l * 0.35; }
  } else if (accesorio === "antena") {
    for (const l of [-1, 1]) {
      const a = malla(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), M.plastico, l * 0.14, tope + 0.22, 0); a.rotation.z = -l * 0.35;
      add(bola(M.foco, 0.09, l * 0.25, tope + 0.48, 0));
    }
  } else if (accesorio === "copa") {
    malla(new THREE.CylinderGeometry(R + 0.2, R + 0.2, 0.05, 32), M.negroMate, 0, tope + 0.03, 0);
    malla(new THREE.CylinderGeometry(R * 0.82, R * 0.82, 0.62, 32), M.negroMate, 0, tope + 0.36, 0);
    malla(new THREE.CylinderGeometry(R * 0.84, R * 0.84, 0.1, 32), M.rojo, 0, tope + 0.12, 0);
  } else if (accesorio === "gato") {
    for (const l of [-1, 1]) { const x = l * R * 0.62; const o = malla(new THREE.ConeGeometry(0.18, 0.34, 4), hielo, x, topeEn(x) + 0.12, 0); o.rotation.set(0, Math.PI / 4, -l * 0.3); }
  } else if (accesorio === "bigote") {
    for (const l of [-1, 1]) { const b = add(bola(M.negro, 0.14, l * 0.15, bocaY + 0.12, bz + 0.04, 1.4, 0.45, 0.5)); b.rotation.z = l * 0.25; }
  } else if (accesorio === "flor") {
    const cx = R * 0.55, y = tope + 0.1;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(bola(M.petalo, 0.1, cx + Math.cos(a) * 0.13, y + Math.sin(a) * 0.13, 0.12, 1, 1, 0.45)); }
    add(bola(M.amarillo, 0.07, cx, y, 0.16));
  } else if (accesorio === "cresta") {
    [0.28, 0.36, 0.32, 0.24].forEach((h, i) => malla(new THREE.ConeGeometry(0.1, h, 12), M.rosaFuerte, 0, tope + h / 2 - 0.02, 0.3 - i * 0.2));
  } else if (accesorio === "unicornio") {
    const c = malla(new THREE.ConeGeometry(0.09, 0.55, 20), M.oro, 0, tope + 0.12, 0.05);
    c.rotation.x = 0.25;
  } else if (accesorio === "gorra") {
    const casco = malla(new THREE.SphereGeometry(R * 1.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.rojo, 0, tope - 0.06, 0);
    casco.scale.y = 0.7;
    const visera = malla(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 32, 1, false, -Math.PI / 2, Math.PI), M.rojo, 0, tope - 0.04, R * 0.8);
  }
  return { g, alto, F };
}

