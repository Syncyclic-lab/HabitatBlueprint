/** HTML overlays on the map: real text and real buttons, never pictures of text. */
import { memo, useMemo } from 'react';
import { en } from '../../i18n/en.ts';
import { scaleBar } from '../../geometry/scale.ts';
import { shapeToPoly } from '../../geometry/flatten.ts';
import { formatArea, formatLength, formatPercent } from '../../lib/format.ts';
import { footprint } from '../../model/totals.ts';
import type { Plan } from '../../model/types.ts';
import { getState, setState, usePlanner } from '../store/store.ts';
import { centerOn, fitMap, zoomBy } from '../store/view.ts';
import { draftPreview, livePoint } from '../tools/drawing.ts';
import { Icon } from '../ui/Icon.tsx';
import { mapToScreen, viewBox } from './viewMath.ts';
import { multiPath, polyPath } from './paths.ts';
import { cachedObjectFill, groundColor } from './style.ts';

const t = en.planner.map;

export function ScaleBar() {
  const zoom = usePlanner((s) => s.view.zoom);
  const units = usePlanner((s) => s.plan?.settings.units ?? 'metric');
  const bar = scaleBar(zoom, 120);
  const label = formatLength(bar.meters, units).replace(/\.0(?=\s)/, '');
  return (
    <div className="map-overlay scale-bar" role="img" aria-label={t.scaleBar(label)}>
      <span aria-hidden="true">{label}</span>
      <span className="bar" aria-hidden="true" style={{ width: bar.px }} />
    </div>
  );
}

export function NorthArrow() {
  return (
    <div className="map-overlay north-arrow" role="img" aria-label={t.north}>
      <Icon id="north" size={22} />
      <span aria-hidden="true">N</span>
    </div>
  );
}

export function ZoomControls() {
  const showMinimap = usePlanner((s) => s.prefs.showMinimap);
  return (
    <div className="map-overlay map-controls">
      {showMinimap && <Minimap />}
      <button
        type="button"
        className="btn btn-small minimap-toggle"
        onClick={() => setState({ prefs: { ...getState().prefs, showMinimap: !showMinimap } })}
      >
        {showMinimap ? t.minimapHide : t.minimapShow}
      </button>
      <div className="zoom-buttons" role="group" aria-label={en.planner.status.zoom}>
        <button type="button" aria-label={t.zoomIn} onClick={() => zoomBy(1.4)}>
          <Icon id="plus" />
        </button>
        <button type="button" aria-label={t.zoomOut} onClick={() => zoomBy(1 / 1.4)}>
          <Icon id="minus" />
        </button>
        <button type="button" aria-label={t.fit} onClick={fitMap}>
          <Icon id="fit" />
        </button>
      </div>
    </div>
  );
}

const MINI_W = 168;

/** Overview of the whole map with the current view outlined. */
export function Minimap() {
  const plan = usePlanner((s) => s.plan);
  const view = usePlanner((s) => s.view);
  if (!plan) return null;
  const { mapWidthM: w, mapHeightM: h } = plan.settings;
  const height = Math.round((MINI_W * h) / w);
  const vb = viewBox(view);
  return (
    <button
      type="button"
      className="minimap"
      aria-label={t.minimap}
      onClick={(e) => {
        // Keyboard activation (detail 0) shows the whole map; a click jumps to that point.
        if (e.detail === 0) {
          fitMap();
          return;
        }
        const r = e.currentTarget.getBoundingClientRect();
        centerOn({
          x: ((e.clientX - r.left) / r.width) * w,
          y: ((e.clientY - r.top) / r.height) * h,
        });
      }}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={MINI_W}
        height={height}
        aria-hidden="true"
        focusable="false"
      >
        <MinimapContent plan={plan} />
        <rect
          x={vb.x}
          y={vb.y}
          width={vb.w}
          height={vb.h}
          fill="none"
          stroke="#13201A"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
        <rect
          x={vb.x}
          y={vb.y}
          width={vb.w}
          height={vb.h}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </button>
  );
}

const MinimapContent = memo(function MinimapContent({ plan }: { plan: Plan }) {
  const shapes = useMemo(
    () =>
      plan.objects
        .filter((o) => !o.hidden)
        .map((o) => {
          const style = cachedObjectFill(o, plan);
          if (!style) return null;
          const d =
            o.type === 'path'
              ? multiPath(footprint(o) ?? [])
              : 'shape' in o
                ? polyPath(shapeToPoly(o.shape))
                : '';
          return d ? <path key={o.id} d={d} fill={style.fill} /> : null;
        }),
    [plan],
  );
  return (
    <>
      <rect
        width={plan.settings.mapWidthM}
        height={plan.settings.mapHeightM}
        fill={groundColor(plan)}
      />
      {shapes}
    </>
  );
});

export function EmptyPrompt() {
  const count = usePlanner((s) => s.plan?.objects.length ?? 0);
  if (count > 0) return null;
  return (
    <div className="map-overlay map-empty">
      <p>{t.emptyPrompt}</p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setState({ dialog: { id: 'addBySize' } })}
      >
        {t.addBySize}
      </button>
    </div>
  );
}

/** Area/length readout that follows the drawing point without covering it (docs/03 §3.1). */
export function DrawReadout() {
  // Re-render on anything that moves the live point or changes the draft.
  usePlanner((s) => s.pointer);
  usePlanner((s) => s.crosshair);
  usePlanner((s) => s.draft);
  usePlanner((s) => s.constrain);
  const view = usePlanner((s) => s.view);
  const plan = usePlanner((s) => s.plan);
  const preview = draftPreview();
  const live = livePoint();
  if (!plan || !preview || !live || preview.kind === 'point') return null;
  const units = plan.settings.units;
  const mapM2 = plan.settings.mapWidthM * plan.settings.mapHeightM;
  const rows: [string, string][] = [];
  if (preview.kind === 'line') {
    if (!preview.lengthM) return null;
    rows.push([en.planner.draw.readoutLength, formatLength(preview.lengthM, units)]);
  } else {
    if (preview.areaM2 === null) return null;
    rows.push([en.planner.draw.readoutArea, formatArea(preview.areaM2, units)]);
    if (preview.perimeterM !== null)
      rows.push([en.planner.draw.readoutPerimeter, formatLength(preview.perimeterM, units)]);
    rows.push([en.planner.draw.readoutPct, formatPercent(preview.areaM2 / mapM2)]);
  }
  const s = mapToScreen(view, live);
  const flipX = s.x > view.width - 240;
  const flipY = s.y > view.height - 140;
  return (
    <div
      className="map-overlay draw-readout readout-tag"
      aria-hidden="true"
      style={{
        left: flipX ? undefined : s.x + 20,
        right: flipX ? view.width - s.x + 20 : undefined,
        top: flipY ? undefined : s.y + 20,
        bottom: flipY ? view.height - s.y + 20 : undefined,
      }}
    >
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className="readout-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
