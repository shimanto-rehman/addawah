'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  formatPrayerTime,
  isTimeInWindow,
  type PrayerTimesPayload,
} from '@/lib/prayer-times';
import {
  arcPoint,
  describeArcSegment,
  minutesToArcT,
  outerLabelPoint,
  outerLabelRadius,
  windowToArc,
} from '@/lib/sun-arc';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CX = 300;
const CY = 168;
const RX = 235;
const RY = 198;

const FORBIDDEN_LABEL: Record<string, string> = {
  'after-fajr': 'After Fajr',
  zawal: 'Zawāl',
  'after-asr': 'After Asr',
};

/** Spread labels apart where prayers crowd at the arc peak */
const LABEL_TANGENT: Record<string, number> = {
  FAJR: 0,
  DHUHR: 30,
  ASR: -30,
  MAGHRIB: 18,
  ISHA: 0,
};

const LABEL_RADIAL_EXTRA: Record<string, number> = {
  FAJR: 0,
  DHUHR: 10,
  ASR: 18,
  MAGHRIB: 8,
  ISHA: 0,
};

const VIEW_MIN_X = -52;
const VIEW_MIN_Y = -112;
const VIEW_WIDTH = 704;
const VIEW_HEIGHT = 298;

/** How far inside the arc forbidden (red) sun markers sit */
const FORBIDDEN_MARKER_INSET = -34;

function useCompactArc() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return compact;
}

function arcTextAnchor(t: number): 'start' | 'middle' | 'end' {
  if (t < 0.12) return 'end';
  if (t > 0.88) return 'start';
  return 'middle';
}

function SunGlyph({
  x,
  y,
  size,
  phase,
  live = false,
  className = '',
}: {
  x: number;
  y: number;
  size: number;
  phase: 'gold' | 'red' | 'silver';
  live?: boolean;
  className?: string;
}) {
  return (
    <g
      className={`dawa-sun dawa-sun--${phase}${live ? ' dawa-sun--live' : ''}${className ? ` ${className}` : ''}`}
      transform={`translate(${x}, ${y})`}
    >
      <g className="dawa-sun__rays">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1={0}
            y1={-size * 1.55}
            x2={0}
            y2={-size * 1.95}
            transform={`rotate(${deg})`}
            className="dawa-sun__ray"
          />
        ))}
      </g>
      <circle r={size} className="dawa-sun__disc" />
    </g>
  );
}

export function SunPathArc() {
  const [now, setNow] = useState(() => new Date());
  const compact = useCompactArc();

  useEffect(() => {
    const sync = () => setNow(new Date());
    sync();
    const msUntilNextMinute = (60 - new Date().getSeconds()) * 1000;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const timeoutId = setTimeout(() => {
      sync();
      intervalId = setInterval(sync, 60_000);
    }, msUntilNextMinute);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const { data: times } = useSWR<PrayerTimesPayload>('/api/prayer-times', fetcher, {
    refreshInterval: 3600000,
  });

  const model = useMemo(() => {
    if (!times?.prayers.length) return null;

    const radialBase = compact ? 22 : 36;
    const radialSpread = compact ? 10 : 20;
    const tangentScale = compact ? 0.62 : 1;
    const radialExtraScale = compact ? 0.55 : 1;
    const labelGap = compact ? 7 : 9;

    const prayers = times.prayers;
    const dayStart = prayers[0].minutes;
    const dayEnd = prayers[prayers.length - 1].minutes;
    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const nowT =
      nowMin < dayStart ? 0 : nowMin > dayEnd ? 1 : minutesToArcT(nowMin, dayStart, dayEnd);
    const sunPt = arcPoint(nowT, CX, CY, RX, RY);

    const maghribMin = prayers.find((p) => p.prayer === 'MAGHRIB')?.minutes ?? dayEnd;
    const inForbidden = times.forbidden.some((w) => isTimeInWindow(nowMin, w.start, w.end));
    const isNight = nowMin >= maghribMin || nowMin < dayStart;

    let sunPhase: 'gold' | 'red' | 'silver' = 'gold';
    if (inForbidden) sunPhase = 'red';
    else if (isNight) sunPhase = 'silver';

    const forbidden = times.forbidden.map((w) => {
      const { t0, t1 } = windowToArc(w.start, w.end, dayStart, dayEnd);
      const inset = compact ? -26 : FORBIDDEN_MARKER_INSET;
      const mid = outerLabelPoint((t0 + t1) / 2, CX, CY, RX, RY, inset);
      const active = isTimeInWindow(nowMin, w.start, w.end);
      return { ...w, t0, t1, mid, active, label: FORBIDDEN_LABEL[w.id] ?? w.label };
    });

    const stops = prayers.map((p) => {
      const t = minutesToArcT(p.minutes, dayStart, dayEnd);
      const pt = arcPoint(t, CX, CY, RX, RY);
      const tangent = (LABEL_TANGENT[p.prayer] ?? 0) * tangentScale;
      const extra = (LABEL_RADIAL_EXTRA[p.prayer] ?? 0) * radialExtraScale;
      const radial = outerLabelRadius(t, radialBase, radialSpread) + extra;
      const labelPt = outerLabelPoint(t, CX, CY, RX, RY, radial, tangent);
      return {
        ...p,
        t,
        pt,
        labelPt,
        nameY: labelPt.y - labelGap,
        timeY: labelPt.y + labelGap + 1,
        anchor: arcTextAnchor(t),
      };
    });

    const baseArc = describeArcSegment(0, 1, CX, CY, RX, RY);

    return {
      sunPt,
      sunPhase,
      forbidden,
      stops,
      baseArc,
      city: times.city,
    };
  }, [times, now, compact]);

  if (!model) {
    return (
      <div className="dawa-sky__arc dawa-sky__arc--loading" aria-busy="true">
        <p>Loading prayer times…</p>
      </div>
    );
  }

  return (
    <div className={`dawa-sky__arc${compact ? ' dawa-sky__arc--compact' : ''}`} aria-label="Prayer times on the sun path">
      <svg
        viewBox={`${VIEW_MIN_X} ${VIEW_MIN_Y} ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="dawa-sky__svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
      >
        <path d={model.baseArc} className="dawa-sky__path" fill="none" vectorEffect="non-scaling-stroke" />

        {model.forbidden.map((w) =>
          w.t1 > w.t0 ? (
            <path
              key={w.id}
              d={describeArcSegment(w.t0, w.t1, CX, CY, RX, RY)}
              className={`dawa-sky__forbidden-arc${w.active ? ' is-live' : ''}`}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          ) : null,
        )}

        {model.stops.map((s) => (
          <g key={s.prayer} className="dawa-sky__wakt">
            <line
              x1={s.pt.x}
              y1={s.pt.y}
              x2={s.labelPt.x}
              y2={s.labelPt.y}
              className="dawa-sky__wakt-leader"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={s.pt.x} cy={s.pt.y} r={4} className="dawa-sky__node" vectorEffect="non-scaling-stroke" />
            <text
              x={s.labelPt.x}
              y={s.nameY}
              textAnchor={s.anchor}
              dominantBaseline="middle"
              className="dawa-sky__wakt-name"
            >
              {s.label}
            </text>
            <text
              x={s.labelPt.x}
              y={s.timeY}
              textAnchor={s.anchor}
              dominantBaseline="middle"
              className="dawa-sky__wakt-time"
            >
              {formatPrayerTime(s.time)}
            </text>
          </g>
        ))}

        {model.forbidden.map((w) => (
          <SunGlyph
            key={`fb-${w.id}`}
            x={w.mid.x}
            y={w.mid.y}
            size={5}
            phase="red"
            className={`dawa-sun--marker${w.active ? ' is-live' : ''}`}
          />
        ))}

        <SunGlyph x={model.sunPt.x} y={model.sunPt.y} size={10} phase={model.sunPhase} live />
      </svg>

      <ul className="dawa-sky__karahah">
        {model.forbidden.map((w) => (
          <li key={w.id} className={w.active ? 'is-live' : undefined}>
            {w.label} {formatPrayerTime(w.start)}–{formatPrayerTime(w.end)}
          </li>
        ))}
        {model.city && <li className="dawa-sky__loc">{model.city}</li>}
      </ul>
    </div>
  );
}
