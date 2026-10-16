import { Component, type ErrorInfo, type ReactNode } from 'react';
import { en } from '../../i18n/en.ts';
import { failBoot } from '../boot/bootDom.ts';
import { getState } from '../store/store.ts';

const t = en.planner.crash;

export interface CrashBoundaryProps {
  children: ReactNode;
}

interface CrashBoundaryState {
  crashed: boolean;
}

/**
 * If anything in the planner throws while rendering, show a plain message with a way to save
 * the plan and reload, instead of a blank page. (React needs a class for this.)
 */
export class CrashBoundary extends Component<CrashBoundaryProps, CrashBoundaryState> {
  override state: CrashBoundaryState = { crashed: false };

  static getDerivedStateFromError(): CrashBoundaryState {
    return { crashed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Still starting up: the loading screen shows its own error and reload link.
    failBoot();
    console.error(error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.crashed) return this.props.children;
    const save = () => {
      const plan = getState().plan;
      if (plan)
        void import('../persistence/file.ts').then(({ savePlanFile }) => savePlanFile(plan));
    };
    return (
      <div className="crash-panel" role="alert">
        <h1>{t.title}</h1>
        <p>{t.body}</p>
        <div className="inline-actions">
          <button type="button" className="btn btn-primary" onClick={save}>
            {t.save}
          </button>
          <button type="button" className="btn" onClick={() => location.reload()}>
            {t.reload}
          </button>
        </div>
      </div>
    );
  }
}
