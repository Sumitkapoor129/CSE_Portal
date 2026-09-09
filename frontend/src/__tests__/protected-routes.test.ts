// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';

afterEach(cleanup);

function Null() {
  return null;
}

function Guard({ roles }: { roles?: string[] }): React.ReactElement {
  const user = { role: 'admin' };
  if (roles && !roles.includes(user.role)) return React.createElement(Navigate, { to: '/', replace: true });
  return React.createElement(Outlet);
}

function Layout() {
  return React.createElement(
    'div',
    null,
    React.createElement('h1', null, 'sidebar'),
    React.createElement(Outlet)
  );
}

function AdminDashboard() {
  return React.createElement('h1', null, 'dashboard-content');
}

describe('protected route structure (regression for blank admin pages)', () => {
  it('renders the page when the matched route element returns <Outlet/> instead of null', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/admin'] },
        React.createElement(
          Routes,
          null,
          React.createElement(
            Route,
            { element: React.createElement(Guard) },
            React.createElement(
              Route,
              { element: React.createElement(Layout) },
              React.createElement(
                Route,
                { path: '/admin', element: React.createElement(Guard, { roles: ['admin'] }) },
                React.createElement(Route, { index: true, element: React.createElement(AdminDashboard) })
              )
            )
          )
        )
      )
    );
    expect(screen.getByText('sidebar')).toBeTruthy();
    expect(screen.getByText('dashboard-content')).toBeTruthy();
  });

  it('leaves the page blank when the matched route element returns null (the original bug)', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/admin'] },
        React.createElement(
          Routes,
          null,
          React.createElement(
            Route,
            { element: React.createElement(Layout) },
            React.createElement(
              Route,
              { path: '/admin', element: React.createElement(Null) },
              React.createElement(Route, { index: true, element: React.createElement(AdminDashboard) })
            )
          )
        )
      )
    );
    expect(screen.queryByText('dashboard-content')).toBeNull();
  });
});