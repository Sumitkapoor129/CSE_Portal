import type { UserRole } from '../../types';

export interface NavItem {
  to: string;
  label: string;
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  student: [
    { to: '/student', label: 'Dashboard' },
    { to: '/student/profile', label: 'Profile' },
    { to: '/student/milestones', label: 'Milestones' },
    { to: '/student/courses', label: 'Courses' },
    { to: '/student/credits', label: 'Credits' },
    { to: '/student/thesis', label: 'Thesis' },
    { to: '/student/events', label: 'Events' },
    { to: '/student/deadlines', label: 'Deadlines' },
    { to: '/student/documents', label: 'Documents' },
    { to: '/student/notifications', label: 'Notifications' },
  ],
  supervisor: [
    { to: '/supervisor', label: 'Dashboard' },
    { to: '/supervisor/students', label: 'My Students' },
    { to: '/supervisor/approvals', label: 'Approvals' },
    { to: '/supervisor/events', label: 'Events' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/students', label: 'Students' },
    { to: '/admin/faculty', label: 'Faculty' },
    { to: '/admin/bulk-import', label: 'Bulk Import' },
    { to: '/admin/assignments', label: 'Assignments' },
    { to: '/admin/src-committees', label: 'SRC Committees' },
    { to: '/admin/forms', label: 'Forms' },
    { to: '/admin/deadlines', label: 'Deadlines' },
    { to: '/admin/events', label: 'Events' },
    { to: '/admin/search', label: 'Search' },
  ],
};

export function getNavItemsForRole(user: { role: UserRole; isProfileComplete?: boolean }): NavItem[] {
  const items = [...NAV_ITEMS[user.role]];
  if (user.role === 'student' && user.isProfileComplete === false) {
    items.unshift({ to: '/student/complete-profile', label: 'Complete Profile' });
  }
  return items;
}

export const NAV_LINK_BASE = 'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors';
export const NAV_LINK_ACTIVE = 'bg-blue-50 text-blue-700 font-medium';
export const NAV_LINK_INACTIVE = 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';

export function isNavIndex(to: string): boolean {
  return to.split('/').filter(Boolean).length === 1;
}