import { timeToMinutes } from './prayer-times';

/** Point on a convex-up semi-ellipse; t=0 left, t=1 right */
export function arcPoint(t: number, cx: number, cy: number, rx: number, ry = rx) {
  const clamped = Math.max(0, Math.min(1, t));
  const angle = Math.PI * (1 - clamped);
  return {
    x: cx + rx * Math.cos(angle),
    y: cy - ry * Math.sin(angle),
  };
}

export function minutesToArcT(minutes: number, start: number, end: number) {
  if (end <= start) return 0;
  return Math.max(0, Math.min(1, (minutes - start) / (end - start)));
}

export function describeArcSegment(
  t0: number,
  t1: number,
  cx: number,
  cy: number,
  rx: number,
  ry = rx,
) {
  const a = arcPoint(t0, cx, cy, rx, ry);
  const b = arcPoint(t1, cx, cy, rx, ry);
  const large = t1 - t0 > 0.5 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${rx} ${ry} 0 ${large} 1 ${b.x} ${b.y}`;
}

/** Extra distance beyond the arc for outer labels — peaks at arc midpoint */
export function outerLabelRadius(t: number, base: number, spread: number) {
  const peak = 1 - Math.abs(t - 0.5) * 2;
  return base + spread * peak;
}

/** Point outside the semi-ellipse; radial = outward offset, tangent = slide along the arc */
export function outerLabelPoint(
  t: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  radial: number,
  tangent = 0,
) {
  const angle = Math.PI * (1 - t);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = cx + rx * cos;
  const y = cy - ry * sin;

  const nx = cos / rx;
  const ny = -sin / ry;
  const nlen = Math.hypot(nx, ny) || 1;
  const ux = nx / nlen;
  const uy = ny / nlen;

  const tx = -rx * sin;
  const ty = -ry * cos;
  const tlen = Math.hypot(tx, ty) || 1;

  return {
    x: x + ux * radial + (tx / tlen) * tangent,
    y: y + uy * radial + (ty / tlen) * tangent,
  };
}

export function windowToArc(
  start: string,
  end: string,
  dayStart: number,
  dayEnd: number,
) {
  return {
    t0: minutesToArcT(timeToMinutes(start), dayStart, dayEnd),
    t1: minutesToArcT(timeToMinutes(end), dayStart, dayEnd),
  };
}
