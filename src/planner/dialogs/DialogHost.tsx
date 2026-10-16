import { lazy, Suspense, useEffect } from 'react';
import { usePlanner, type DialogState } from '../store/store.ts';
import { NewPlanDialog } from './NewPlanDialog.tsx';

/*
 * Dialogs other than "New plan" (needed on a first visit) are separate downloads, so the
 * planner opens faster. They're fetched in the background once the planner is idle, so the
 * first time one opens there's normally no wait.
 */
const load = {
  sizes: () => import('./SizeDialogs.tsx'),
  deleteAll: () => import('./DeleteAllDialog.tsx'),
  export: () => import('./ExportDialog.tsx'),
  mapSettings: () => import('./MapSettingsDialog.tsx'),
  openFile: () => import('./OpenFileDialog.tsx'),
  plans: () => import('./PlansDialog.tsx'),
  rename: () => import('./RenameDialog.tsx'),
  shortcuts: () => import('./ShortcutsDialog.tsx'),
  snapshots: () => import('./SnapshotsDialog.tsx'),
  species: () => import('./SpeciesDialog.tsx'),
  templates: () => import('./TemplatesDialog.tsx'),
  tracing: () => import('./TracingDialog.tsx'),
};

const AddBySizeDialog = lazy(() => load.sizes().then((m) => ({ default: m.AddBySizeDialog })));
const MoveByDialog = lazy(() => load.sizes().then((m) => ({ default: m.MoveByDialog })));
const ResizeToAreaDialog = lazy(() =>
  load.sizes().then((m) => ({ default: m.ResizeToAreaDialog })),
);
const DeleteAllDialog = lazy(() => load.deleteAll().then((m) => ({ default: m.DeleteAllDialog })));
const ExportDialog = lazy(() => load.export().then((m) => ({ default: m.ExportDialog })));
const MapSettingsDialog = lazy(() =>
  load.mapSettings().then((m) => ({ default: m.MapSettingsDialog })),
);
const OpenFileDialog = lazy(() => load.openFile().then((m) => ({ default: m.OpenFileDialog })));
const PlansDialog = lazy(() => load.plans().then((m) => ({ default: m.PlansDialog })));
const RenameDialog = lazy(() => load.rename().then((m) => ({ default: m.RenameDialog })));
const ShortcutsDialog = lazy(() => load.shortcuts().then((m) => ({ default: m.ShortcutsDialog })));
const SnapshotsDialog = lazy(() => load.snapshots().then((m) => ({ default: m.SnapshotsDialog })));
const SpeciesDialog = lazy(() => load.species().then((m) => ({ default: m.SpeciesDialog })));
const TemplatesDialog = lazy(() => load.templates().then((m) => ({ default: m.TemplatesDialog })));
const TracingDialog = lazy(() => load.tracing().then((m) => ({ default: m.TracingDialog })));

/** Downloads every dialog in the background once the browser is idle. */
function usePrefetchDialogs(): void {
  useEffect(() => {
    const prefetch = () => {
      for (const get of Object.values(load)) void get().catch(() => undefined);
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(prefetch, 1500);
    return () => window.clearTimeout(id);
  }, []);
}

/** Shows whichever dialog the store asks for (one at a time). */
export function DialogHost({ onOpenFile }: { onOpenFile: () => void }) {
  usePrefetchDialogs();
  const dialog = usePlanner((s) => s.dialog);
  if (!dialog) return null;
  return <Suspense fallback={null}>{dialogFor(dialog, onOpenFile)}</Suspense>;
}

function dialogFor(dialog: DialogState, onOpenFile: () => void) {
  switch (dialog.id) {
    case 'newPlan':
      return <NewPlanDialog firstRun={dialog.firstRun ?? false} />;
    case 'addBySize':
      return <AddBySizeDialog />;
    case 'resizeToArea':
      return (
        <ResizeToAreaDialog
          objectId={dialog.objectId}
          {...(dialog.zoneId ? { zoneId: dialog.zoneId } : {})}
        />
      );
    case 'moveBy':
      return <MoveByDialog />;
    case 'mapSettings':
      return <MapSettingsDialog />;
    case 'shortcuts':
      return <ShortcutsDialog />;
    case 'export':
      return <ExportDialog />;
    case 'plans':
      return <PlansDialog onOpenFile={onOpenFile} />;
    case 'rename':
      return <RenameDialog />;
    case 'openFile':
      return <OpenFileDialog file={dialog.file} source={dialog.source} />;
    case 'deleteAll':
      return <DeleteAllDialog />;
    case 'species':
      return <SpeciesDialog />;
    case 'templates':
      return <TemplatesDialog />;
    case 'snapshots':
      return <SnapshotsDialog />;
    case 'tracing':
      return <TracingDialog />;
  }
}
