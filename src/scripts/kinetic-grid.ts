const CELL_SIZE = 56;
const INFLUENCE_RADIUS = 260;
const MAX_WARP = 22;
const LERP_SPEED = 0.08;
const DIAG = Math.SQRT1_2;

const LINE_BASE = { r: 22, g: 86, b: 148, a: 0.55 };
const LINE_ACTIVE = { r: 14, g: 78, b: 140, a: 0.95 };
const NODE_BASE = { r: 22, g: 86, b: 148, a: 0.7 };
const NODE_ACTIVE = { r: 20, g: 96, b: 168, a: 1 };
const GLOW = '20,96,168';
const RIPPLE = '43,123,196';

type Point = { x: number; y: number };
type Ripple = { x: number; y: number; radius: number; opacity: number; born: number };

function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpColor(
  base: { r: number; g: number; b: number; a: number },
  active: { r: number; g: number; b: number; a: number },
  t: number,
) {
  const r = Math.round(lerpN(base.r, active.r, t));
  const g = Math.round(lerpN(base.g, active.g, t));
  const b = Math.round(lerpN(base.b, active.b, t));
  const a = lerpN(base.a, active.a, t);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

export function mountKineticGrid() {
  const field = document.querySelector('[data-field]');
  const canvas = field?.querySelector('[data-kinetic]');
  if (!(field instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = { x: -9999, y: -9999 };
  const target = { x: -9999, y: -9999 };
  const ripples: Ripple[] = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let running = false;

  const pinAt = (x: number, y: number) => {
    const margin = 72;
    const ex = Math.min(x / margin, (width - x) / margin, 1);
    const ey = Math.min(y / margin, (height - y) / margin, 1);
    const pin = Math.max(0, ex) * Math.max(0, ey);
    return pin * pin;
  };

  const warp = (gx: number, gy: number) => {
    const pin = pinAt(gx, gy);
    const dx = gx - mouse.x;
    const dy = gy - mouse.y;
    const dist = Math.hypot(dx, dy);
    const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pin;
    let rx = 0;
    let ry = 0;

    for (const ripple of ripples) {
      const rdx = gx - ripple.x;
      const rdy = gy - ripple.y;
      const rdist = Math.hypot(rdx, rdy);
      const diff = rdist - ripple.radius;
      if (Math.abs(diff) < 55) {
        const strength = (1 - Math.abs(diff) / 55) * ripple.opacity * 18 * pin;
        const angle = Math.atan2(rdy, rdx);
        const sign = diff < 0 ? -1 : 1;
        rx += Math.cos(angle) * strength * sign * -1;
        ry += Math.sin(angle) * strength * sign * -1;
      }
    }

    if (dist < INFLUENCE_RADIUS && dist > 0 && pin > 0) {
      const t = dist / INFLUENCE_RADIUS;
      const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
      const amount = eased * MAX_WARP * pin;
      const angle = Math.atan2(dy, dx);
      return {
        pt: { x: gx - Math.cos(angle) * amount + rx, y: gy - Math.sin(angle) * amount + ry },
        proximity,
      };
    }

    return { pt: { x: gx + rx, y: gy + ry }, proximity };
  };

  const toScreen = (x: number, y: number): Point => {
    const cx = width / 2;
    const cy = height / 2;
    const dx = x - cx;
    const dy = y - cy;
    return {
      x: cx + dx * DIAG - dy * DIAG,
      y: cy + dx * DIAG + dy * DIAG,
    };
  };

  const toGrid = (x: number, y: number): Point => {
    const cx = width / 2;
    const cy = height / 2;
    const dx = x - cx;
    const dy = y - cy;
    return {
      x: cx + dx * DIAG + dy * DIAG,
      y: cy - dx * DIAG + dy * DIAG,
    };
  };

  const draw = (now: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!reduce) {
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const ripple = ripples[i];
        const age = (now - ripple.born) / 1000;
        ripple.radius = Math.max(0, age * 400);
        ripple.opacity = Math.max(0, 1 - age * 1.2);
        if (ripple.opacity <= 0) ripples.splice(i, 1);
      }
    }

    const corners = [toGrid(0, 0), toGrid(width, 0), toGrid(width, height), toGrid(0, height)];
    const minX = Math.min(...corners.map((point) => point.x)) - CELL_SIZE;
    const maxX = Math.max(...corners.map((point) => point.x)) + CELL_SIZE;
    const minY = Math.min(...corners.map((point) => point.y)) - CELL_SIZE;
    const maxY = Math.max(...corners.map((point) => point.y)) + CELL_SIZE;
    const originX = Math.floor(minX / CELL_SIZE) * CELL_SIZE;
    const originY = Math.floor(minY / CELL_SIZE) * CELL_SIZE;
    const cols = Math.ceil((maxX - originX) / CELL_SIZE) + 1;
    const rows = Math.ceil((maxY - originY) / CELL_SIZE) + 1;
    const pts: Point[][] = [];
    const prox: number[][] = [];

    for (let row = 0; row < rows; row += 1) {
      pts[row] = [];
      prox[row] = [];
      for (let col = 0; col < cols; col += 1) {
        const screen = toScreen(originX + col * CELL_SIZE, originY + row * CELL_SIZE);
        const point = warp(screen.x, screen.y);
        pts[row][col] = point.pt;
        prox[row][col] = point.proximity;
      }
    }

    ctx.lineCap = 'butt';
    const segment = (p1: Point, p2: Point, a: number, b: number) => {
      const t = smooth((a + b) / 2);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = lerpColor(LINE_BASE, LINE_ACTIVE, t);
      ctx.lineWidth = lerpN(1.15, 1.8, t);
      ctx.stroke();
    };

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols - 1; col += 1) {
        segment(pts[row][col], pts[row][col + 1], prox[row][col], prox[row][col + 1]);
      }
    }
    for (let col = 0; col < cols; col += 1) {
      for (let row = 0; row < rows - 1; row += 1) {
        segment(pts[row][col], pts[row + 1][col], prox[row][col], prox[row + 1][col]);
      }
    }

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const point = pts[row][col];
        const t = smooth(prox[row][col]);
        const radius = lerpN(2, 3.4, t);
        if (t > 0.3) {
          const glowR = radius + lerpN(0, 6, (t - 0.3) / 0.7);
          const glow = ctx.createRadialGradient(point.x, point.y, radius * 0.5, point.x, point.y, glowR);
          glow.addColorStop(0, `rgba(${GLOW},${(t * 0.35).toFixed(3)})`);
          glow.addColorStop(1, `rgba(${GLOW},0)`);
          ctx.beginPath();
          ctx.arc(point.x, point.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = lerpColor(NODE_BASE, NODE_ACTIVE, t);
        ctx.fill();
      }
    }

    for (const ripple of ripples) {
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, Math.max(0, ripple.radius), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${RIPPLE},${(ripple.opacity * 0.45).toFixed(3)})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  };

  const resize = () => {
    const rect = field.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    if (reduce) draw(0);
  };

  const loop = (now: number) => {
    if (!running) return;
    mouse.x = lerpN(mouse.x, target.x, LERP_SPEED);
    mouse.y = lerpN(mouse.y, target.y, LERP_SPEED);
    draw(now);
    frame = window.requestAnimationFrame(loop);
  };

  const localPoint = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  field.addEventListener('pointermove', (event) => {
    const point = localPoint(event);
    target.x = point.x;
    target.y = point.y;
  });
  field.addEventListener('pointerleave', () => {
    target.x = -9999;
    target.y = -9999;
  });
  field.addEventListener('pointerdown', (event) => {
    if (reduce) return;
    const point = localPoint(event);
    ripples.push({ x: point.x, y: point.y, radius: 0, opacity: 1, born: performance.now() });
  });

  const start = () => {
    if (reduce || running) return;
    running = true;
    frame = window.requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    if (frame) window.cancelAnimationFrame(frame);
  };

  resize();
  if (reduce) return;

  const view = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) start();
    else stop();
  });
  view.observe(field);
  window.addEventListener('resize', resize);
}
