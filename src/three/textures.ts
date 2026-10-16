import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

function canvasTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

const FONT = '"Lilita One", "Arial Black", Arial, sans-serif';

/** Textura da touca: cor base, faixa e "FM" atrás (u = 0.25 na esfera = +Z). */
export function capTexture(base: string, stripe: string, logo: string) {
  return canvasTexture(`cap-${base}-${stripe}-${logo}`, 512, 256, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 256);
    // faixa central de frente para trás
    g.fillStyle = stripe;
    g.fillRect(0, 0, 512, 14);
    for (const u of [0.25, 0.75]) {
      g.fillRect(u * 512 - 9, 0, 18, 256);
    }
    // brilho
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, 'rgba(255,255,255,0.25)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 256);
    // logo "FM" atrás (lado +Z) e dos lados
    g.font = `bold 84px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    for (const [u, v, s] of [
      [0.25, 0.62, 1],
      [0.0, 0.62, 0.6],
      [0.5, 0.62, 0.6],
    ] as const) {
      g.save();
      g.translate(u * 512, v * 256);
      g.scale(s, s);
      g.strokeText('FM', 0, 0);
      g.fillStyle = logo;
      g.fillText('FM', 0, 0);
      g.restore();
    }
    g.save();
    g.translate(512, 0.62 * 256);
    g.scale(0.6, 0.6);
    g.fillStyle = logo;
    g.fillText('FM', 0, 0);
    g.restore();
  });
}

export function chestLogoTexture(color: string) {
  return canvasTexture(`chest-${color}`, 128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.font = `bold 70px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText('FM', 64, 68);
  });
}

/** Faixa/banner com texto. */
export function bannerTexture(text: string, bg: string, fg: string, opts: { sub?: string; w?: number; h?: number; stroke?: string } = {}) {
  const w = opts.w ?? 1024;
  const h = opts.h ?? 256;
  return canvasTexture(`banner-${text}-${bg}-${fg}-${opts.sub ?? ''}-${w}x${h}`, w, h, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, bg);
    grd.addColorStop(1, shade(bg, -0.25));
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    // ondas decorativas
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(0, h * (0.8 + i * 0.07));
      for (let x = 0; x <= w; x += 20) g.lineTo(x, h * (0.8 + i * 0.07) + Math.sin(x / 50 + i) * 8);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.fill();
    }
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = h * 0.04;
    g.strokeRect(h * 0.04, h * 0.04, w - h * 0.08, h - h * 0.08);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const size = opts.sub ? h * 0.42 : h * 0.55;
    g.font = `${size}px ${FONT}`;
    g.lineWidth = size * 0.14;
    g.strokeStyle = opts.stroke ?? 'rgba(0,0,40,0.5)';
    const y = opts.sub ? h * 0.42 : h * 0.53;
    g.strokeText(text, w / 2, y, w * 0.92);
    g.fillStyle = fg;
    g.fillText(text, w / 2, y, w * 0.92);
    if (opts.sub) {
      g.font = `${h * 0.2}px ${FONT}`;
      g.fillStyle = '#fff';
      g.fillText(opts.sub, w / 2, h * 0.76, w * 0.9);
    }
  });
}

/** Logotipo "DESAFIO FABIOLA MOLINA" em textura. */
export function logoTexture() {
  return canvasTexture('logo', 1024, 512, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, '#1c7ff0');
    grd.addColorStop(1, '#0a3e9e');
    g.fillStyle = grd;
    g.beginPath();
    g.roundRect(10, 10, 1004, 492, 60);
    g.fill();
    g.lineWidth = 16;
    g.strokeStyle = '#fff';
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const line = (t: string, y: number, size: number, fill: string) => {
      g.font = `${size}px ${FONT}`;
      g.lineJoin = 'round';
      g.lineWidth = size * 0.2;
      g.strokeStyle = '#0a2a6e';
      g.strokeText(t, 512, y);
      g.fillStyle = fill;
      g.fillText(t, 512, y);
    };
    line('DESAFIO', 120, 110, '#ffd23f');
    line('FABIOLA', 255, 170, '#ffffff');
    line('MOLINA', 395, 120, '#ffd23f');
  });
}

/** Bandeira quadriculada. */
export function checkerTexture() {
  return canvasTexture('checker', 256, 64, (g) => {
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 4; y++) {
        g.fillStyle = (x + y) % 2 ? '#111' : '#fff';
        g.fillRect(x * 16, y * 16, 16, 16);
      }
  });
}

/** Azulejos para o piso da borda da piscina. */
export function deckTileTexture() {
  const t = canvasTexture('deck', 256, 256, (g) => {
    g.fillStyle = '#eef6fb';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#c9dbe8';
    g.lineWidth = 4;
    for (let i = 0; i <= 4; i++) {
      g.beginPath();
      g.moveTo(i * 64, 0);
      g.lineTo(i * 64, 256);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i * 64);
      g.lineTo(256, i * 64);
      g.stroke();
    }
  }) as THREE.CanvasTexture;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Halo radial (brilho do sol, lua, boias neon). */
export function glowTexture() {
  return canvasTexture('glow', 128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    grd.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });
}

/** Faixa de reflexo (lua/sol) na água. */
export function streakTexture() {
  return canvasTexture('streak', 64, 256, (g) => {
    const grd = g.createLinearGradient(0, 0, 64, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.5, 'rgba(255,255,255,1)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 256);
    const v = g.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, 'rgba(0,0,0,1)');
    v.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = v;
    g.fillRect(0, 0, 64, 256);
  });
}

function shade(hex: string, k: number) {
  const c = new THREE.Color(hex);
  if (k < 0) c.lerp(new THREE.Color('#000'), -k);
  else c.lerp(new THREE.Color('#fff'), k);
  return `#${c.getHexString()}`;
}
