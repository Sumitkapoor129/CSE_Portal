import type { JSX } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import { NavList } from './NavList';

export function Sidebar(): JSX.Element {
  const { user } = useAuth();

  if (!user) return <></>;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
      <div className="border-b border-gray-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-sm font-semibold text-white">
            CSE
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">PhD Scholar Portal</p>
            <p className="truncate text-xs text-gray-500">NIT Jamshedpur</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-500">{ROLE_LABELS[user.role]}</p>
      </div>
      <NavList />
    </aside>
  );
}