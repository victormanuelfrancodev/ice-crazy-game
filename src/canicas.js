// Canicas de feria: un tablero inclinado con hoyos numerados al fondo.
// La canica rueda en línea recta, sube la rampa y, si va lo bastante lenta sobre un hoyo, cae en él.
import * as THREE from "three";
import * as CANNON from "cannon-es";

const ANG = THREE.MathUtils.degToRad(12);
// el borde de abajo de la rampa está en el piso, en z = Z0; sube hacia el fondo (−z)
export const TAB = {
  ang: ANG, z0: -1.5, L: 9.5, W: 8.4, grosor: 0.15,
  dir: new THREE.Vector3(0, Math.sin(ANG), -Math.cos(ANG)),   // a lo largo de la rampa, hacia arriba
  n: new THREE.Vector3(0, Math.cos(ANG), Math.sin(ANG)),      // normal de la superficie
};
export const HOYO_R = 0.58;
// tres filas de cinco; los que valen más están más arriba
const FILAS = [
  { u: 4.6, valores: [3, 1, 5, 1, 3] },
  { u: 6.2, valores: [5, 10, 2, 10, 5] },
  { u: 7.8, valores: [8, 4, 20, 4, 8] },
];
export const HOYOS = [];
for (const f of FILAS) f.valores.forEach((v, k) => HOYOS.push({ u: f.u, x: (k - 2) * 1.6, valor: v }));

// punto de la superficie a una distancia u de la orilla de abajo
export function puntoTablero(x, u, sobre = 0) {
  return new THREE.Vector3(x, 0, TAB.z0).addScaledVector(TAB.dir, u).addScaledVector(TAB.n, sobre);
}
// coordenadas de un punto del mundo en el tablero: u (a lo largo), h (altura sobre la superficie)
export function enTablero(p) {
  const rx = p.y, rz = p.z - TAB.z0;
  return { u: rx * TAB.dir.y + rz * TAB.dir.z, h: rx * TAB.n.y + rz * TAB.n.z, x: p.x };
}

// premio según la suma de la partida
const PREMIOS = [[75, "premio.5"], [50, "premio.4"], [30, "premio.3"], [15, "premio.2"], [1, "premio.1"], [0, "premio.0"]];
export const premioDe = pts => PREMIOS.find(([min]) => pts >= min)[1];

// en Canicas se lanza más cerca del tablero
export const SALIDA_Z = 3.8;
// velocidad que hace falta para llegar a cierta altura de la rampa (medido con la simulación: rampa de 12°, salida en SALIDA_Z)
const ALCANCE = [[3.1, 6], [3.7, 6.5], [4.3, 7], [5.1, 7.5], [5.7, 8], [6.5, 8.5], [7.3, 9], [8.1, 9.5], [9.0, 10]];
export function velocidadPara(u) {
  if (u <= ALCANCE[0][0]) return ALCANCE[0][1];
  for (let i = 1; i < ALCANCE.length; i++) {
    const [u1, v1] = ALCANCE[i], [u0, v0] = ALCANCE[i - 1];
    if (u <= u1) return v0 + ((u - u0) / (u1 - u0)) * (v1 - v0);
  }
  return ALCANCE.at(-1)[1];
}

// Cómo tirar para que la canica se detenga sobre un hoyo, saliendo desde x = xs.
// Subiendo la rampa frena la parte del movimiento que va hacia arriba, pero la lateral no:
// una canica en diagonal se abre de lado. Por eso se apunta un poco más cerrado.
const FRENO_RAMPA = (5 / 7) * 22 * Math.sin(ANG);   // esfera rodando: 5/7 · g · sen(ángulo)
export function apuntarHoyo(i, xs) {
  const h = HOYOS[i];
  const vSube = velocidadPara(h.u);                  // velocidad hacia adelante que hace falta
  const piso = SALIDA_Z - TAB.z0;                    // tramo plano antes de la rampa
  const enRampa = Math.sqrt(2 * FRENO_RAMPA * h.u);  // velocidad al pisar la rampa
  const tiempo = piso / (vSube * 0.94) + enRampa / FRENO_RAMPA;
  // la amortiguación también frena lo lateral: medido, solo recorre ~2/3 de lo calculado
  const vLado = ((h.x - xs) / tiempo) * 1.5;
  return { ang: Math.atan2(vLado, vSube), v: Math.hypot(vSube, vLado), valor: h.valor };
}

// ---------- física: rampa, barandales y pared del fondo ----------
export function crearCuerpos(material) {
  const cuerpos = [];
  const q = new CANNON.Quaternion(); q.setFromEuler(ANG, 0, 0);
  const caja = (sx, sy, sz, centro) => {
    const b = new CANNON.Body({ mass: 0, material, shape: new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)) });
    b.position.set(centro.x, centro.y, centro.z);
    b.quaternion.copy(q);
    cuerpos.push(b);
  };
  const { L, W, grosor } = TAB;
  caja(W, grosor * 2, L, puntoTablero(0, L / 2, -grosor));
  for (const s of [-1, 1]) caja(0.2, 1.0, L, puntoTablero(s * (W / 2 + 0.1), L / 2, 0.5));
  caja(W + 0.4, 1.6, 0.25, puntoTablero(0, L + 0.125, 0.8));
  return cuerpos;
}

// ---------- dibujo ----------
const COLOR_VALOR = { 1: "#7fd4ff", 2: "#7fd4ff", 3: "#9ff28a", 4: "#9ff28a", 5: "#ffe14d", 8: "#ffb13b", 10: "#ff7a45", 20: "#ff3d8b" };
function texturaTablero() {
  const PX = 100, c = document.createElement("canvas");
  c.width = TAB.W * PX; c.height = TAB.L * PX;
  const x = c.getContext("2d");
  // fondo de feria: azul rey con franjas
  x.fillStyle = "#1f3fb4"; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)"; x.fillRect(i * c.width / 12, 0, c.width / 12, c.height); }
  // tablero de damas en la entrada
  const cuadro = 42;
  for (let i = 0; i * cuadro < c.width; i++) for (let j = 0; j < 3; j++) {
    x.fillStyle = (i + j) % 2 ? "#ffd400" : "#e8333f";
    x.fillRect(i * cuadro, c.height - (j + 1) * cuadro, cuadro, cuadro);
  }
  // marco
  x.strokeStyle = "#ffd400"; x.lineWidth = 16; x.strokeRect(8, 8, c.width - 16, c.height - 16);
  x.strokeStyle = "#ff3d8b"; x.lineWidth = 6; x.strokeRect(26, 26, c.width - 52, c.height - 52);
  // estrellas de adorno
  x.fillStyle = "rgba(255,255,255,.55)";
  for (const [sx, sy] of [[90, 200], [740, 230], [420, 120], [130, 520], [710, 560]]) estrella(x, sx, sy, 14);
  // hoyos con su número arriba
  for (const h of HOYOS) {
    const px = (h.x + TAB.W / 2) * PX, py = (TAB.L - h.u) * PX;
    x.fillStyle = COLOR_VALOR[h.valor] || "#fff";
    x.beginPath(); x.arc(px, py, HOYO_R * PX + 9, 0, Math.PI * 2); x.fill();
    const g = x.createRadialGradient(px, py - 8, 4, px, py, HOYO_R * PX);
    g.addColorStop(0, "#000"); g.addColorStop(1, "#141a33");
    x.fillStyle = g; x.beginPath(); x.arc(px, py, HOYO_R * PX, 0, Math.PI * 2); x.fill();
    x.font = "700 46px Fredoka, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    x.lineWidth = 8; x.strokeStyle = "#0d1640"; x.strokeText(String(h.valor), px, py - HOYO_R * PX - 30);
    x.fillStyle = COLOR_VALOR[h.valor] || "#fff"; x.fillText(String(h.valor), px, py - HOYO_R * PX - 30);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function estrella(x, cx, cy, r) {
  x.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.fill();
}

// papel picado: banderitas de colores con figuras recortadas
const COLORES_PAPEL = ["#ff2d87", "#ffd400", "#00b5ad", "#ff7a00", "#7b4dff", "#2fbf4f"];
function texturaPapel() {
  const c = document.createElement("canvas"); c.width = 128; c.height = 160;
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, 128, 140);
  for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(i * 16, 140); x.lineTo(i * 16 + 8, 158); x.lineTo(i * 16 + 16, 140); x.fill(); }
  x.globalCompositeOperation = "destination-out";
  x.beginPath(); x.arc(64, 62, 22, 0, Math.PI * 2); x.fill();
  for (const [cx, cy] of [[24, 28], [104, 28], [24, 104], [104, 104]]) { x.beginPath(); x.arc(cx, cy, 8, 0, Math.PI * 2); x.fill(); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; x.beginPath(); x.ellipse(64 + Math.cos(a) * 40, 62 + Math.sin(a) * 40, 7, 4, a, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let letrero = null;
export function pintarLetrero(texto) {
  if (!letrero) return;
  const c = letrero.userData.canvas, x = c.getContext("2d");
  x.clearRect(0, 0, c.width, c.height);
  x.fillStyle = "#e8333f"; x.beginPath(); x.roundRect(8, 8, c.width - 16, c.height - 16, 40); x.fill();
  x.strokeStyle = "#ffd400"; x.lineWidth = 12; x.stroke();
  for (let i = 0; i < 18; i++) { x.fillStyle = i % 2 ? "#fff6c2" : "#ffd400"; x.beginPath(); x.arc(40 + i * ((c.width - 80) / 17), 24, 7, 0, Math.PI * 2); x.fill(); }
  x.font = '700 88px Fredoka, "M PLUS Rounded 1c", sans-serif'; x.textAlign = "center"; x.textBaseline = "middle";
  x.lineWidth = 12; x.strokeStyle = "#7a0f2a"; x.strokeText(texto, c.width / 2, c.height / 2 + 10);
  x.fillStyle = "#fff"; x.fillText(texto, c.width / 2, c.height / 2 + 10);
  letrero.material.map.needsUpdate = true;
}

export function crearTablero() {
  const g = new THREE.Group();
  const { L, W, grosor } = TAB;
  const madera = new THREE.MeshStandardMaterial({ color: 0xffd400, roughness: 0.55 });
  const rojo = new THREE.MeshStandardMaterial({ color: 0xe8333f, roughness: 0.5 });
  const sup = new THREE.MeshStandardMaterial({ map: texturaTablero(), roughness: 0.45 });
  const rampa = new THREE.Mesh(new THREE.BoxGeometry(W, grosor * 2, L), [madera, madera, sup, madera, madera, madera]);
  rampa.position.copy(puntoTablero(0, L / 2, -grosor));
  rampa.rotation.x = ANG;
  rampa.receiveShadow = true;
  g.add(rampa);
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, L), rojo);
    b.position.copy(puntoTablero(s * (W / 2 + 0.1), L / 2, 0.25));
    b.rotation.x = ANG; b.castShadow = true;
    g.add(b);
  }
  const pared = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.9, 0.25), rojo);
  pared.position.copy(puntoTablero(0, L + 0.125, 0.45));
  pared.rotation.x = ANG; pared.castShadow = true;
  g.add(pared);
  // patas que sostienen el fondo del tablero
  for (const s of [-1, 1]) {
    const arriba = puntoTablero(s * (W / 2 - 0.3), L - 0.3, -grosor * 2);
    const pata = new THREE.Mesh(new THREE.BoxGeometry(0.2, arriba.y, 0.2), madera);
    pata.position.set(arriba.x, arriba.y / 2, arriba.z);
    g.add(pata);
  }
  // aro de luz de cada hoyo, se enciende cuando cae una canica
  const luces = HOYOS.map(h => {
    const m = new THREE.Mesh(new THREE.RingGeometry(HOYO_R * 0.9, HOYO_R * 1.35, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    m.position.copy(puntoTablero(h.x, h.u, 0.02));
    m.rotation.x = ANG - Math.PI / 2;
    g.add(m);
    return m;
  });
  g.userData.luces = luces;
  // letrero arriba de la pared
  const c = document.createElement("canvas"); c.width = 768; c.height = 200;
  letrero = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.35), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  letrero.material.map.colorSpace = THREE.SRGBColorSpace;
  letrero.userData.canvas = c;
  const tope = puntoTablero(0, L + 0.2, 0);
  letrero.position.set(0, tope.y + 1.5, tope.z - 0.15);
  g.add(letrero);
  // dos tiras de papel picado
  const texPapel = texturaPapel(), banderas = [];
  for (const [z, y, n] of [[tope.z - 0.4, tope.y + 3.1, 13]]) {
    const ancho = (W + 3) / (n - 1);
    for (let i = 0; i < n; i++) {
      const xx = -(W + 3) / 2 + i * ancho, k = (i / (n - 1)) * 2 - 1;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.78), new THREE.MeshBasicMaterial({ map: texPapel, color: COLORES_PAPEL[i % COLORES_PAPEL.length], transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 }));
      b.position.set(xx, y - (1 - k * k) * 0.5 - 0.39, z);
      b.userData.fase = i * 0.7;
      g.add(b);
      banderas.push(b);
    }
  }
  g.userData.banderas = banderas;
  return g;
}

export function animarTablero(g, dt, t) {
  for (const b of g.userData.banderas) b.rotation.x = Math.sin(t * 2 + b.userData.fase) * 0.18;
  for (const l of g.userData.luces) {
    if (l.userData.t > 0) {
      l.userData.t -= dt;
      const k = Math.max(0, l.userData.t / 1.6);
      l.material.opacity = k;
      l.scale.setScalar(1 + (1 - k) * 0.6);
    }
  }
}
export function encenderHoyo(g, i, color) {
  const l = g.userData.luces[i];
  if (!l) return;
  l.material.color.set(color);
  l.userData.t = 1.6;
}
