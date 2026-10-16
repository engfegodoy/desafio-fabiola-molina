import { useEffect, useRef } from 'react';

const COLORS = ['#ffd23f', '#ff5d4d', '#22d3ee', '#1f6fe5', '#ffffff', '#3df58a', '#ff8fc7'];

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  w: number;
  h: number;
  c: string;
  shape: number;
}

/** Confetes em canvas 2D — leve e bonito em qualquer aparelho. */
export function Confetti({ active, intensity = 1, duration }: { active: boolean; intensity?: number; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext('2d')!;
    let raf = 0;
    const parts: P[] = [];
    const start = performance.now();
    let last = start;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = cv.clientWidth * dpr;
      cv.height = cv.clientHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const spawn = (n: number, burst: boolean) => {
      const W = cv.clientWidth;
      for (let i = 0; i < n; i++) {
        parts.push({
          x: burst ? W / 2 + (Math.random() - 0.5) * 80 : Math.random() * W,
          y: burst ? cv.clientHeight * 0.45 : -20,
          vx: burst ? (Math.random() - 0.5) * 900 : (Math.random() - 0.5) * 80,
          vy: burst ? -300 - Math.random() * 700 : 80 + Math.random() * 120,
          r: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 12,
          w: 7 + Math.random() * 7,
          h: 10 + Math.random() * 8,
          c: COLORS[(Math.random() * COLORS.length) | 0],
          shape: Math.random() < 0.3 ? 1 : 0,
        });
      }
    };
    spawn(Math.round(120 * intensity), true);
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const on = activeRef.current && (!duration || now - start < duration * 1000);
      if (on && parts.length < 400 * intensity) spawn(Math.ceil(4 * intensity), false);
      g.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += 520 * dt;
        p.vx *= 0.985;
        p.vy = Math.min(p.vy, 260);
        p.x += (p.vx + Math.sin(now / 300 + i) * 30) * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        if (p.y > cv.clientHeight + 30) {
          parts.splice(i, 1);
          continue;
        }
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.r);
        g.fillStyle = p.c;
        if (p.shape) {
          g.beginPath();
          g.arc(0, 0, p.w * 0.5, 0, Math.PI * 2);
          g.fill();
        } else {
          g.scale(1, Math.cos(p.r * 2));
          g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        g.restore();
      }
      if (on || parts.length) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 z-40 h-full w-full" />;
}
