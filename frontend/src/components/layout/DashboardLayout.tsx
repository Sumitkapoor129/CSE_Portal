import type { JSX } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function DashboardLayout(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg focus:outline-none focus:text-sm focus:font-medium focus:text-gray-900"
      >
        Skip to main content
      </a>
      <Sidebar />
      <Header />
      <main id="main" className="lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}