import type { JSX } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import { Avatar } from '../ui/Avatar';
import { NavList } from './NavList';

export function Sidebar(): JSX.Element {
  const { user } = useAuth();

  if (!user) return <></>;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
      <div className="border-b border-gray-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} photo={user.profilePhoto ?? null} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="truncate text-xs text-gray-500">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
      </div>
      <NavList />
    </aside>
  );
}