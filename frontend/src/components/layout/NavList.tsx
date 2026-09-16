import { NavLink } from 'react-router-dom';
import type { JSX } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { getNavItemsForRole, NAV_LINK_ACTIVE, NAV_LINK_BASE, NAV_LINK_INACTIVE, isNavIndex } from './navConfig';

export function NavList({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  const { user } = useAuth();

  if (!user) return <></>;

  const items = getNavItemsForRole(user);

  return (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={isNavIndex(item.to)}
              onClick={onNavigate}
              className={({ isActive }) => cn(NAV_LINK_BASE, isActive ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE)}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}