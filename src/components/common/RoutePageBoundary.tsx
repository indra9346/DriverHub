import React from 'react';

const RouteLoadingFallback: React.FC = () => {
  const [takingLonger, setTakingLonger] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setTakingLonger(true), 10_000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-600">
        {takingLonger ? 'This page is taking longer than expected to load.' : 'Loading this page…'}
      </p>
      {takingLonger && (
        <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-[#08233F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123b61]">
          Reload page
        </button>
      )}
    </div>
  );
};

interface RoutePageBoundaryProps {
  children: React.ReactNode;
}

interface RoutePageBoundaryState {
  failed: boolean;
}

export class RoutePageBoundary extends React.Component<RoutePageBoundaryProps, RoutePageBoundaryState> {
  state: RoutePageBoundaryState = { failed: false };

  static getDerivedStateFromError(): RoutePageBoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center" role="alert">
          <h2 className="text-lg font-bold text-slate-900">This page could not be loaded</h2>
          <p className="max-w-md text-sm text-slate-600">Check your connection and reload. Your account data has not been changed.</p>
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-[#08233F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123b61]">
            Reload page
          </button>
        </div>
      );
    }

    return <React.Suspense fallback={<RouteLoadingFallback />}>{this.props.children}</React.Suspense>;
  }
}
