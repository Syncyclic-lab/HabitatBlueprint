/**
 * The planner root, mounted on /planner with client:progress. On the server (and the first
 * client render) it renders nothing: the static loading screen in planner.astro shows instead,
 * and this component reports its startup steps to it before revealing the planner.
 */
import { useEffect, useRef, useState } from 'react';
import './planner.css';
import { en } from '../i18n/en.ts';
import { createPlan } from '../model/factory.ts';
import { LiveAnnouncer } from './a11y/LiveAnnouncer.tsx';
import { announce } from './a11y/announcer.ts';
import { cycleRegion } from './a11y/regions.ts';
import { failBoot, finishBoot, setBoot } from './boot/bootDom.ts';
import { DialogHost } from './dialogs/DialogHost.tsx';
import { openStoredPlan } from './persistence/openStored.ts';
import { MapView } from './map/MapView.tsx';
import { RightPanel } from './panels/RightPanel.tsx';
import { startAutosave } from './persistence/autosave.ts';
import { listPlans, loadAsset, savePlan, storageAvailable } from './persistence/db.ts';
import type { ImportResult } from './persistence/file.ts';
import { applyTheme, loadPrefs } from './persistence/prefs.ts';
import { redo, undo, loadPlan } from './store/history.ts';
import { getState, setState, usePlanner } from './store/store.ts';
import { fitMap } from './store/view.ts';
import { StatusBar } from './shell/StatusBar.tsx';
import { ToolOptions } from './shell/ToolOptions.tsx';
import { ToolRail } from './shell/ToolRail.tsx';
import { TopBar } from './shell/TopBar.tsx';
import { CrashBoundary } from './shell/CrashBoundary.tsx';

/** Plan files and share links are handled by a separate download, fetched when first needed. */
const fileModule = () => import('./persistence/file.ts');
const SHARE_PREFIX = '#plan=';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Startup: preferences, storage, the last plan (or a starter), a share link if present. */
async function boot(): Promise<void> {
  setBoot(68, 'start');
  const prefs = loadPrefs();
  applyTheme(prefs.theme);
  setState({ prefs });

  setBoot(74, 'storage');
  const available = await storageAvailable();
  if (!available) setState({ saveStatus: 'unavailable' });

  setBoot(82, 'open');
  let opened = false;
  if (available && prefs.lastPlanId) opened = await openStoredPlan(prefs.lastPlanId);
  if (available && !opened) {
    const recent = (await listPlans())[0];
    if (recent) opened = await openStoredPlan(recent.id);
  }
  if (!opened) {
    const plan = createPlan({ name: en.planner.newPlan.defaultName, mode: 'sandbox' });
    loadPlan(plan);
    if (available) await savePlan(plan);
    setState({
      dialog: { id: 'newPlan', firstRun: true },
      prefs: { ...getState().prefs, lastPlanId: plan.id },
    });
  }

  // A tracing image stays in IndexedDB; turn it into a local blob URL for drawing.
  const tracing = getState().plan?.tracing;
  if (tracing) {
    const blob = await loadAsset(tracing.assetId);
    if (blob) setState({ tracingUrl: URL.createObjectURL(blob) });
  }

  if (location.hash.startsWith(SHARE_PREFIX)) {
    const share = (await fileModule()).readShareFragment(location.hash);
    if (share) handleImport(share, 'link');
  }
  setBoot(90, 'draw');
}

function handleImport(result: ImportResult, source: 'file' | 'link'): void {
  if (result.ok) {
    setState({ dialog: { id: 'openFile', file: result.file, source } });
    return;
  }
  const t = en.planner.openFile;
  announce(source === 'link' ? t.invalidLink : result.reason === 'tooBig' ? t.tooBig : t.invalid, {
    assertive: true,
  });
}

export function PlannerApp() {
  const [phase, setPhase] = useState<'booting' | 'ready' | 'error'>('booting');
  useEffect(() => {
    boot()
      .then(() => setPhase('ready'))
      .catch(() => {
        setPhase('error');
        failBoot();
      });
  }, []);
  if (phase !== 'ready') return null;
  return (
    <CrashBoundary>
      <Shell />
    </CrashBoundary>
  );
}

function Shell() {
  const fileInput = useRef<HTMLInputElement>(null);
  const plan = usePlanner((s) => s.plan);
  const status = usePlanner((s) => s.saveStatus);
  const [bannerOpen, setBannerOpen] = useState(true);

  // First paint of the map: fit it, then reveal the planner.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await nextFrame();
      fitMap();
      await nextFrame();
      if (!cancelled) finishBoot();
    })();
    const stopAutosave = startAutosave();
    return () => {
      cancelled = true;
      stopAutosave();
    };
  }, []);

  // Keys that work anywhere in the planner: undo/redo and F6 region cycling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (getState().dialog) return;
      const target = e.target as HTMLElement | null;
      const typing = !!target?.closest('input, textarea, select, [contenteditable="true"]');
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'F6') {
        e.preventDefault();
        cycleRegion(e.shiftKey ? -1 : 1);
        return;
      }
      if (typing || !mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // A share link pasted into the address bar while the planner is open.
  useEffect(() => {
    const onHash = async () => {
      if (!location.hash.startsWith(SHARE_PREFIX)) return;
      const share = (await fileModule()).readShareFragment(location.hash);
      if (share) handleImport(share, 'link');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    handleImport(await (await fileModule()).readPlanFile(file), 'file');
  };

  if (!plan) return null;
  return (
    // Dropping a plan file is a shortcut for the Open file button, which is the accessible path.
    // eslint-disable-next-line jsx-a11y-x/no-static-element-interactions
    <div
      className="planner"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
      }}
      onDrop={(e) => {
        const file = e.dataTransfer.files[0];
        if (!file) return;
        e.preventDefault();
        void openFile(file);
      }}
    >
      <LiveAnnouncer />
      <TopBar onOpenFile={() => fileInput.current?.click()} />
      <ToolRail />
      <ToolOptions />
      <MapView />
      <RightPanel />
      <StatusBar />
      {status === 'unavailable' && bannerOpen && (
        <div className="storage-banner" role="region" aria-label={en.planner.top.unavailable}>
          <p>{en.planner.top.unavailableBanner}</p>
          <button type="button" className="btn btn-small" onClick={() => setBannerOpen(false)}>
            {en.planner.banner.dismiss}
          </button>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept=".json,.zooplan.json,application/json"
        className="visually-hidden"
        tabIndex={-1}
        aria-label={en.planner.openFile.choose}
        onChange={(e) => {
          void openFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <DialogHost onOpenFile={() => fileInput.current?.click()} />
    </div>
  );
}
