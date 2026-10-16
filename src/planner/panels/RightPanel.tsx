import { lazy, Suspense, useEffect } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { en } from '../../i18n/en.ts';
import { setState, usePlanner, type PanelTab } from '../store/store.ts';
import { Inspector } from './Inspector.tsx';

// The Inspector is what people see first; the other tabs are separate downloads, fetched in
// the background once the planner is idle (so switching tabs normally doesn't wait).
const load = {
  objects: () => import('./ObjectsPanel.tsx'),
  areas: () => import('./AreasPanel.tsx'),
  stats: () => import('./StatsPanel.tsx'),
  checks: () => import('./ChecksPanel.tsx'),
};
const ObjectsPanel = lazy(() => load.objects().then((m) => ({ default: m.ObjectsPanel })));
const AreasPanel = lazy(() => load.areas().then((m) => ({ default: m.AreasPanel })));
const StatsPanel = lazy(() => load.stats().then((m) => ({ default: m.StatsPanel })));
const ChecksPanel = lazy(() => load.checks().then((m) => ({ default: m.ChecksPanel })));

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'inspector', label: en.planner.inspector.tab },
  { id: 'objects', label: en.planner.objects.tab },
  { id: 'areas', label: en.planner.areas.tab },
  { id: 'stats', label: en.planner.stats.tab },
  { id: 'checks', label: en.planner.checks.tab },
];

function usePrefetchPanels(): void {
  useEffect(() => {
    const prefetch = () => {
      for (const get of Object.values(load)) void get().catch(() => undefined);
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(prefetch, 1000);
    return () => window.clearTimeout(id);
  }, []);
}

/** The details panel: tabs for Inspector, Objects, Areas, Stats and Checks (React Aria Tabs). */
export function RightPanel() {
  usePrefetchPanels();
  const tab = usePlanner((s) => s.panelTab);
  return (
    <aside className="pl-panel" data-region="panel" aria-label={en.planner.regions.panel}>
      <Tabs
        className="panel-tabs"
        selectedKey={tab}
        onSelectionChange={(key) => setState({ panelTab: key as PanelTab })}
        keyboardActivation="manual"
      >
        <TabList aria-label={en.planner.panelLabel} className="panel-tablist">
          {TABS.map((tb) => (
            <Tab key={tb.id} id={tb.id} className="panel-tab">
              {tb.label}
            </Tab>
          ))}
        </TabList>
        <TabPanel id="inspector" className="panel-body">
          <Inspector />
        </TabPanel>
        {/* Suspense sits inside each panel so the tab panel itself is always there. */}
        <TabPanel id="objects" className="panel-body">
          <Suspense fallback={null}>
            <ObjectsPanel />
          </Suspense>
        </TabPanel>
        <TabPanel id="areas" className="panel-body">
          <Suspense fallback={null}>
            <AreasPanel />
          </Suspense>
        </TabPanel>
        <TabPanel id="stats" className="panel-body">
          <Suspense fallback={null}>
            <StatsPanel />
          </Suspense>
        </TabPanel>
        <TabPanel id="checks" className="panel-body">
          <Suspense fallback={null}>
            <ChecksPanel />
          </Suspense>
        </TabPanel>
      </Tabs>
    </aside>
  );
}
