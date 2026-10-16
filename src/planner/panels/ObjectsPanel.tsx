/**
 * Objects panel (docs/03 §4.2): the text alternative to the map. A real table with column
 * headers, grouped by themed area. Selecting a row selects the object on the map and the other
 * way round. Decided at M3: a native table with group rows instead of an ARIA tree grid, which
 * reads more reliably across screen readers.
 */
import { useId, useMemo, useState } from 'react';
import { Button, Menu, MenuItem, MenuTrigger, Popover, Separator } from 'react-aria-components';
import { en } from '../../i18n/en.ts';
import { getSpecies } from '../../data/index.ts';
import { formatArea, formatLength } from '../../lib/format.ts';
import { checkHabitat } from '../../model/requirements.ts';
import { habitatMeasure, objectArea, objectLength } from '../../model/totals.ts';
import type { MapObject, ObjectType, Plan } from '../../model/types.ts';
import { objectBBox } from '../../model/objectGeometry.ts';
import { typeLabel } from '../describe.ts';
import {
  deleteSelection,
  duplicateSelection,
  reorderSelection,
  select,
  setHidden,
  setLocked,
  toggleInSelection,
} from '../store/actions.ts';
import { setState, usePlanner } from '../store/store.ts';
import { revealBox } from '../store/view.ts';
import { badgeText } from '../map/layers.tsx';
import { Icon } from '../ui/Icon.tsx';
import { ScrollRegion } from '../ui/ScrollRegion.tsx';

const t = en.planner.objects;

type SortKey = 'order' | 'name' | 'area' | 'type';

interface Row {
  o: MapObject;
  type: string;
  sizeText: string;
  sizeValue: number;
  animals: string;
  animalsSpoken: string;
  status: 'fits' | 'short' | 'noData' | 'noAnimals' | null;
  statusText: string;
}

function buildRow(o: MapObject, plan: Plan): Row {
  const units = plan.settings.units;
  const area = o.type === 'path' ? null : objectArea(o);
  const length = objectLength(o);
  let status: Row['status'] = null;
  let statusText = '';
  if (o.type === 'habitat') {
    const mapM2 = plan.settings.mapWidthM * plan.settings.mapHeightM;
    const c = checkHabitat(
      o,
      habitatMeasure(o, mapM2),
      plan.speciesLibrary,
      plan.settings.requirementBufferPct,
    );
    status = c.status;
    // Short labels fit the table; the Inspector and Checks tab give the full sentences.
    statusText =
      c.status === 'short'
        ? t.statusShortBy(formatArea(c.shortM2, units))
        : t.statusLabels[c.status];
  }
  const names =
    o.type === 'habitat'
      ? o.animals.map((a) => (a.catalogId && getSpecies(a.catalogId)?.commonName) || a.displayName)
      : [];
  return {
    o,
    type: typeLabel(o),
    sizeText:
      area !== null ? formatArea(area, units) : length !== null ? formatLength(length, units) : '',
    sizeValue: area ?? length ?? 0,
    animals:
      o.type === 'habitat'
        ? o.animals.map((a) => `${names[o.animals.indexOf(a)]} ${badgeText(a)}`).join('; ')
        : '',
    animalsSpoken: names.join(', '),
    status,
    statusText,
  };
}

export function ObjectsPanel() {
  const plan = usePlanner((s) => s.plan);
  const selection = usePlanner((s) => s.selection);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ObjectType | ''>('');
  const [sort, setSort] = useState<SortKey>('order');
  const searchId = useId();
  const filterId = useId();
  const sortId = useId();

  const rows = useMemo(() => (plan ? plan.objects.map((o) => buildRow(o, plan)) : []), [plan]);
  if (!plan) return null;

  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!typeFilter || r.o.type === typeFilter) &&
      (!q || r.o.name.toLowerCase().includes(q) || r.animalsSpoken.toLowerCase().includes(q)),
  );
  const sorted = [...shown].sort((a, b) => {
    if (sort === 'name') return a.o.name.localeCompare(b.o.name);
    if (sort === 'area') return b.sizeValue - a.sizeValue;
    if (sort === 'type') return a.type.localeCompare(b.type) || a.o.name.localeCompare(b.o.name);
    return 0;
  });
  const groups = [
    ...plan.areas.map((a) => ({
      id: a.id,
      name: a.name,
      rows: sorted.filter((r) => r.o.areaId === a.id),
    })),
    {
      id: '',
      name: t.unassigned,
      rows: sorted.filter((r) => !r.o.areaId || !plan.areas.some((a) => a.id === r.o.areaId)),
    },
  ].filter((g) => g.rows.length > 0);
  const types = [...new Set(plan.objects.map((o) => o.type))];

  return (
    <>
      <h2>{t.heading}</h2>
      <div className="objects-controls">
        <div className="field">
          <label htmlFor={searchId}>{t.search}</label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor={filterId}>{t.filterType}</label>
            <select
              id={filterId}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ObjectType | '')}
            >
              <option value="">{t.filterAll}</option>
              {types.map((ty) => (
                <option key={ty} value={ty}>
                  {en.planner.types[ty]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={sortId}>{t.sort}</label>
            <select id={sortId} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="order">{t.sortOrder}</option>
              <option value="name">{t.sortName}</option>
              <option value="area">{t.sortArea}</option>
              <option value="type">{t.sortType}</option>
            </select>
          </div>
        </div>
        <p className="field-help" aria-live="polite">
          {t.count(shown.length, rows.length)}
        </p>
      </div>
      {rows.length === 0 ? (
        <p>{t.empty}</p>
      ) : shown.length === 0 ? (
        <p>{t.noMatch}</p>
      ) : (
        <ScrollRegion label={t.caption}>
          <table className="data-table objects-table">
            <caption className="visually-hidden">{t.caption}</caption>
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">{t.select('')}</span>
                </th>
                <th scope="col">{t.nameAndType}</th>
                <th scope="col" className="num">
                  {t.size}
                </th>
                <th scope="col">{t.status}</th>
                <th scope="col">
                  <span className="visually-hidden">{t.actions}</span>
                </th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.id || 'none'}>
                <tr className="group-row">
                  <th scope="rowgroup" colSpan={5}>
                    {g.name}
                  </th>
                </tr>
                {g.rows.map((r) => (
                  <ObjectRow key={r.o.id} row={r} selected={selection.includes(r.o.id)} />
                ))}
              </tbody>
            ))}
          </table>
        </ScrollRegion>
      )}
    </>
  );
}

function goTo(o: MapObject): void {
  select([o.id]);
  revealBox(objectBBox(o));
}

function ObjectRow({ row, selected }: { row: Row; selected: boolean }) {
  const { o } = row;
  return (
    <tr aria-selected={selected}>
      <td>
        <input
          type="checkbox"
          checked={selected}
          aria-label={t.select(o.name)}
          onChange={() => toggleInSelection(o.id)}
        />
      </td>
      <th scope="row">
        <button type="button" className="btn-quiet link-button" onClick={() => goTo(o)}>
          {o.name}
        </button>
        {o.locked && <Icon id="lock" size={14} className="row-flag" />}
        {o.hidden && <Icon id="eye-off" size={14} className="row-flag" />}
        {o.locked && <span className="visually-hidden">, {en.planner.describe.locked}</span>}
        {o.hidden && <span className="visually-hidden">, {en.planner.describe.hidden}</span>}
        <span className="row-meta">{t.meta(row.type, row.animals)}</span>
      </th>
      <td className="num">{row.sizeText}</td>
      <td>
        {row.status && (
          <span className="status-pill" data-status={row.status}>
            <Icon
              id={row.status === 'fits' ? 'check' : row.status === 'short' ? 'warning' : 'info'}
              size={14}
            />
            {row.statusText}
          </span>
        )}
      </td>
      <td>
        <MenuTrigger>
          <Button className="icon-btn" aria-label={t.rowActions(o.name)}>
            <Icon id="more" size={16} />
          </Button>
          <Popover className="pl-popover" placement="bottom end">
            <Menu
              className="pl-menu"
              onAction={(key) => {
                const ids = [o.id];
                switch (key) {
                  case 'goto':
                    return goTo(o);
                  case 'rename':
                    select(ids, { announce: false });
                    setState({ panelTab: 'inspector' });
                    return undefined;
                  case 'duplicate':
                    return duplicateSelection(ids);
                  case 'delete':
                    return deleteSelection(ids);
                  case 'up':
                    return reorderSelection('forward', ids);
                  case 'down':
                    return reorderSelection('backward', ids);
                  case 'lock':
                    return setLocked(!o.locked, ids);
                  case 'hide':
                    return setHidden(!o.hidden, ids);
                  default:
                    return undefined;
                }
              }}
            >
              <MenuItem id="goto" className="pl-menu-item">
                {en.planner.actions.goTo}
              </MenuItem>
              <MenuItem id="rename" className="pl-menu-item">
                {en.planner.actions.rename}
              </MenuItem>
              <MenuItem id="duplicate" className="pl-menu-item">
                {en.planner.actions.duplicate}
              </MenuItem>
              <MenuItem id="delete" className="pl-menu-item" isDisabled={o.locked}>
                {en.planner.actions.delete}
              </MenuItem>
              <Separator className="pl-menu-sep" />
              <MenuItem id="up" className="pl-menu-item">
                {en.planner.actions.bringForward}
              </MenuItem>
              <MenuItem id="down" className="pl-menu-item">
                {en.planner.actions.sendBackward}
              </MenuItem>
              <Separator className="pl-menu-sep" />
              <MenuItem id="lock" className="pl-menu-item">
                {o.locked ? en.planner.actions.unlock : en.planner.actions.lock}
              </MenuItem>
              <MenuItem id="hide" className="pl-menu-item">
                {o.hidden ? en.planner.actions.show : en.planner.actions.hide}
              </MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      </td>
    </tr>
  );
}
