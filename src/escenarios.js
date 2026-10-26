// Escenarios: cada uno cambia piso, paredes, cielo, luces y qué tan resbaloso o rebotón es.
import * as THREE from "three";

function textura(dibujar, rx = 1, ry = 1, tam = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = tam;
  const x = c.getContext("2d");
  dibujar(x, tam);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
// azar con semilla para que la textura salga igual en todos los dispositivos
function azar(semilla) { let s = semilla; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

const pisoHielo = () => textura((x, n) => {
  const r = azar(7);
  x.fillStyle = "#e9f4ff"; x.fillRect(0, 0, n, n);
  for (let i = 0; i < 70; i++) {
    x.strokeStyle = r() < 0.5 ? "rgba(255,255,255,.8)" : "rgba(120,170,220,.18)";
    x.lineWidth = 0.5 + r() * 1.5;
    x.beginPath();
    const a = r() * n, b = r() * n;
    x.moveTo(a, b);
    x.quadraticCurveTo(a + (r() - 0.5) * 200, b + (r() - 0.5) * 200, a + (r() - 0.5) * 300, b + (r() - 0.5) * 300);
    x.stroke();
  }
}, 2, 3);

const pisoMadera = () => textura((x, n) => {
  const r = azar(11), tablas = 6, w = n / tablas;
  for (let i = 0; i < tablas; i++) {
    const tono = 150 + r() * 40;
    x.fillStyle = `rgb(${tono + 40},${tono - 10},${tono - 70})`;
    x.fillRect(i * w, 0, w, n);
    for (let k = 0; k < 18; k++) {
      x.strokeStyle = `rgba(90,50,20,${0.08 + r() * 0.12})`;
      x.lineWidth = 1 + r() * 2;
      x.beginPath();
      const cx = i * w + r() * w;
      x.moveTo(cx, 0);
      for (let y = 0; y <= n; y += 32) x.lineTo(cx + Math.sin(y / 60 + k) * 4, y);
      x.stroke();
    }
    x.fillStyle = "rgba(60,30,10,.55)";
    x.fillRect(i * w, 0, 2, n);
    x.fillRect(i * w, r() * n, w, 2);
  }
}, 3, 4);

const pisoPatio = () => textura((x, n) => {
  const r = azar(23);
  x.fillStyle = "#c9c5bd"; x.fillRect(0, 0, n, n);
  for (let i = 0; i < 9000; i++) {
    const g = 150 + r() * 80;
    x.fillStyle = `rgba(${g},${g},${g - 6},.35)`;
    x.fillRect(r() * n, r() * n, 2, 2);
  }
  x.strokeStyle = "rgba(80,78,72,.35)"; x.lineWidth = 3;
  x.strokeRect(0, 0, n, n);
  x.strokeStyle = "rgba(70,68,62,.4)"; x.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) {
    x.beginPath();
    let a = r() * n, b = r() * n;
    x.moveTo(a, b);
    for (let j = 0; j < 6; j++) { a += (r() - 0.5) * 70; b += r() * 50; x.lineTo(a, b); }
    x.stroke();
  }
}, 3, 4);

const pisoNeon = () => textura((x, n) => {
  x.fillStyle = "#0e1236"; x.fillRect(0, 0, n, n);
  x.strokeStyle = "rgba(80,220,255,.35)"; x.lineWidth = 2;
  for (let i = 0; i <= n; i += n / 4) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, n); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(n, i); x.stroke();
  }
}, 4, 6);

const paredMadera = () => textura((x, n) => {
  const r = azar(5);
  for (let i = 0; i < 4; i++) {
    const tono = 95 + r() * 30;
    x.fillStyle = `rgb(${tono + 30},${tono - 10},${tono - 50})`;
    x.fillRect(0, (i * n) / 4, n, n / 4);
    x.fillStyle = "rgba(40,20,5,.5)";
    x.fillRect(0, (i * n) / 4, n, 3);
  }
}, 4, 1);

const paredLadrillo = () => textura((x, n) => {
  const r = azar(9), filas = 6, alto = n / filas, ancho = n / 4;
  x.fillStyle = "#d9d0c4"; x.fillRect(0, 0, n, n);
  for (let f = 0; f < filas; f++) {
    const off = f % 2 ? ancho / 2 : 0;
    for (let c = -1; c < 5; c++) {
      const t = 140 + r() * 40;
      x.fillStyle = `rgb(${t + 30},${t - 70},${t - 90})`;
      x.fillRect(c * ancho + off + 3, f * alto + 3, ancho - 6, alto - 6);
    }
  }
}, 6, 1);

export const ESCENARIOS = {
  hielo: {
    nombre: "Pista de hielo", desc: "Resbaloso, paredes de vidrio",
    cielo: 0xdcecff, afuera: 0xf3f8ff, pisoTex: pisoHielo,
    pared: { color: 0xcfe8ff, transparent: true, opacity: 0.42, roughness: 0.08 },
    hemi: [0xffffff, 0xbcd4ff, 1.1], sol: [0xffffff, 2.2],
    friccion: 0.2, rebotePiso: 0.25, rebotePared: 0.55,
    circulo: 0x2f9bff, raya: 0xff5c7f, guia: 0x1b2a4a, tapete: 0xd9ebff,
  },
  madera: {
    nombre: "Mesa de madera", desc: "Agarre medio, bordes de madera",
    cielo: 0xf4e6d2, afuera: 0xe9d8c0, pisoTex: pisoMadera,
    pared: { color: 0xffffff, roughness: 0.7 }, paredTex: paredMadera,
    hemi: [0xfff3e2, 0xc9a77f, 1.0], sol: [0xffe9c9, 2.3],
    friccion: 0.34, rebotePiso: 0.3, rebotePared: 0.45,
    circulo: 0xffffff, raya: 0xe8333f, guia: 0x3b220f, tapete: 0xd6b48a,
  },
  patio: {
    nombre: "Patio de la escuela", desc: "Cemento con agarre, paredes de ladrillo",
    cielo: 0xcfe6fb, afuera: 0xb9b5ad, pisoTex: pisoPatio,
    pared: { color: 0xffffff, roughness: 0.9 }, paredTex: paredLadrillo,
    hemi: [0xffffff, 0x9fb7cf, 1.05], sol: [0xffffff, 2.4],
    friccion: 0.48, rebotePiso: 0.2, rebotePared: 0.35,
    circulo: 0xffffff, raya: 0xffe14d, guia: 0xffffff, tapete: 0xb7b2a9,
  },
  neon: {
    nombre: "Arcade neón", desc: "De noche, paredes que rebotan fuerte",
    cielo: 0x0b0d26, afuera: 0x0a0c22, pisoTex: pisoNeon,
    pared: { color: 0x1b1f4d, emissive: 0xff3dbb, emissiveIntensity: 0.7, roughness: 0.3 },
    hemi: [0x8aa0ff, 0x1a1040, 0.55], sol: [0xc7b8ff, 1.2],
    friccion: 0.26, rebotePiso: 0.32, rebotePared: 0.85,
    circulo: 0x52e5ff, raya: 0xff3dbb, guia: 0x52e5ff, tapete: 0x1a1f55,
  },
};

const cacheTex = {};
export function texturaDe(clave, tipo) {
  const k = clave + ":" + tipo;
  const e = ESCENARIOS[clave];
  const fn = tipo === "piso" ? e.pisoTex : e.paredTex;
  if (!fn) return null;
  return (cacheTex[k] ??= fn());
}
