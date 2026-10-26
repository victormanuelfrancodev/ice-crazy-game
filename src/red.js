// Red P2P con PeerJS (WebRTC). El anfitrión es la autoridad: simula la física y reparte el estado.
// Topología en estrella: cada invitado se conecta solo con el anfitrión.

const PREFIJO = "icecrazy-v1-";
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function nuevoCodigo() {
  let c = "";
  for (let i = 0; i < 5; i++) c += LETRAS[Math.floor(Math.random() * LETRAS.length)];
  return c;
}
export const limpiarCodigo = c => (c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);

function hayPeer() {
  if (typeof window.Peer !== "function") throw new Error("No se pudo cargar la librería de red. Revisa tu conexión.");
}

export class Anfitrion {
  constructor({ alMensaje, alEntrar, alSalir }) {
    this.conexiones = new Map(); // id -> DataConnection
    this.alMensaje = alMensaje; this.alEntrar = alEntrar; this.alSalir = alSalir;
  }
  abrir(intentos = 4) {
    hayPeer();
    return new Promise((resolve, reject) => {
      const codigo = nuevoCodigo();
      const peer = new window.Peer(PREFIJO + codigo, { debug: 0 });
      peer.on("open", () => { this.peer = peer; this.codigo = codigo; this.id = peer.id; resolve(codigo); });
      peer.on("error", err => {
        if (err.type === "unavailable-id" && intentos > 0) { peer.destroy(); this.abrir(intentos - 1).then(resolve, reject); }
        else if (!this.peer) reject(new Error(traducir(err)));
      });
      peer.on("connection", conn => {
        conn.on("open", () => { this.conexiones.set(conn.peer, conn); });
        conn.on("data", msg => {
          if (msg?.t === "hola") this.alEntrar(conn.peer, msg, conn);
          else this.alMensaje(conn.peer, msg);
        });
        const fuera = () => { if (this.conexiones.delete(conn.peer)) this.alSalir(conn.peer); };
        conn.on("close", fuera);
        conn.on("error", fuera);
      });
    });
  }
  enviar(id, msg) { const c = this.conexiones.get(id); if (c?.open) c.send(msg); }
  difundir(msg) { for (const c of this.conexiones.values()) if (c.open) c.send(msg); }
  expulsar(id, msg) {
    const c = this.conexiones.get(id);
    if (!c) return;
    if (msg && c.open) c.send(msg);
    setTimeout(() => c.close(), 300);
    this.conexiones.delete(id);
  }
  cerrar() { try { this.peer?.destroy(); } catch {} this.conexiones.clear(); }
}

export class Invitado {
  constructor({ alMensaje, alCerrar }) { this.alMensaje = alMensaje; this.alCerrar = alCerrar; }
  unirse(codigo, saludo) {
    hayPeer();
    return new Promise((resolve, reject) => {
      const peer = new window.Peer({ debug: 0 });
      let listo = false;
      const t = setTimeout(() => { if (!listo) { peer.destroy(); reject(new Error("No encontré esa sala. Revisa el código.")); } }, 12000);
      peer.on("open", id => {
        this.peer = peer; this.id = id;
        const conn = peer.connect(PREFIJO + codigo, { reliable: true, serialization: "json" });
        conn.on("open", () => { listo = true; clearTimeout(t); this.conn = conn; conn.send({ t: "hola", ...saludo }); resolve(id); });
        conn.on("data", msg => this.alMensaje(msg));
        conn.on("close", () => { if (listo) this.alCerrar(); });
        conn.on("error", () => { if (listo) this.alCerrar(); });
      });
      peer.on("error", err => {
        if (!listo) { clearTimeout(t); peer.destroy(); reject(new Error(traducir(err))); }
      });
    });
  }
  enviar(msg) { if (this.conn?.open) this.conn.send(msg); }
  cerrar() { try { this.peer?.destroy(); } catch {} }
}

function traducir(err) {
  switch (err?.type) {
    case "peer-unavailable": return "No encontré esa sala. Revisa el código.";
    case "network": case "server-error": case "socket-error": return "No hay conexión con el servidor de salas. Intenta de nuevo.";
    case "browser-incompatible": return "Este navegador no permite jugar en red.";
    default: return "Algo falló con la conexión (" + (err?.type || "desconocido") + ").";
  }
}
