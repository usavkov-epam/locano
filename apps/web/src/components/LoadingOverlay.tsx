import { createPortal } from 'react-dom';

export function LoadingOverlay() {
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 dark:bg-black/50">
      <div className="text-xl font-medium text-black">Loading...</div>
    </div>,
    document.getElementById('overlays') || document.body,
  );
}
