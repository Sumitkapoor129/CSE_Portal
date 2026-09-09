import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import { NavList } from './NavList';

export function MobileNav(): JSX.Element {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first || document.activeElement === panel || !panel.contains(document.activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last || !panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 lg:hidden"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={close} />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
            className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white p-4 shadow-lg outline-none lg:hidden"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-sm font-semibold text-white">
                  CSE
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">PhD Scholar Portal</p>
                  <p className="truncate text-xs text-gray-500">NIT Jamshedpur</p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {user && <p className="mb-2 px-3 text-xs text-gray-500">{ROLE_LABELS[user.role]}</p>}
            <NavList onNavigate={close} />
          </div>
        </>
      )}
    </>
  );
}