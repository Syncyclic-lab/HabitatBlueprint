import { en } from '../../i18n/en.ts';
import { SHORTCUTS, formatKeys } from '../a11y/shortcuts.ts';
import { setState, usePlanner } from '../store/store.ts';
import { Dialog } from '../ui/Dialog.tsx';
import { ScrollRegion } from '../ui/ScrollRegion.tsx';

const t = en.planner.shortcutsDialog;

/** Every keyboard shortcut, from the same registry the planner and Help page use. */
export function ShortcutsDialog() {
  const prefs = usePlanner((s) => s.prefs);
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <Dialog
      title={t.title}
      onClose={() => setState({ dialog: null })}
      cancelLabel={en.planner.dialogs.close}
      wide
    >
      <p>{t.intro}</p>
      {!prefs.singleKeyShortcuts && <p className="notice">{t.off}</p>}
      <ScrollRegion label={t.title}>
        <table className="data-table">
          <caption className="visually-hidden">{t.title}</caption>
          <thead>
            <tr>
              <th scope="col">{t.key}</th>
              <th scope="col">{t.action}</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((s) => {
              const override = prefs.shortcutOverrides[s.id];
              const keys = override ? [override] : s.keys;
              const off = s.single && !prefs.singleKeyShortcuts;
              return (
                <tr key={s.id}>
                  <th scope="row">
                    <kbd>{formatKeys(keys, mac)}</kbd>
                    {off && <span className="field-help"> {t.offTag}</span>}
                  </th>
                  <td>{en.shortcuts[s.id]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollRegion>
    </Dialog>
  );
}
