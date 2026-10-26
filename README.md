# Ice Crazy — Tiro de Cubitos

Juego 3D de lanzar figuritas de hielo, inspirado en los juegos de lanzar figuritas de plástico de los 90 y en las tabas. Se juega en el navegador, solo contra la computadora o en red con hasta 12 jugadores.

## Cómo se juega

1. Elige uno de los **15 cubitos**. Cada forma tiene su propia física: las bolas ruedan, las torres se caen fácil, las pirámides tienden a quedar de pie.
2. Escoge un juego:
   - **Clásico**: lánzalo al aire. Si cae de cabeza vale 10, de pie 5, de lado 3, boca arriba 1.5 y boca abajo 0.
   - **Bombardero**: saca a los cubitos del círculo. Los que saques son tuyos.
   - **La línea**: gana el cubito que quede más cerca de la raya roja.
3. Para lanzar, **arrastra hacia arriba y suelta**:
   - Mientras más largo el trazo, más fuerza.
   - El punto donde empiezas el trazo es desde dónde lanzas.
   - Un **trazo curvo** le da efecto al tiro.
   - Puedes elegir un tiro **bombeado**, **medio** o **rastrero** (teclas 1, 2 y 3).

## Jugar en red

- Uno toca **En red → Crear sala** y comparte el código de 5 letras o el enlace.
- Los demás eligen su cubito, escriben el código y tocan **Unirse**.
- El anfitrión elige el juego, puede agregar jugadores CPU y empieza la partida.

La conexión es directa entre navegadores (WebRTC con PeerJS). El anfitrión simula la física y reparte el estado a todos. En algunas redes muy cerradas, como las de oficinas o algunos datos móviles, la conexión directa puede fallar.

## Correr localmente

Son archivos estáticos, así que solo necesitas un servidor:

```bash
npx serve .
# o
python3 -m http.server 8000
```

Luego abre `http://localhost:8000`. Si lo abres directo como archivo, los módulos ES no cargan.

## Publicar en GitHub Pages

En el repo, ve a **Settings → Pages → Build and deployment**, elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`. El juego queda en `https://<usuario>.github.io/ice-crazy-game/`.

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Pantallas: presentación, elegir cubito, sala, HUD, fin y créditos |
| `src/estilos.css` | Estilos |
| `src/personajes.js` | Los 15 cubitos: modelo 3D y forma física |
| `src/red.js` | Salas en red con PeerJS (anfitrión e invitados) |
| `src/main.js` | Escena, física, reglas de los juegos, CPU y entrada |

## Créditos

- **Idea y dirección**: Victor Manuel Franco
- **Programación y modelos 3D**: Victor Manuel Franco con Claude (Anthropic)
- **Tecnología**: [Three.js](https://threejs.org), [cannon-es](https://github.com/pmndrs/cannon-es), [PeerJS](https://peerjs.com)
- **Tipografías**: Fredoka y Nunito Sans (Google Fonts)
