// Ice Crazy — Tiro de Cubitos
// Quien tiene la autoridad (jugando solo, o el anfitrión en red) simula la física y decide puntos y turnos.
// Los invitados solo dibujan lo que llega y mandan sus tiros.
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { PJS, crearCubito, BASE } from "./personajes.js";
import { Anfitrion, Invitado, limpiarCodigo } from "./red.js";

const $ = id => document.getElementById(id);
const canvas = $("escena");
const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MAX_JUGADORES = 12;
const COLORES = ["#2f9bff", "#ff7a2f", "#1fb57a", "#a35cff", "#ff4f8b", "#d9a400", "#00a7c4", "#8a5a2b", "#5b6cff", "#e5484d", "#4c9e2f", "#c2410c"];

const MODOS = {
  clasico: { nombre: "Clásico", tiros: 5, desc: "Lánzalo al aire. De cabeza vale 10, de pie 5, de lado 3, boca arriba 1.5." },
  bombardero: { nombre: "Bombardero", tiros: 4, desc: "Saca del círculo a los cubitos. Los que saques son tuyos." },
  linea: { nombre: "La línea", tiros: 3, desc: "Gana el cubito que quede más cerca de la raya roja." },
};

// ================= RENDER =================
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdcecff);
scene.fog = new THREE.Fog(0xdcecff, 22, 48);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
const camPos = new THREE.Vector3(0, 4, 12.5), camMira = new THREE.Vector3(0, 1.4, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0xbcd4ff, 1.1));
const sol = new THREE.DirectionalLight(0xffffff, 2.2);
sol.position.set(6, 14, 8);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, far: 50 });
sol.shadow.radius = 5;
sol.shadow.bias = -0.0005;
scene.add(sol);
const contra = new THREE.DirectionalLight(0xcfe3ff, 1.2);
contra.position.set(0, 6, -12);
scene.add(contra);

const piso = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0xf3f8ff, roughness: 0.32 }));
piso.rotation.x = -Math.PI / 2;
piso.receiveShadow = true;
scene.add(piso);

const SALIDA = new THREE.Vector3(0, 0, 7.6);
const CENTRO_CIRCULO = new THREE.Vector3(0, 0, -3), RADIO = 3.4, LINEA_Z = -8;

const marcas = {};
{
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(RADIO - 0.1, RADIO + 0.08, 64), new THREE.MeshBasicMaterial({ color: 0x2f9bff, transparent: true, opacity: 0.75 }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(CENTRO_CIRCULO.x, 0.012, CENTRO_CIRCULO.z);
  g.add(ring);
  marcas.bombardero = g;
  const l = new THREE.Group();
  const raya = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.16), new THREE.MeshBasicMaterial({ color: 0xff5c7f }));
  raya.rotation.x = -Math.PI / 2; raya.position.set(0, 0.012, LINEA_Z);
  l.add(raya);
  for (let i = 1; i <= 3; i++) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.04), new THREE.MeshBasicMaterial({ color: 0x1b2a4a, transparent: true, opacity: 0.12 }));
    r.rotation.x = -Math.PI / 2; r.position.set(0, 0.011, LINEA_Z + i * 1.5);
    l.add(r);
  }
  marcas.linea = l;
  const c = new THREE.Group();
  const tapete = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.MeshStandardMaterial({ color: 0xe6f1ff, roughness: 0.9 }));
  tapete.rotation.x = -Math.PI / 2; tapete.position.set(0, 0.008, 0.5); tapete.receiveShadow = true;
  c.add(tapete);
  marcas.clasico = c;
  for (const k in marcas) { marcas[k].visible = false; scene.add(marcas[k]); }
}
const salida = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.08), new THREE.MeshBasicMaterial({ color: 0x1b2a4a, transparent: true, opacity: 0.25 }));
salida.rotation.x = -Math.PI / 2;
salida.position.set(0, 0.012, SALIDA.z - 0.5);
salida.visible = false;
scene.add(salida);

// ================= FÍSICA =================
const GRAV = 22, CURVA_SEG = 2.5;
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -GRAV, 0) });
world.allowSleep = true;
world.broadphase = new CANNON.SAPBroadphase(world);
const matPiso = new CANNON.Material("piso"), matPieza = new CANNON.Material("pieza");
world.addContactMaterial(new CANNON.ContactMaterial(matPiso, matPieza, { friction: 0.32, restitution: 0.28 }));
world.addContactMaterial(new CANNON.ContactMaterial(matPieza, matPieza, { friction: 0.25, restitution: 0.4 }));
const sueloBody = new CANNON.Body({ mass: 0, material: matPiso, shape: new CANNON.Plane() });
sueloBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(sueloBody);

// ================= PIEZAS =================
const ESC = 0.55;
const piezas = new Map(); // id -> pieza
let sigId = 1;

function crearPieza(id, pj, dueno, x, y, z) {
  const { g, alto, F } = crearCubito(PJS[pj]);
  const envoltura = new THREE.Group();
  g.scale.setScalar(ESC);
  g.position.y = -F.yc * ESC;
  envoltura.add(g);
  scene.add(envoltura);
  const body = new CANNON.Body({ mass: 1, material: matPieza, linearDamping: 0.12, angularDamping: F.curvo ? 0.35 : 0.18, sleepSpeedLimit: 0.15, sleepTimeLimit: 0.4 });
  for (const [shape, off, q] of F.fis(ESC)) body.addShape(shape, off, q);
  const he = { y: (alto / 2 + BASE / 2) * ESC };
  body.position.set(x, y ?? he.y + 0.02, z);
  if (autoridad()) world.addBody(body);
  envoltura.position.copy(body.position);
  const p = { id, pj, dueno, envoltura, body, he, marcador: null, anillo: null, objetivo: null };
  piezas.set(id, p);
  return p;
}
function quitarPieza(id) {
  const p = piezas.get(id);
  if (!p) return;
  if (p.body.world) world.removeBody(p.body);
  scene.remove(p.envoltura);
  if (p.marcador) scene.remove(p.marcador);
  if (p.anillo) scene.remove(p.anillo);
  piezas.delete(id);
}
function limpiarPiezas() { for (const id of [...piezas.keys()]) quitarPieza(id); }

const ARRIBA = new CANNON.Vec3(0, 1, 0), FRENTE = new CANNON.Vec3(0, 0, 1);
function postura(p) {
  const up = p.body.quaternion.vmult(ARRIBA), fr = p.body.quaternion.vmult(FRENTE);
  if (up.y > 0.7) return { nombre: "De pie", pts: 5 };
  if (up.y < -0.7) return { nombre: "De cabeza", pts: 10 };
  if (fr.y > 0.7) return { nombre: "Boca arriba", pts: 1.5 };
  if (fr.y < -0.7) return { nombre: "Boca abajo", pts: 0 };
  return { nombre: "De lado", pts: 3 };
}

// ================= ESTADO =================
const S = {
  pantalla: "presentacion",
  rol: null,          // solo | host | invitado
  miId: "yo",
  codigo: null,
  jugadores: [],      // {id, nombre, pj, cpu, pts, tiros, color, fuera}
  modo: "clasico",
  turno: 0,
  fase: "nada",       // apuntar | cpu | volando | pausa | fin | esperando
  xSalida: 0,
  apunta: null,
  lanzadaId: null,
  elev: "medio",
  tEspera: 0,
  cpuAjuste: {},
  numCpu: 1,
};
let red = null;
let elegido = 0;
const autoridad = () => S.rol !== "invitado";
const jugadorTurno = () => S.jugadores[S.turno];
const esMiTurno = () => S.pantalla === "juego" && S.fase === "apuntar" && jugadorTurno()?.id === S.miId;
const fmt = n => (Math.round(n * 10) / 10).toString();
const colorDe = idx => S.jugadores[idx]?.color ?? "#2f9bff";

// manda un evento a todos (y lo aplica aquí)
function emitir(msg) {
  aplicar(msg);
  if (S.rol === "host" && red) red.difundir(msg);
}

// ================= VITRINA (menú) =================
const vitrina = PJS.map((p, i) => {
  const { g } = crearCubito(p);
  g.userData.idx = i;
  g.userData.ox = i * 2.7;
  g.traverse(o => { if (o.isMesh) o.userData.idx = i; });
  scene.add(g);
  return g;
});
const aro = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.25, 48), new THREE.MeshBasicMaterial({ color: 0xffffff }));
aro.rotation.x = -Math.PI / 2; aro.position.set(0, 0.013, 1);
scene.add(aro);
const saltoVitrina = PJS.map(() => 0);

function marcar(i, sonar = true) {
  elegido = (i + PJS.length) % PJS.length;
  $("pjNombre").textContent = PJS[elegido].nombre;
  $("pjDesc").textContent = PJS[elegido].desc;
  $("pjNum").textContent = elegido + 1;
  aro.material.color.setHex(PJS[elegido].color).lerp(new THREE.Color(0xffffff), 0.3);
  saltoVitrina[elegido] = 1;
  try { localStorage.setItem("icecrazy-pj", String(elegido)); } catch {}
  if (sonar) sonido("tic");
}
$("prev").onclick = () => marcar(elegido - 1);
$("next").onclick = () => marcar(elegido + 1);
function mostrarVitrina(v) { vitrina.forEach(g => (g.visible = v)); aro.visible = v; }

// ================= PANTALLAS =================
const PANTALLAS = ["presentacion", "elegir", "sala", "fin", "creditos"];
function ir(p) {
  S.pantalla = p;
  for (const id of PANTALLAS) $(id).hidden = id !== p;
  const enJuego = p === "juego" || p === "fin";
  $("hud").hidden = !enJuego;
  $("salir").hidden = p !== "juego";
  if (!enJuego) { $("tipoTiro").hidden = true; $("ayuda").hidden = true; }
  mostrarVitrina(!enJuego);
  salida.visible = enJuego;
  for (const k in marcas) marcas[k].visible = enJuego && k === S.modo;
  if (enJuego) { camPos.set(0, 6.4, 15); camMira.set(0, 0.3, -2); }
  else { camPos.set(0, 4, 12.5); camMira.set(0, 1.4, 0); limpiarPiezas(); ocultarPrevia(); }
}

$("btnJugar").onclick = () => { activarAudio(); ir("elegir"); };
$("btnCreditos").onclick = () => ir("creditos");
$("credCerrar").onclick = () => ir("presentacion");
$("elegirVolver").onclick = () => ir("presentacion");

// pestañas
function pestana(red) {
  $("tabCpu").classList.toggle("activa", !red); $("tabCpu").setAttribute("aria-selected", String(!red));
  $("tabRed").classList.toggle("activa", red); $("tabRed").setAttribute("aria-selected", String(red));
  $("panelCpu").hidden = red; $("panelRed").hidden = !red;
}
$("tabCpu").onclick = () => pestana(false);
$("tabRed").onclick = () => pestana(true);

document.querySelectorAll("#numCpu button").forEach(b => b.onclick = () => {
  S.numCpu = +b.dataset.n;
  document.querySelectorAll("#numCpu button").forEach(x => x.classList.toggle("activo", x === b));
});

function tarjetasModo(cont, alElegir) {
  cont.innerHTML = "";
  for (const [k, m] of Object.entries(MODOS)) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "modo"; b.dataset.modo = k;
    b.append(m.nombre);
    const s = document.createElement("span"); s.textContent = m.desc; b.append(s);
    b.onclick = () => alElegir(k);
    cont.append(b);
  }
}
tarjetasModo($("modosCpu"), modo => { activarAudio(); jugarSolo(modo); });
tarjetasModo($("modosSala"), modo => { if (S.rol === "host") { S.modo = modo; publicarLobby(); } });

const nombreJugador = () => ($("nombre").value.trim() || PJS[elegido].nombre).slice(0, 14);
$("nombre").addEventListener("change", () => { try { localStorage.setItem("icecrazy-nombre", $("nombre").value.trim()); } catch {} });

function colorLibre() {
  const usados = new Set(S.jugadores.map(j => j.color));
  return COLORES.find(c => !usados.has(c)) ?? COLORES[S.jugadores.length % COLORES.length];
}
function nuevoJugador(id, nombre, pj, cpu = false) {
  return { id, nombre, pj, cpu, pts: 0, tiros: 0, color: colorLibre(), fuera: false };
}
function cpuNueva() {
  const usados = new Set(S.jugadores.map(j => j.pj));
  const libres = PJS.map((_, i) => i).filter(i => !usados.has(i));
  const pj = libres.length ? libres[Math.floor(Math.random() * libres.length)] : Math.floor(Math.random() * PJS.length);
  return nuevoJugador("cpu-" + Math.random().toString(36).slice(2, 7), PJS[pj].nombre + " (CPU)", pj, true);
}

// ---------- solo ----------
function jugarSolo(modo) {
  cerrarRed();
  S.rol = "solo"; S.miId = "yo"; S.modo = modo;
  S.jugadores = [];
  S.jugadores.push(nuevoJugador("yo", nombreJugador(), elegido));
  for (let i = 0; i < S.numCpu; i++) S.jugadores.push(cpuNueva());
  iniciarPartida();
}

// ---------- red: crear ----------
$("btnCrear").onclick = async () => {
  activarAudio();
  cerrarRed();
  const b = $("btnCrear");
  b.disabled = true; b.textContent = "Creando sala…";
  try {
    const host = new Anfitrion({ alMensaje: hostRecibe, alEntrar: hostEntra, alSalir: hostSale });
    const codigo = await host.abrir();
    red = host;
    S.rol = "host"; S.miId = host.id; S.codigo = codigo; S.modo = "clasico";
    S.jugadores = [nuevoJugador(host.id, nombreJugador(), elegido)];
    ir("sala");
    publicarLobby();
  } catch (e) {
    aviso("No se pudo crear la sala", e.message);
  } finally {
    b.disabled = false; b.textContent = "Crear sala";
  }
};

// ---------- red: unirse ----------
$("btnUnirse").onclick = unirse;
$("codigo").addEventListener("keydown", e => { if (e.key === "Enter") unirse(); });
async function unirse() {
  activarAudio();
  const codigo = limpiarCodigo($("codigo").value);
  if (codigo.length !== 5) { aviso("Escribe el código", "Son 5 letras o números"); return; }
  cerrarRed();
  const b = $("btnUnirse");
  b.disabled = true; b.textContent = "Entrando…";
  try {
    const inv = new Invitado({ alMensaje: invitadoRecibe, alCerrar: () => { if (S.rol === "invitado") { aviso("Se cerró la sala", "El anfitrión salió o se perdió la conexión"); cerrarRed(); ir("elegir"); } } });
    await inv.unirse(codigo, { nombre: nombreJugador(), pj: elegido });
    red = inv;
    S.rol = "invitado"; S.miId = inv.id; S.codigo = codigo;
    ir("sala");
    renderSala();
  } catch (e) {
    aviso("No pude entrar", e.message);
  } finally {
    b.disabled = false; b.textContent = "Unirse";
  }
}

function cerrarRed() {
  if (red) { red.cerrar(); red = null; }
  S.rol = null;
}

$("btnSalirSala").onclick = () => { cerrarRed(); ir("elegir"); };
$("btnAddCpu").onclick = () => {
  if (S.rol !== "host" || S.jugadores.length >= MAX_JUGADORES) return;
  S.jugadores.push(cpuNueva());
  publicarLobby();
};
$("btnEmpezar").onclick = () => { if (S.rol === "host") iniciarPartida(); };
$("btnCopiar").onclick = async () => {
  const url = enlaceSala();
  try { await navigator.clipboard.writeText(url); aviso("Enlace copiado"); }
  catch {
    const r = document.createRange(); r.selectNodeContents($("salaEnlace"));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    aviso("Copia el enlace seleccionado");
  }
};
const enlaceSala = () => location.origin + location.pathname + "?sala=" + S.codigo;

function publicarLobby() {
  emitir({ t: "lobby", jugadores: S.jugadores, modo: S.modo, codigo: S.codigo });
}

function renderSala() {
  $("salaCodigo").textContent = S.codigo || "-----";
  $("salaEnlace").textContent = S.codigo ? enlaceSala() : "";
  $("salaCuenta").textContent = `${S.jugadores.length}/${MAX_JUGADORES}`;
  const ul = $("salaLista");
  ul.innerHTML = "";
  S.jugadores.forEach((j, i) => {
    const li = document.createElement("li");
    const punto = document.createElement("span"); punto.className = "punto"; punto.style.background = j.color;
    const quien = document.createElement("div"); quien.className = "quien";
    const b = document.createElement("b"); b.textContent = j.nombre;
    const s = document.createElement("span"); s.textContent = PJS[j.pj].nombre + " · " + PJS[j.pj].desc;
    quien.append(b, s);
    li.append(punto, quien);
    const etq = i === 0 ? "Anfitrión" : j.cpu ? "CPU" : j.id === S.miId ? "Tú" : "";
    if (j.id === S.miId && i === 0) li.append(Object.assign(document.createElement("span"), { className: "etq", textContent: "Tú" }));
    if (etq) li.append(Object.assign(document.createElement("span"), { className: "etq", textContent: etq }));
    if (S.rol === "host" && i > 0) {
      const x = document.createElement("button");
      x.type = "button"; x.className = "quitar"; x.textContent = "✕"; x.setAttribute("aria-label", "Quitar a " + j.nombre);
      x.onclick = () => {
        if (!j.cpu) red.expulsar(j.id, { t: "rechazo", motivo: "El anfitrión te sacó de la sala." });
        S.jugadores = S.jugadores.filter(q => q !== j);
        publicarLobby();
      };
      li.append(x);
    }
    ul.append(li);
  });
  const host = S.rol === "host";
  $("salaHost").hidden = !host;
  $("salaEspera").hidden = host;
  document.querySelectorAll("#modosSala .modo").forEach(b => b.classList.toggle("activo", b.dataset.modo === S.modo));
  $("btnEmpezar").disabled = S.jugadores.length < 2;
  $("btnEmpezar").textContent = S.jugadores.length < 2 ? "Faltan jugadores" : "Empezar";
  $("btnAddCpu").disabled = S.jugadores.length >= MAX_JUGADORES;
  if (!host) $("salaEspera").textContent = `Juego elegido: ${MODOS[S.modo].nombre}. Esperando a que el anfitrión empiece…`;
}

// ---------- mensajes del anfitrión ----------
function hostEntra(id, msg) {
  if (S.pantalla !== "sala") { red.expulsar(id, { t: "rechazo", motivo: "La partida ya empezó. Entra cuando termine." }); return; }
  if (S.jugadores.length >= MAX_JUGADORES) { red.expulsar(id, { t: "rechazo", motivo: "La sala está llena." }); return; }
  const pj = Number.isInteger(msg.pj) && PJS[msg.pj] ? msg.pj : 0;
  const nombre = String(msg.nombre || PJS[pj].nombre).slice(0, 14);
  S.jugadores.push(nuevoJugador(id, nombre, pj));
  publicarLobby();
  aviso(`${nombre} entró`);
  sonido("tic");
}
function hostSale(id) {
  const j = S.jugadores.find(q => q.id === id);
  if (!j) return;
  if (S.pantalla === "sala") {
    S.jugadores = S.jugadores.filter(q => q !== j);
    publicarLobby();
    return;
  }
  j.fuera = true;
  emitir({ t: "aviso", a: `${j.nombre} se fue`, b: "" });
  if (jugadorTurno() === j && S.fase === "apuntar") {
    quitarPieza(S.lanzadaId);
    S.fase = "pausa";
    setTimeout(avanzarTurno, 600);
  }
  publicarHud();
}
function hostRecibe(id, msg) {
  const j = jugadorTurno();
  if (!j || j.id !== id || S.fase !== "apuntar") return;
  if (msg.t === "apunta") {
    S.xSalida = THREE.MathUtils.clamp(+msg.xs || 0, -2.4, 2.4);
    S.apunta = limpiarTiro(msg.tiro);
  } else if (msg.t === "tiro") {
    S.xSalida = THREE.MathUtils.clamp(+msg.xs || 0, -2.4, 2.4);
    const tiro = limpiarTiro(msg.tiro);
    if (tiro && tiro.f >= 0.06) lanzar(tiro);
  }
}
function limpiarTiro(t) {
  if (!t) return null;
  const c = (v, a, b) => THREE.MathUtils.clamp(+v || 0, a, b);
  return { ang: c(t.ang, -0.75, 0.75), f: c(t.f, 0, 1), curva: c(t.curva, -1, 1), elev: ["alto", "medio", "rastrero"].includes(t.elev) ? t.elev : "medio" };
}

// ---------- mensajes del invitado ----------
function invitadoRecibe(msg) {
  if (msg.t === "rechazo") { aviso("No pudiste entrar", msg.motivo); cerrarRed(); ir("elegir"); return; }
  if (msg.t === "est") { aplicarEstado(msg); return; }
  aplicar(msg);
}

// ================= EVENTOS (se aplican en todos) =================
let ultimoTurnoAvisado = "";
function aplicar(msg) {
  switch (msg.t) {
    case "lobby":
      S.jugadores = msg.jugadores; S.modo = msg.modo; S.codigo = msg.codigo ?? S.codigo;
      if (S.pantalla !== "sala") ir("sala");
      renderSala();
      break;
    case "inicio":
      S.modo = msg.modo; S.jugadores = msg.jugadores;
      if (!autoridad()) limpiarPiezas();
      ir("juego");
      $("hudModo").textContent = MODOS[S.modo].nombre;
      S.elev = S.modo === "linea" ? "rastrero" : "medio";
      elegirElev(S.elev);
      ultimoTurnoAvisado = "";
      break;
    case "hud":
      S.jugadores = msg.j; S.turno = msg.turno; S.lanzadaId = msg.lz;
      if (!autoridad()) S.fase = msg.fase;
      renderHud();
      break;
    case "aviso": aviso(msg.a, msg.b); if (msg.s) sonido(msg.s); break;
    case "son": sonido(msg.q); break;
    case "etiqueta": etiqueta(msg.id, msg.texto); break;
    case "cercano": marcarAnillo(msg.id); break;
    case "sacar": sacarPieza(msg.id, msg.hacia); break;
    case "fin": mostrarFin(msg); break;
  }
}

function renderHud() {
  const ul = $("chips");
  ul.innerHTML = "";
  S.jugadores.forEach((j, i) => {
    const li = document.createElement("li");
    li.className = "chip vidrio" + (i === S.turno && S.fase !== "fin" ? " turno" : "") + (j.fuera ? " fuera" : "");
    li.style.setProperty("--c", j.color);
    const p = document.createElement("span"); p.className = "punto"; p.style.background = j.color;
    const n = document.createElement("span"); n.className = "nom"; n.textContent = j.nombre;
    const b = document.createElement("b"); b.textContent = fmt(j.pts);
    li.append(p, n);
    if (j.id === S.miId) li.append(Object.assign(document.createElement("small"), { textContent: "tú" }));
    li.append(b);
    ul.append(li);
  });
  const j = jugadorTurno();
  const total = MODOS[S.modo].tiros;
  if (j && S.fase !== "fin") $("hudRonda").textContent = `Turno de ${j.nombre} · tiro ${Math.min(total, j.tiros + 1)} de ${total}`;
  const mio = esMiTurno();
  $("tipoTiro").hidden = !(mio && S.modo !== "clasico");
  $("ayuda").hidden = !mio;
  if (mio) {
    $("ayuda").textContent = S.modo === "clasico"
      ? "Arrastra hacia arriba y suelta · un trazo curvo le da efecto"
      : "Empieza el trazo a un lado para lanzar desde ahí · trazo curvo = efecto";
    const clave = S.turno + ":" + j.tiros;
    if (clave !== ultimoTurnoAvisado && S.jugadores.filter(q => !q.cpu).length > 1) { ultimoTurnoAvisado = clave; aviso("¡Te toca!"); sonido("bien"); }
  }
}

// ================= LÓGICA DE PARTIDA (solo autoridad) =================
function iniciarPartida() {
  limpiarPiezas();
  sigId = 1;
  S.cpuAjuste = {};
  for (const j of S.jugadores) { j.pts = 0; j.tiros = 0; }
  S.turno = 0;
  emitir({ t: "inicio", modo: S.modo, jugadores: S.jugadores });
  if (S.modo === "bombardero") {
    const n = Math.min(16, 6 + 2 * S.jugadores.length);
    const mezcla = PJS.map((_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3, r = i === 0 ? 0 : 0.9 + Math.random() * 1.8;
      const p = crearPieza(sigId++, mezcla[i % mezcla.length], -1, CENTRO_CIRCULO.x + Math.cos(a) * r, null, CENTRO_CIRCULO.z + Math.sin(a) * r);
      p.body.quaternion.setFromEuler(0, Math.random() * 6, 0);
    }
  }
  nuevoTurno();
}

function nuevoTurno() {
  const j = jugadorTurno();
  S.fase = j.cpu ? "cpu" : "apuntar";
  S.tEspera = 0;
  S.xSalida = 0;
  S.apunta = null;
  const p = crearPieza(sigId++, j.pj, S.turno, SALIDA.x, null, SALIDA.z);
  p.body.type = CANNON.Body.KINEMATIC;
  p.body.updateMassProperties();
  S.lanzadaId = p.id;
  publicarHud();
}

function publicarHud() {
  emitir({ t: "hud", j: S.jugadores, turno: S.turno, fase: S.fase, lz: S.lanzadaId });
}

const ELEV = { alto: THREE.MathUtils.degToRad(56), medio: THREE.MathUtils.degToRad(30), rastrero: THREE.MathUtils.degToRad(7) };
const CFG = {
  clasico: { vmin: 8, vmax: 15.5, lat: 6 },
  bombardero: { vmin: 6, vmax: 20, lat: 12 },
  linea: { vmin: 4, vmax: 20.5, lat: 12 },
};
// velocidad inicial y efecto lateral de un tiro
function calcTiro(t) {
  const c = CFG[S.modo];
  const e = S.modo === "clasico" ? THREE.MathUtils.degToRad(72) : ELEV[t.elev];
  const v = c.vmin + (c.vmax - c.vmin) * t.f;
  const h = t.ang + t.curva * 0.42;   // sale abierto hacia el lado del pandeo…
  const vh = v * Math.cos(e);
  return { vel: new THREE.Vector3(Math.sin(h) * vh, v * Math.sin(e), -Math.cos(h) * vh), aLat: -t.curva * c.lat }; // …y el efecto lo regresa
}

function lanzar(tiro) {
  const p = piezas.get(S.lanzadaId);
  if (!p) return;
  const b = p.body;
  const { vel, aLat } = calcTiro(tiro);
  b.type = CANNON.Body.DYNAMIC;
  b.mass = 1; b.updateMassProperties();
  b.wakeUp();
  b.position.x = S.xSalida;
  b.position.y += 0.3;
  b.velocity.set(vel.x, vel.y, vel.z);
  const giro = S.modo === "clasico" ? 8 + 14 * tiro.f : 2.5;
  b.angularVelocity.set((Math.random() - 0.5) * giro * 2, -tiro.curva * 9 + (Math.random() - 0.5) * giro, (Math.random() - 0.5) * giro * 2);
  p.aLat = aLat; p.tCurva = 0;
  S.fase = "volando";
  S.tEspera = 0;
  S.apunta = null;
  publicarHud();
  emitir({ t: "son", q: "lanzar" });
}

world.addEventListener("preStep", () => {
  const p = piezas.get(S.lanzadaId);
  if (!p || !p.aLat || p.body.type !== CANNON.Body.DYNAMIC) return;
  p.tCurva += 1 / 60;
  if (p.tCurva > CURVA_SEG) return;
  const v = p.body.velocity, sp = Math.hypot(v.x, v.z);
  if (sp < 0.8) return;
  p.body.applyForce(new CANNON.Vec3((-v.z / sp) * p.aLat * p.body.mass, 0, (v.x / sp) * p.aLat * p.body.mass), p.body.position);
});

function todoQuieto() {
  for (const p of piezas.values()) {
    const b = p.body;
    if (b.type !== CANNON.Body.DYNAMIC || b.sleepState === CANNON.Body.SLEEPING || b.position.y < -3) continue;
    if (b.velocity.length() > 0.12 || b.angularVelocity.length() > 0.25) return false;
  }
  return true;
}

function evaluar() {
  const j = jugadorTurno();
  const p = piezas.get(S.lanzadaId);
  if (!p) return;
  if (S.modo === "clasico") {
    const r = postura(p);
    j.pts += r.pts;
    emitir({ t: "aviso", a: r.nombre, b: `${j.nombre} +${fmt(r.pts)}`, s: r.pts >= 5 ? "bien" : r.pts > 0 ? "tic" : "mal" });
    emitir({ t: "etiqueta", id: p.id, texto: r.nombre });
  } else if (S.modo === "bombardero") {
    let sacados = 0;
    for (const q of [...piezas.values()]) {
      if (q.dueno !== -1) continue;
      const dx = q.body.position.x - CENTRO_CIRCULO.x, dz = q.body.position.z - CENTRO_CIRCULO.z;
      if (Math.hypot(dx, dz) > RADIO || q.body.position.y < -1) { sacados++; emitir({ t: "sacar", id: q.id, hacia: S.turno }); }
    }
    j.pts += sacados;
    emitir({ t: "aviso", a: sacados ? `¡Sacó ${sacados}!` : "Nada…", b: j.nombre, s: sacados ? "bien" : "mal" });
  } else {
    const d = Math.abs(p.body.position.z - LINEA_Z);
    emitir({ t: "aviso", a: `${(d * 20).toFixed(0)} cm`, b: `de la raya · ${j.nombre}`, s: d < 1 ? "bien" : "tic" });
    puntuarLinea();
  }
}

// en La línea, el cubito más cercano a la raya da 1 punto a su dueño
function puntuarLinea() {
  let mejor = null, dm = Infinity;
  for (const q of piezas.values()) {
    if (q.dueno < 0 || q.body.position.y < -1 || q.body.type !== CANNON.Body.DYNAMIC) continue;
    const d = Math.abs(q.body.position.z - LINEA_Z);
    if (d < dm) { dm = d; mejor = q; }
  }
  for (const j of S.jugadores) j.pts = 0;
  if (mejor) { S.jugadores[mejor.dueno].pts = 1; emitir({ t: "cercano", id: mejor.id }); }
  return { mejor, dm };
}

function siguiente() {
  const j = jugadorTurno();
  j.tiros++;
  const id = S.lanzadaId;
  if (S.modo !== "linea") setTimeout(() => quitarPieza(id), S.modo === "clasico" ? 1100 : 300);
  const total = MODOS[S.modo].tiros;
  const activos = S.jugadores.filter(q => !q.fuera);
  const quedanFichas = [...piezas.values()].some(q => q.dueno === -1);
  const acabo = activos.every(q => q.tiros >= total) || (S.modo === "bombardero" && !quedanFichas) || activos.length === 0;
  if (acabo) { S.fase = "fin"; publicarHud(); setTimeout(terminar, 1300); return; }
  S.fase = "pausa";
  publicarHud();
  setTimeout(avanzarTurno, S.modo === "clasico" ? 1200 : 700);
}

function avanzarTurno() {
  if (S.pantalla !== "juego") return;
  const total = MODOS[S.modo].tiros, n = S.jugadores.length;
  for (let k = 1; k <= n; k++) {
    const i = (S.turno + k) % n, j = S.jugadores[i];
    if (!j.fuera && j.tiros < total) { S.turno = i; nuevoTurno(); return; }
  }
  S.fase = "fin"; publicarHud(); terminar();
}

function terminar() {
  let detalle;
  if (S.modo === "linea") {
    const { mejor, dm } = puntuarLinea();
    detalle = mejor ? `El más cercano quedó a ${(dm * 20).toFixed(0)} cm de la raya.` : "Nadie quedó en la mesa.";
  } else if (S.modo === "bombardero") detalle = "Cada cubito sacado del círculo vale 1.";
  else detalle = "De cabeza 10 · de pie 5 · de lado 3 · boca arriba 1.5 · boca abajo 0";
  const ranking = S.jugadores.map(j => ({ nombre: j.nombre, pts: j.pts, color: j.color, id: j.id, fuera: j.fuera })).sort((a, b) => b.pts - a.pts);
  emitir({ t: "fin", ranking, detalle });
}

function mostrarFin(msg) {
  ir("fin");
  const r = msg.ranking;
  const empate = r.length > 1 && r[0].pts === r[1].pts;
  const yoGane = r[0]?.id === S.miId && !empate;
  $("finTitulo").textContent = empate ? "¡Empate!" : yoGane ? "¡Ganaste!" : `¡Ganó ${r[0]?.nombre}!`;
  const ol = $("finRanking");
  ol.innerHTML = "";
  r.forEach((j, i) => {
    const li = document.createElement("li");
    li.append(Object.assign(document.createElement("span"), { className: "pos", textContent: i + 1 }));
    const p = document.createElement("span"); p.className = "punto"; p.style.background = j.color; li.append(p);
    li.append(Object.assign(document.createElement("span"), { className: "nom", textContent: j.nombre + (j.id === S.miId ? " (tú)" : "") + (j.fuera ? " · salió" : "") }));
    li.append(Object.assign(document.createElement("b"), { textContent: fmt(j.pts) }));
    ol.append(li);
  });
  $("finDetalle").textContent = msg.detalle;
  const mando = autoridad();
  $("otraVez").hidden = !mando;
  $("aMenu").textContent = S.rol === "host" ? "Volver a la sala" : S.rol === "invitado" ? "Salir" : "Menú";
  $("finEspera").hidden = mando;
  sonido(yoGane ? "bien" : "mal");
}
$("otraVez").onclick = () => {
  if (S.rol === "host") S.jugadores = S.jugadores.filter(j => !j.fuera);
  iniciarPartida();
};
$("aMenu").onclick = () => {
  if (S.rol === "host") { S.jugadores = S.jugadores.filter(j => !j.fuera); ir("sala"); publicarLobby(); }
  else if (S.rol === "invitado") { cerrarRed(); ir("elegir"); }
  else ir("elegir");
};
$("salir").onclick = () => {
  if (S.rol === "host") { S.jugadores = S.jugadores.filter(j => !j.fuera); ir("sala"); publicarLobby(); }
  else { cerrarRed(); ir("elegir"); }
};

// ---------- CPU ----------
function turnoCpu() {
  const j = jugadorTurno();
  const tiro = { ang: 0, f: 0.6, curva: 0, elev: "medio" };
  S.xSalida = (Math.random() - 0.5) * 3.6;
  const xs = S.xSalida, zs = SALIDA.z;
  if (S.modo === "clasico") {
    tiro.ang = (Math.random() - 0.5) * 0.5;
    tiro.f = 0.3 + Math.random() * 0.7;
    tiro.curva = (Math.random() - 0.5) * 1.2;
  } else if (S.modo === "bombardero") {
    const fichas = [...piezas.values()].filter(q => q.dueno === -1);
    const t = fichas[Math.floor(Math.random() * fichas.length)]?.body.position ?? { x: 0, z: -3 };
    const d = Math.hypot(t.x - xs, t.z - zs);
    tiro.elev = Math.random() < 0.5 ? "medio" : "alto";
    tiro.ang = Math.atan2(t.x - xs, -(t.z - zs)) + (Math.random() - 0.5) * 0.12;
    const v = Math.sqrt(Math.max(1, d - (tiro.elev === "alto" ? 0.2 : 1.2)) * GRAV / Math.sin(2 * ELEV[tiro.elev]));
    tiro.f = THREE.MathUtils.clamp((v - CFG.bombardero.vmin) / (CFG.bombardero.vmax - CFG.bombardero.vmin) + (Math.random() - 0.5) * 0.08, 0.05, 1);
  } else {
    tiro.elev = "alto";
    tiro.ang = Math.atan2(-xs, -(LINEA_Z - zs)) + (Math.random() - 0.5) * 0.15;
    const d = (zs - LINEA_Z) + (S.cpuAjuste[j.id] || 0);
    const v = Math.sqrt(Math.max(1, d) * GRAV / Math.sin(2 * ELEV.alto));
    tiro.f = THREE.MathUtils.clamp((v - CFG.linea.vmin) / (CFG.linea.vmax - CFG.linea.vmin) + (Math.random() - 0.5) * 0.06, 0.05, 1);
  }
  setTimeout(() => { if (S.fase === "cpuApunta") S.apunta = tiro; }, 350);
  setTimeout(() => { if (S.fase === "cpuApunta") lanzar(tiro); }, 1150);
}

// ================= RED: ESTADO =================
let tEstado = 0;
function enviarEstado() {
  const p = [];
  for (const q of piezas.values()) {
    const b = q.body;
    p.push([q.id, q.pj, q.dueno, +b.position.x.toFixed(3), +b.position.y.toFixed(3), +b.position.z.toFixed(3),
      +b.quaternion.x.toFixed(4), +b.quaternion.y.toFixed(4), +b.quaternion.z.toFixed(4), +b.quaternion.w.toFixed(4)]);
  }
  red.difundir({ t: "est", p, xs: +S.xSalida.toFixed(3), ap: S.apunta });
}
function aplicarEstado(msg) {
  const vistos = new Set();
  for (const [id, pj, dueno, x, y, z, qx, qy, qz, qw] of msg.p) {
    vistos.add(id);
    let p = piezas.get(id);
    const nueva = !p;
    if (nueva) p = crearPieza(id, pj, dueno, x, y, z);
    p.objetivo = { pos: new THREE.Vector3(x, y, z), quat: new THREE.Quaternion(qx, qy, qz, qw) };
    p.body.position.set(x, y, z);
    p.body.quaternion.set(qx, qy, qz, qw);
    if (nueva) { p.envoltura.position.set(x, y, z); p.envoltura.quaternion.copy(p.objetivo.quat); }
  }
  for (const id of [...piezas.keys()]) if (!vistos.has(id)) quitarPieza(id);
  if (!esMiTurno() || !arrastre) {
    if (!esMiTurno()) S.xSalida = msg.xs;
    S.apunta = msg.ap;
  }
}

// ================= EFECTOS VISUALES =================
function etiqueta(id, texto) {
  const p = piezas.get(id);
  if (!p) return;
  const c = document.createElement("canvas"); c.width = 256; c.height = 72;
  const x = c.getContext("2d");
  x.fillStyle = "rgba(255,255,255,.92)"; x.beginPath(); x.roundRect(4, 4, 248, 64, 32); x.fill();
  x.fillStyle = "#1b2a4a"; x.font = "600 34px Fredoka, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(texto, 128, 38);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  sp.scale.set(1.8, 0.5, 1);
  scene.add(sp);
  if (p.marcador) scene.remove(p.marcador);
  p.marcador = sp;
}
function marcarAnillo(id) {
  for (const q of piezas.values()) if (q.anillo) { scene.remove(q.anillo); q.anillo = null; }
  const p = piezas.get(id);
  if (!p) return;
  const m = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(colorDe(p.dueno)) }));
  m.rotation.x = -Math.PI / 2;
  scene.add(m);
  p.anillo = m;
}
const volando = [];
function sacarPieza(id, hacia) {
  const p = piezas.get(id);
  if (!p) return;
  if (p.body.world) world.removeBody(p.body);
  if (p.marcador) scene.remove(p.marcador);
  piezas.delete(id);
  const n = Math.max(1, S.jugadores.length - 1);
  const x = S.jugadores.length > 1 ? -9 + (hacia / n) * 18 : -9;
  volando.push({ obj: p.envoltura, destino: new THREE.Vector3(x, 0.4, 5 + Math.random() * 2), t: 0 });
}

// ================= APUNTAR =================
const N_PUNTOS = 90;
const puntos = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }), N_PUNTOS);
puntos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
puntos.frustumCulled = false;
puntos.visible = false;
scene.add(puntos);
const aterriza = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
aterriza.rotation.x = -Math.PI / 2;
aterriza.visible = false;
scene.add(aterriza);
const _m = new THREE.Matrix4();
function ocultarPrevia() { puntos.visible = false; aterriza.visible = false; }

function previsualizar(tiro, color) {
  const p = piezas.get(S.lanzadaId);
  if (!p || !tiro) return;
  const { vel, aLat } = calcTiro(tiro);
  const pos = new THREE.Vector3(S.xSalida, p.he.y + 0.3, SALIDA.z);
  const v = vel.clone();
  const dt = 1 / 60;
  let n = 0, enAire = true, tv = 0;
  const base = new THREE.Color(color), suelo = new THREE.Color(color).lerp(new THREE.Color(0xdcecff), 0.55);
  for (let i = 0; i < 400 && n < N_PUNTOS; i++) {
    tv += dt;
    const sp = Math.hypot(v.x, v.z);
    if (aLat && tv < CURVA_SEG && sp > 0.8) { const ax = (-v.z / sp) * aLat, az = (v.x / sp) * aLat; v.x += ax * dt; v.z += az * dt; }
    if (enAire) {
      v.y -= GRAV * dt;
      pos.addScaledVector(v, dt);
      if (pos.y <= p.he.y) {
        enAire = false; pos.y = p.he.y;
        aterriza.position.set(pos.x, 0.02, pos.z);
        aterriza.material.color.copy(base);
        if (S.modo === "clasico") break;
      }
    } else {
      const s2 = Math.hypot(v.x, v.z);
      if (s2 < 0.6) break;
      const fr = Math.max(0, s2 - 7 * dt) / s2;
      v.x *= fr; v.z *= fr;
      pos.x += v.x * dt; pos.z += v.z * dt;
    }
    if (i % 3 === 0) {
      _m.makeTranslation(pos.x, enAire ? pos.y : 0.06, pos.z);
      puntos.setMatrixAt(n, _m);
      puntos.setColorAt(n, enAire ? base : suelo);
      n++;
    }
  }
  puntos.count = n;
  puntos.instanceMatrix.needsUpdate = true;
  if (puntos.instanceColor) puntos.instanceColor.needsUpdate = true;
  puntos.visible = true;
  aterriza.visible = !enAire;
}

function elegirElev(e) {
  S.elev = e;
  document.querySelectorAll("#tipoTiro button").forEach(b => b.classList.toggle("activo", b.dataset.elev === e));
  if (arrastre?.tiro) { arrastre.tiro.elev = e; previsualizar(arrastre.tiro, miColor()); }
}
document.querySelectorAll("#tipoTiro button").forEach(b => b.onclick = () => { elegirElev(b.dataset.elev); sonido("tic"); });
const miColor = () => S.jugadores.find(j => j.id === S.miId)?.color ?? "#2f9bff";

let arrastre = null, tApunta = 0;
canvas.addEventListener("pointerdown", e => {
  if (S.pantalla === "elegir" || S.pantalla === "presentacion") {
    const r = canvas.getBoundingClientRect();
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = rc.intersectObjects(vitrina.filter(v => v.visible), true)[0];
    if (hit && S.pantalla === "elegir") marcar(hit.object.userData.idx);
    return;
  }
  if (!esMiTurno()) return;
  activarAudio();
  canvas.setPointerCapture(e.pointerId);
  const r = canvas.getBoundingClientRect();
  S.xSalida = THREE.MathUtils.clamp(((e.clientX - r.left) / r.width - 0.5) * 7, -2.4, 2.4);
  arrastre = { x0: e.clientX, y0: e.clientY, camino: [{ x: e.clientX, y: e.clientY }], tiro: null };
});
canvas.addEventListener("pointermove", e => {
  if (!arrastre) return;
  if (!esMiTurno()) { arrastre = null; ocultarPrevia(); return; }
  arrastre.camino.push({ x: e.clientX, y: e.clientY });
  const dx = e.clientX - arrastre.x0, dy = e.clientY - arrastre.y0;
  const largo = Math.hypot(dx, dy);
  const escala = Math.min(innerWidth, innerHeight) * 0.45;
  let f = THREE.MathUtils.clamp(largo / escala, 0, 1);
  if (dy > -10) f = 0;
  const ang = THREE.MathUtils.clamp(Math.atan2(dx, Math.max(8, -dy)), -0.75, 0.75);
  let curva = 0;
  if (largo > 40) {
    const rx = -dy / largo, ry = dx / largo;
    let dev = 0;
    for (const q of arrastre.camino) {
      const d = (q.x - arrastre.x0) * rx + (q.y - arrastre.y0) * ry;
      if (Math.abs(d) > Math.abs(dev)) dev = d;
    }
    curva = THREE.MathUtils.clamp((dev / largo) * 3, -1, 1);
    if (Math.abs(curva) < 0.08) curva = 0;
  }
  arrastre.tiro = { ang, f, curva, elev: S.elev };
  S.apunta = f > 0.04 ? arrastre.tiro : null;
  if (S.apunta) previsualizar(arrastre.tiro, miColor()); else ocultarPrevia();
  const ahora = performance.now();
  if (S.rol === "invitado" && ahora - tApunta > 80) { tApunta = ahora; red.enviar({ t: "apunta", tiro: S.apunta, xs: S.xSalida }); }
});
function soltar() {
  if (!arrastre) return;
  const tiro = arrastre.tiro;
  arrastre = null;
  ocultarPrevia();
  if (!tiro || tiro.f < 0.06 || !esMiTurno()) { S.apunta = null; return; }
  if (S.rol === "invitado") { red.enviar({ t: "tiro", tiro, xs: S.xSalida }); S.fase = "esperando"; $("tipoTiro").hidden = true; $("ayuda").hidden = true; }
  else lanzar(tiro);
}
canvas.addEventListener("pointerup", soltar);
canvas.addEventListener("pointercancel", () => { arrastre = null; ocultarPrevia(); S.apunta = null; });
addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") return;
  if (S.pantalla === "juego" && S.modo !== "clasico" && esMiTurno()) {
    if (e.key === "1") elegirElev("alto");
    if (e.key === "2") elegirElev("medio");
    if (e.key === "3") elegirElev("rastrero");
  }
  if (S.pantalla === "elegir") {
    if (e.key === "ArrowLeft") marcar(elegido - 1);
    if (e.key === "ArrowRight") marcar(elegido + 1);
  }
  if (e.key === "Escape" && S.pantalla === "creditos") ir("presentacion");
});

// ================= AVISOS Y SONIDO =================
let tAviso;
function aviso(t, sub = "") {
  const el = $("toast");
  el.innerHTML = "";
  el.append(t);
  if (sub) { const s = document.createElement("small"); s.textContent = sub; el.append(s); }
  el.classList.remove("oculto");
  clearTimeout(tAviso);
  tAviso = setTimeout(() => el.classList.add("oculto"), sub && sub.length > 30 ? 2600 : 1400);
}
let ac = null;
function activarAudio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch { ac = null; } }
function tono(f, d, tipo = "sine", v = 0.1, slide = 0) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = tipo; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d);
}
function sonido(q) {
  if (q === "tic") tono(660, 0.07, "triangle", 0.06);
  if (q === "lanzar") tono(300, 0.18, "triangle", 0.08, 400);
  if (q === "bien") { tono(660, 0.1, "triangle"); setTimeout(() => tono(990, 0.18, "triangle"), 80); }
  if (q === "mal") tono(260, 0.3, "sine", 0.09, -120);
}

// ================= BUCLE =================
function ajustar() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.85 ? 64 : 42;
  camera.updateProjectionMatrix();
}
addEventListener("resize", ajustar);
ajustar();

const reloj = new THREE.Clock();
const mira = camMira.clone();
camera.position.copy(camPos);
let tAuto = 0;

function bucle() {
  const dt = Math.min(reloj.getDelta(), 0.05);
  const t = reloj.elapsedTime;
  const enJuego = S.pantalla === "juego" || S.pantalla === "fin";

  if (!enJuego) {
    // en la presentación el carrusel gira solo
    if (S.pantalla === "presentacion" || S.pantalla === "creditos") {
      tAuto += dt;
      if (tAuto > 2.4) { tAuto = 0; marcar(elegido + 1, false); }
    }
    const N = PJS.length;
    vitrina.forEach((v, i) => {
      const sel = i === elegido;
      let o = i - elegido;
      if (o > N / 2) o -= N;
      if (o < -N / 2) o += N;
      const ox = o * 2.7;
      if (Math.abs(ox - v.userData.ox) > 8) v.userData.ox = ox;
      v.userData.ox += (ox - v.userData.ox) * Math.min(1, dt * 8);
      v.position.x = v.userData.ox;
      v.position.z = 1 - Math.abs(v.userData.ox) * 0.25;
      v.visible = Math.abs(o) <= 3;
      saltoVitrina[i] = Math.max(0, saltoVitrina[i] - dt * 2.4);
      v.position.y = Math.sin(saltoVitrina[i] * Math.PI) * 0.9;
      const k = sel ? 1.08 : 0.9;
      const resp = reducido ? 0 : Math.sin(t * 2.2 + i) * 0.025;
      v.scale.set(k * (1 - resp * 0.5), k * (1 + resp), k * (1 - resp * 0.5));
      v.rotation.y += ((sel ? Math.sin(t * 1.5) * 0.3 : 0) - v.rotation.y) * Math.min(1, dt * 5);
    });
  }

  if (enJuego) {
    if (autoridad()) {
      world.step(1 / 60, dt, 4);
      const p = piezas.get(S.lanzadaId);
      if (p && p.body.type === CANNON.Body.KINEMATIC) {
        const b = p.body;
        b.position.y = p.he.y + 0.02 + Math.abs(Math.sin(t * 3)) * 0.12;
        b.quaternion.setFromEuler(0, Math.sin(t * 1.2) * 0.25, 0);
        b.position.x += (S.xSalida - b.position.x) * Math.min(1, dt * 14);
      }
      for (const q of piezas.values()) { q.envoltura.position.copy(q.body.position); q.envoltura.quaternion.copy(q.body.quaternion); }
      if (S.rol === "host" && red && (tEstado += dt) > 1 / 15) { tEstado = 0; enviarEstado(); }

      if (S.pantalla === "juego") {
        if (S.fase === "cpu") { S.tEspera += dt; if (S.tEspera > 0.9) { S.fase = "cpuApunta"; turnoCpu(); } }
        if (S.fase === "volando") {
          S.tEspera += dt;
          if ((S.tEspera > 0.6 && todoQuieto()) || S.tEspera > 7) {
            S.fase = "evaluando";
            const j = jugadorTurno(), lp = piezas.get(S.lanzadaId);
            if (S.modo === "linea" && j.cpu && lp) S.cpuAjuste[j.id] = (S.cpuAjuste[j.id] || 0) + (lp.body.position.z - LINEA_Z) * 0.7;
            evaluar();
            siguiente();
          }
        }
      }
    } else {
      const k = Math.min(1, dt * 14);
      for (const q of piezas.values()) if (q.objetivo) { q.envoltura.position.lerp(q.objetivo.pos, k); q.envoltura.quaternion.slerp(q.objetivo.quat, k); }
    }
    for (const q of piezas.values()) {
      if (q.marcador) q.marcador.position.set(q.envoltura.position.x, q.envoltura.position.y + 1.1, q.envoltura.position.z);
      if (q.anillo) q.anillo.position.set(q.envoltura.position.x, 0.02, q.envoltura.position.z);
    }
    // trayectoria de quien está apuntando (CPU o persona) para los que miran
    if (!arrastre) {
      if (S.apunta && (S.fase === "apuntar" || S.fase === "cpuApunta" || S.fase === "cpu")) previsualizar(S.apunta, colorDe(S.turno));
      else ocultarPrevia();
    }
  }

  for (let i = volando.length - 1; i >= 0; i--) {
    const v = volando[i];
    v.t += dt;
    v.obj.position.lerp(v.destino, Math.min(1, dt * 3));
    v.obj.position.y = v.destino.y + Math.sin(Math.min(1, v.t) * Math.PI) * 2;
    v.obj.rotation.y += dt * 6;
    if (v.t > 1.4) { scene.remove(v.obj); volando.splice(i, 1); }
  }

  camera.position.lerp(camPos, Math.min(1, dt * 3));
  mira.lerp(camMira, Math.min(1, dt * 3));
  camera.lookAt(mira);
  renderer.render(scene, camera);
  requestAnimationFrame(bucle);
}

// ================= ARRANQUE =================
try {
  const pj = +localStorage.getItem("icecrazy-pj");
  if (Number.isInteger(pj) && PJS[pj]) elegido = pj;
  $("nombre").value = localStorage.getItem("icecrazy-nombre") || "";
} catch {}
marcar(elegido, false);
ir("presentacion");
const salaUrl = limpiarCodigo(new URLSearchParams(location.search).get("sala"));
if (salaUrl.length === 5) {
  $("codigo").value = salaUrl;
  ir("elegir");
  pestana(true);
  aviso("Te invitaron a una sala", "Elige tu cubito y toca Unirse");
}
bucle();
