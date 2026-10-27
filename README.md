# Ice Crazy — Tiro de Cubitos

Juego 3D de lanzar figuritas de hielo, inspirado en los juegos de lanzar figuritas de plástico de los 90 y en las tabas. Se juega en el navegador, solo contra la computadora o en red con hasta 12 jugadores. Está en inglés (predeterminado), español y japonés; el idioma se cambia arriba a la derecha.

## Cómo se juega

1. Elige uno de los **15 cubitos**. Cada forma tiene su propia física: las bolas ruedan, las torres se caen fácil, las pirámides tienden a quedar de pie.
2. Escoge un juego:
   - **Clásico**: lánzalo al aire. Si cae de cabeza vale 10, de pie 5, de lado 3, boca arriba 1.5 y boca abajo 0.
   - **Bombardero**: saca a los cubitos del círculo. Los que saques son tuyos.
   - **La línea**: gana el cubito que quede más cerca de la raya roja.
   - **Canicas**: como en las ferias de pueblo de México. La canica rueda en línea recta, sube un tablero inclinado y cae en hoyos con números (del 1 al 20). **Las canicas se quedan en la mesa**: las que caen se quedan en su hoyo (que se ilumina con el color del dueño), un golpe fuerte de otra canica las saca, y las que fallan se quedan en el camino estorbando. Cada jugador tira 5; al final cada quien suma los hoyos donde tiene canica y gana un premio: chicle, paleta, peluche chico, peluche grande u oso gigante. Solo juegan las figuras redondas (Coco y Uva); si elegiste otra, juegas con una de ellas.
3. Escoge un escenario. Todos tienen paredes donde rebotan los cubitos:
   - **Pista de hielo**: resbalosa, con paredes de vidrio.
   - **Mesa de madera**: agarre medio.
   - **Patio de la escuela**: cemento con agarre y paredes de ladrillo.
   - **Arcade neón**: de noche, con paredes que rebotan fuerte.
4. Para lanzar, **arrastra hacia arriba y suelta**:
   - Mientras más largo el trazo, más fuerza.
   - El punto donde empiezas el trazo es desde dónde lanzas.
   - Un **trazo curvo** le da efecto al tiro.
   - Puedes elegir un tiro **bombeado**, **medio** o **rastrero** (teclas 1, 2 y 3).

## Jugar en red

Se juega desde **2 hasta 12 jugadores**.

1. Uno toca **En red → Crear sala** y comparte el código de 5 letras o el enlace.
2. Los demás eligen su cubito, escriben el código y tocan **Unirse**.
3. Todos llegan a la **sala de espera**:
   - Cada quien aparece como su cubito en 3D, con su nombre encima.
   - Cada jugador puede cambiar de cubito y tocar **Estoy listo**.
   - Cuando todos están listos empieza una cuenta regresiva de 5 segundos. El anfitrión también puede tocar **Empezar ya** si hay 2 o más jugadores.
   - El anfitrión elige el escenario y el juego, y puede agregar jugadores CPU.
4. Si alguien entra con la partida ya empezada, se queda mirando y juega en la siguiente.

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
| `src/canicas.js` | Tablero de canicas: rampa, hoyos, premios y cómo apuntar |
| `src/escenarios.js` | Escenarios: texturas, colores, luces y fricción |
| `src/i18n.js` | Textos en inglés, español y japonés |
| `src/red.js` | Salas en red con PeerJS (anfitrión e invitados) |
| `src/main.js` | Escena, física, reglas de los juegos, CPU y entrada |

## Créditos

Hecho por **Victor Manuel Franco** · [YouTube: Un dev Mexicano en Japón](https://www.youtube.com/@vicktorManuel)

### Mis otros productos

- [Historias en japonés](https://historiasenjapones.com): aprende japonés leyendo cuentos
- [Unihongo](https://unihongo.com): japonés con Mocchi, tu tutor de IA
- [KanjiGuess](https://apps.apple.com/us/app/kanjiguess/id6811568689)
- [The Hiraganas King](https://apps.apple.com/us/app/the-hiraganas-king/id1637657106)
- [Tamagowoulda](https://apps.apple.com/us/app/tamagowoulda-%E8%8B%B1%E8%AA%9E%E3%83%9A%E3%83%83%E3%83%88/id6814585506)
- [Kotozute](https://apps.apple.com/us/app/kotozute/id6807708667)
- [MeShop](https://meshop.space)
- [Todas mis apps en App Store](https://apps.apple.com/us/developer/victor-lagunas/id1592032166)

Usa [Three.js](https://threejs.org), [cannon-es](https://github.com/pmndrs/cannon-es) y [PeerJS](https://peerjs.com).
