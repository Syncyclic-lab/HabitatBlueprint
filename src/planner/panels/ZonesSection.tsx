import { MenuTrigger, Menu, MenuItem, Popover, Button } from 'react-aria-components';
import { en } from '../../i18n/en.ts';
import { shapeToPoly } from '../../geometry/flatten.ts';
import { intersect } from '../../geometry/clip.ts';
import { multiArea } from '../../geometry/polygon.ts';
import { formatArea } from '../../lib/format.ts';
import type { HabitatObject, Plan, ZoneKind } from '../../model/types.ts';
import { deleteZone } from '../store/actions.ts';
import { setState } from '../store/store.ts';
import { startZone } from '../tools/drawing.ts';
import { Icon } from '../ui/Icon.tsx';

const t = en.planner.inspector;

/** A zone's area inside its habitat; 0 if the shapes can't be combined. */
function zoneAreaSafe(
  shape: Parameters<typeof shapeToPoly>[0],
  outline: ReturnType<typeof shapeToPoly>[],
): number {
  try {
    return multiArea(intersect([shapeToPoly(shape)], outline));
  } catch {
    return 0;
  }
}

/** A habitat's zones: water, deep water, climbing, shelter and (aviaries) flying areas. */
export function ZonesSection({ habitat, plan }: { habitat: HabitatObject; plan: Plan }) {
  const units = plan.settings.units;
  const outline = [shapeToPoly(habitat.shape)];
  const kinds: ZoneKind[] = [
    'water',
    'deepWater',
    'climbing',
    'shelter',
    ...(habitat.kind === 'aviary' ? (['flying'] as const) : []),
  ];
  return (
    <section className="panel-section" aria-labelledby="insp-zones">
      <h3 id="insp-zones">{t.zonesHeading}</h3>
      {habitat.zones.length === 0 ? (
        <p className="field-help">{t.noZones}</p>
      ) : (
        <ul className="zone-list" role="list">
          {habitat.zones.map((z) => {
            const kindLabel = en.planner.zones[z.kind];
            const area = zoneAreaSafe(z.shape, outline);
            return (
              <li key={z.id} className="zone-row">
                <span className={`zone-swatch zone-swatch-${z.kind}`} aria-hidden="true" />
                <span>{t.zoneArea(kindLabel, formatArea(area, units))}</span>
                <span className="inline-actions">
                  <button
                    type="button"
                    className="btn btn-small"
                    disabled={habitat.locked}
                    onClick={() =>
                      setState({
                        dialog: { id: 'resizeToArea', objectId: habitat.id, zoneId: z.id },
                      })
                    }
                    aria-label={t.zoneResize(kindLabel)}
                  >
                    {en.planner.actions.resizeToArea}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={habitat.locked}
                    aria-label={t.deleteZone(kindLabel)}
                    onClick={() => deleteZone(habitat.id, z.id)}
                  >
                    <Icon id="trash" size={16} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <MenuTrigger>
        <Button className="btn btn-small" isDisabled={habitat.locked}>
          <Icon id="plus" size={16} />
          {t.addZone}
        </Button>
        <Popover className="pl-popover" placement="bottom start">
          <Menu className="pl-menu" onAction={(k) => startZone(habitat.id, k as ZoneKind)}>
            {kinds.map((k) => (
              <MenuItem key={k} id={k} className="pl-menu-item">
                {en.planner.zones[k]}
              </MenuItem>
            ))}
          </Menu>
        </Popover>
      </MenuTrigger>
    </section>
  );
}
