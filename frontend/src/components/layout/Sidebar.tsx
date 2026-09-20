import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import { Avatar } from '../ui/Avatar';
import { NavList } from './NavList';

export function Sidebar(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <></>;

  const handleSignOut = () => {
    logout();
    navigate('/auth/login', { replace: true });
  };

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
      <div className="flex-1 overflow-y-auto">
        <NavList />
      </div>
      <div className="border-t border-gray-200 p-4">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}