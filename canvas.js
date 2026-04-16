/*
  ╔═══════════════════════════════════════════════════════╗
  ║  canvas.js — Partículas encima del video              ║
  ║                                                       ║
  ║  DIFERENCIA vs versión anterior:                      ║
  ║  · El fondo del canvas ahora es TRANSPARENTE          ║
  ║    (clearRect en lugar de fillRect oscuro)            ║
  ║  · Así el video se ve debajo y los kanjis encima      ║
  ║  · Se quitaron los Orbs (ya el video da profundidad)  ║
  ║  · Se mantienen: kanjis flotantes, líneas doradas,    ║
  ║    glow del mouse y parallax del texto deco           ║
  ╚═══════════════════════════════════════════════════════╝
*/


/* ══════════════════════════════════════════════════════
    SETUP DEL CANVAS
   ══════════════════════════════════════════════════════ */
const canvas = document.getElementById('bg-canvas');
const ctx    = canvas.getContext('2d');

let W, H;
let mouse = { x: 0, y: 0 };

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);
window.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});


/* ══════════════════════════════════════════════════════
   KANJIS DISPONIBLES
   Cada partícula elige uno al azar
   ══════════════════════════════════════════════════════ */
const KANJI = ['夢','幻','影','霧','空','闇','星','風','波','心','光','命','花','雨','月','雪'];


/* ══════════════════════════════════════════════════════
   CLASE: Particle (kanjis flotantes)
   Suben desde abajo, rotan suavemente, pulsan opacidad.
   Sobre el video se ven más como espíritus flotando.
   ══════════════════════════════════════════════════════ */
class Particle {
  constructor() { this.reset(true); }

  reset(init = false) {
    this.x        = Math.random() * W;
    this.y        = init ? Math.random() * H : H + 30;
    this.size     = Math.random() * 14 + 7;
    this.speed    = Math.random() * 0.28 + 0.07;
    this.opacity  = Math.random() * 0.18 + 0.04; /* un poco más visibles sobre el video */
    this.drift    = (Math.random() - 0.5) * 0.22;
    this.char     = KANJI[Math.floor(Math.random() * KANJI.length)];
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.005;
    this.pulse    = Math.random() * Math.PI * 2;
  }

  update() {
    this.y        -= this.speed;
    this.x        += this.drift;
    this.rotation += this.rotSpeed;
    this.pulse    += 0.012;
    if (this.y < -40) this.reset();
  }

  draw() {
    const op = this.opacity * (0.8 + 0.2 * Math.sin(this.pulse));
    ctx.save();
    ctx.globalAlpha = op;
    ctx.font        = `300 ${this.size}px 'Noto Serif JP', serif`;
    ctx.fillStyle   = '#e8e0d4';
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillText(this.char, -this.size / 2, this.size / 2);
    ctx.restore();
  }
}


/* ══════════════════════════════════════════════════════
   CLASE: Line (líneas doradas)
   Segmentos diagonales que se mueven por la pantalla.
   Sobre el video dan sensación de lluvia dorada.
   ══════════════════════════════════════════════════════ */
class Line {
  constructor() { this.reset(true); }

  reset(init = false) {
    this.x       = Math.random() * W;
    this.y       = init ? Math.random() * H : Math.random() < 0.5 ? -5 : H + 5;
    this.len     = Math.random() * 55 + 15;
    this.speed   = (Math.random() * 0.35 + 0.12) * (this.y < 0 ? 1 : -1);
    this.opacity = Math.random() * 0.09 + 0.02;
    this.width   = Math.random() * 0.6 + 0.2;
    this.angle   = Math.random() * Math.PI;
  }

  update() {
    this.y += this.speed;
    if (this.speed > 0 && this.y > H + 10) this.reset();
    if (this.speed < 0 && this.y < -10)    this.reset();
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.strokeStyle = '#c9a96e';
    ctx.lineWidth   = this.width;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(
      this.x + Math.cos(this.angle) * this.len,
      this.y + Math.sin(this.angle) * this.len
    );
    ctx.stroke();
    ctx.restore();
  }
}


/* ══════════════════════════════════════════════════════
   INICIALIZACIÓN
   Menos kanjis que antes porque el video ya da vida.
   Ajusta los números si quieres más/menos densidad:
     particles → kanjis flotantes
     lines     → líneas doradas
   ══════════════════════════════════════════════════════ */
const particles = Array.from({ length: 40 }, () => new Particle());
const lines     = Array.from({ length: 22 }, () => new Line());

/* Punto suavizado que sigue al mouse (para el glow) */
const mouseOrb = { x: W / 2, y: H / 2 };


/* ══════════════════════════════════════════════════════
   PARALLAX DEL TEXTO DECORATIVO
   Cada elemento .deco-jp se mueve a distinta velocidad
   ══════════════════════════════════════════════════════ */
const djElements = [
  { el: document.getElementById('dj1'), factor: 0.018 },
  { el: document.getElementById('dj2'), factor: 0.012 },
  { el: document.getElementById('dj3'), factor: 0.022 },
];


/* ══════════════════════════════════════════════════════
   LOOP DE ANIMACIÓN (~60fps)

   CLAVE: usamos clearRect en lugar de fillRect oscuro.
   Esto borra el canvas completamente cada frame,
   dejando el fondo TRANSPARENTE → el video se ve debajo.

   Orden de dibujado:
     1. clearRect      → limpia el canvas (transparente)
     2. Glow del mouse → luz azul que sigue el cursor
     3. Líneas doradas
     4. Kanjis flotantes
   ══════════════════════════════════════════════════════ */
function loop() {
  requestAnimationFrame(loop);

  /* Suaviza el movimiento del glow hacia el cursor real */
  mouseOrb.x += (mouse.x - mouseOrb.x) * 0.05;
  mouseOrb.y += (mouse.y - mouseOrb.y) * 0.05;

  /* Limpia el canvas dejándolo transparente
     (el video del HTML se ve a través) */
  ctx.clearRect(0, 0, W, H);

  /* Glow suave que sigue al mouse */
  const mg = ctx.createRadialGradient(
    mouseOrb.x, mouseOrb.y, 0,
    mouseOrb.x, mouseOrb.y, 200
  );
  mg.addColorStop(0, 'rgba(143,163,191,0.07)');
  mg.addColorStop(1, 'rgba(143,163,191,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(0, 0, W, H);

  /* Líneas doradas */
  lines.forEach(l => { l.update(); l.draw(); });

  /* Kanjis flotantes */
  particles.forEach(p => { p.update(); p.draw(); });

  /* Parallax: mueve los .deco-jp según el cursor */
  const cx = mouse.x - W / 2;
  const cy = mouse.y - H / 2;
  djElements.forEach(({ el, factor }) => {
    el.style.transform = `translate(${cx * factor}px, ${cy * factor}px)`;
  });
}

loop();





/* CONTROLA EL REPRODUCTOR */
function toggleAudio() {
  const audio  = document.getElementById('bg-audio');
  const btn    = document.querySelector('.player-btn');
  const cover  = document.querySelector('.player-cover');

  if (audio.paused) {
    audio.play();
    btn.textContent = '■';
    cover.classList.add('playing');    /* activa la rotación */
  } else {
    audio.pause();
    btn.textContent = '▶';
    cover.classList.remove('playing'); /* detiene la rotación */
  }
}
