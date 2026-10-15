/**
 * Plays the landing-page drawing once: vertices appear, the outline follows, and the area
 * readout counts up using the same shoelace maths as the planner. Under reduced motion it does
 * nothing, leaving the static finished state. Total length: 4.4 s (WCAG 2.2.2 needs a pause
 * control for anything over 5 s; we provide one anyway).
 */
type Point = [number, number];

const SEGMENT_MS = 800;
const FILL_MS = 400;

function shoelace(points: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i] as Point;
    const [x2, y2] = points[(i + 1) % points.length] as Point;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export function initHeroDemo(): void {
  const root = document.querySelector<HTMLElement>('[data-hero-demo]');
  if (!root) return;
  const shape = root.querySelector<SVGGElement>('[data-demo-shape]');
  const line = root.querySelector<SVGPolylineElement>('[data-demo-line]');
  const vertices = [...root.querySelectorAll<SVGCircleElement>('[data-demo-vertices] circle')];
  const areaText = root.querySelector<HTMLElement>('[data-demo-area]');
  const button = root.querySelector<HTMLButtonElement>('[data-demo-toggle]');
  if (!shape || !line || !areaText || !button) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const points = JSON.parse(root.dataset.points ?? '[]') as Point[];
  const finalArea = Number(root.dataset.final);
  const fmt = new Intl.NumberFormat('en-US');
  const segments = points.length; // includes the closing edge
  const total = segments * SEGMENT_MS + FILL_MS;

  let elapsed = 0;
  let last = 0;
  let frame = 0;
  let state: 'playing' | 'paused' | 'done' = 'playing';

  const setLabel = () => {
    const key =
      state === 'playing' ? 'labelPause' : state === 'paused' ? 'labelPlay' : 'labelReplay';
    button.textContent = button.dataset[key] ?? '';
  };

  const render = (ms: number) => {
    const progress = Math.min(ms / SEGMENT_MS, segments);
    const whole = Math.floor(progress);
    const frac = progress - whole;
    const drawn: Point[] = points.slice(0, Math.min(whole + 1, points.length));
    if (whole < segments) {
      const from = points[whole % points.length] as Point;
      const to = points[(whole + 1) % points.length] as Point;
      drawn.push([from[0] + (to[0] - from[0]) * frac, from[1] + (to[1] - from[1]) * frac]);
    }
    const done = ms >= segments * SEGMENT_MS;
    line.setAttribute('points', drawn.map((p) => p.join(',')).join(' '));
    line.setAttribute('visibility', done ? 'hidden' : 'visible');
    vertices.forEach((v, i) => v.setAttribute('visibility', i <= whole ? 'visible' : 'hidden'));
    const fillProgress = done ? Math.min((ms - segments * SEGMENT_MS) / FILL_MS, 1) : 0;
    shape.setAttribute('visibility', done ? 'visible' : 'hidden');
    shape.setAttribute('opacity', String(fillProgress));
    const area = done ? finalArea : Math.round(shoelace(drawn.length >= 3 ? drawn : []));
    areaText.textContent = fmt.format(area);
  };

  const tick = (now: number) => {
    if (state !== 'playing') return;
    elapsed += now - last;
    last = now;
    render(elapsed);
    if (elapsed >= total) {
      state = 'done';
      setLabel();
      return;
    }
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    state = 'playing';
    setLabel();
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  button.addEventListener('click', () => {
    if (state === 'playing') {
      state = 'paused';
      cancelAnimationFrame(frame);
      setLabel();
    } else if (state === 'paused') {
      start();
    } else {
      elapsed = 0;
      render(0);
      start();
    }
  });

  button.hidden = false;
  render(0);
  start();
}
