'use strict';

const $ = id => document.getElementById(id);
const canvas = $('card');
const ctx = canvas.getContext('2d');
let cfg, fondo = null, foto = null;

const loadImage = src => new Promise(res => {
  if (!src) return res(null);
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => res(null);
  img.src = src;
});

function formatFecha(v) {
  if (!v) return '';
  const [y, m, d] = v.split('-').map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function datos() {
  return {
    ...cfg.profesional,
    paciente: $('paciente').value.trim(),
    fecha: formatFecha($('fecha').value),
    hora: $('hora').value
  };
}

const ICONS = {
  pin: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z',
  phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  mail: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z'
};

function drawIcon(name, x, y, size, color) {
  if (!ICONS[name]) return;
  const k = size / 24;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(k, k);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(ICONS[name]));
  ctx.restore();
}

const fill = (tpl, d) => tpl.replace(/\{(\w+)\}/g, (_, k) => d[k] ?? '');

function wrap(text, maxWidth) {
  if (!maxWidth || ctx.measureText(text).width <= maxWidth) return [text];
  const lines = []; let line = '';
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxWidth && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function draw() {
  const t = cfg.tarjeta, d = datos();
  ctx.clearRect(0, 0, t.ancho, t.alto);
  if (fondo) ctx.drawImage(fondo, 0, 0, t.ancho, t.alto);
  else { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, t.ancho, t.alto); }

  if (foto && cfg.foto) {
    const { x, y, r } = cfg.foto;
    const s = Math.min(foto.width, foto.height);
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(foto, (foto.width - s) / 2, (foto.height - s) / 2, s, s, x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  ctx.textBaseline = 'alphabetic';
  const rot = (t.rotacion || 0) * Math.PI / 180;
  ctx.globalCompositeOperation = t.mezcla || 'source-over';   // 'multiply' = tinta sobre el papel
  for (const c of cfg.campos) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot != null ? c.rot * Math.PI / 180 : rot);
    const color = c.color || t.color;

    if (c.linea) {               // subrayado: {linea: largo, grosor}
      ctx.fillStyle = color;
      ctx.globalAlpha = c.alpha ?? 0.75;
      ctx.fillRect(0, 0, c.linea, c.grosor || 1.5);
      ctx.restore();
      continue;
    }

    let text = fill(c.texto, d).trim();
    if (!text || text === 'hs') { ctx.restore(); continue; }
    if (c.upper) text = text.toLocaleUpperCase('es-AR');
    let size = c.size;
    const font = sz => `${c.style || 'normal'} ${c.weight || 400} ${sz}px '${c.fuente || t.fuente}', sans-serif`;
    ctx.font = font(size);
    if ('letterSpacing' in ctx) ctx.letterSpacing = (c.spacing || 0) + 'px';
    if (c.fit) while (ctx.measureText(text).width > c.fit && size > 10) ctx.font = font(--size);
    ctx.fillStyle = color;
    ctx.textAlign = c.align || 'left';
    if (c.icono) drawIcon(c.icono, -size * 1.4, -size * 0.35, size * 1.3, c.iconoColor || color);
    wrap(text, c.maxWidth).forEach((l, i) => ctx.fillText(l, 0, i * size * 1.2));
    ctx.restore();
  }

  ctx.globalCompositeOperation = 'source-over';

  const ok = d.paciente && d.fecha && d.hora;
  $('share').disabled = $('download').disabled = !ok;
}

const toBlob = () => new Promise(r => canvas.toBlob(r, 'image/png'));
const fileName = () => fill(cfg.archivo, datos()).replace(/[^\w\-. áéíóúñÁÉÍÓÚÑ]/g, '').replace(/\s+/g, '_');

async function download() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await toBlob());
  a.download = fileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function share() {
  const file = new File([await toBlob()], fileName(), { type: 'image/png' });
  const text = fill(cfg.mensaje, datos());
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); }
    catch (e) { if (e.name !== 'AbortError') $('msg').textContent = 'No se pudo compartir: ' + e.message; }
  } else {
    await download();
    $('msg').textContent = 'Este navegador no permite compartir imágenes: se descargó el PNG para adjuntarlo a mano.';
  }
}

async function init() {
  cfg = await (await fetch('config.json', { cache: 'no-cache' })).json();
  canvas.width = cfg.tarjeta.ancho;
  canvas.height = cfg.tarjeta.alto;
  [fondo, foto] = await Promise.all([loadImage(cfg.tarjeta.fondo), loadImage(cfg.tarjeta.foto)]);
  const specs = new Set(cfg.campos.filter(c => !c.linea).map(c => `${c.style || 'normal'} ${c.weight || 400} 40px '${c.fuente || cfg.tarjeta.fuente}'`));
  await Promise.all([...specs].map(f => document.fonts.load(f).catch(() => {})));

  $('fecha').value = new Date().toLocaleDateString('en-CA');
  ['paciente', 'fecha', 'hora'].forEach(id => $(id).addEventListener('input', draw));
  $('share').onclick = share;
  $('download').onclick = download;
  draw();

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
}

init().catch(e => { $('msg').textContent = 'Error al iniciar: ' + e.message; });
