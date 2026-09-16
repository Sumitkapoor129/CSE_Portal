import { useEffect } from 'react';

export const usePageTitle = (title: string): void => {
  useEffect(() => {
    document.title = title ? `${title} — CSE PhD Portal | NIT Jamshedpur` : 'CSE PhD Portal | NIT Jamshedpur';
  }, [title]);
};