import type { JSX } from 'react';
import { ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function NotFoundPage(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm text-center">
        <p className="text-5xl font-bold text-gray-500">404</p>
        <h1 className="mt-4 text-lg font-semibold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">The page you are looking for doesn&apos;t exist.</p>
        <div className="mt-6">
          <ButtonLink to="/">Back to home</ButtonLink>
        </div>
      </Card>
    </div>
  );
}

export default NotFoundPage;