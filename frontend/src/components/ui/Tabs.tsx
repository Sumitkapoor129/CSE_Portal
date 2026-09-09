import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { cn } from '../../utils/cn';

interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tabElements = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    if (tabElements.length === 0) return;
    const currentIndex = tabElements.findIndex((el) => el.getAttribute('aria-selected') === 'true');
    let nextIndex = -1;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabElements.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabElements.length) % tabElements.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabElements.length - 1;
    if (nextIndex >= 0) {
      event.preventDefault();
      onChange(tabs[nextIndex].key);
      tabElements[nextIndex]?.focus();
    }
  };

  return (
    <div ref={listRef} role="tablist" onKeyDown={handleKeyDown} className="flex gap-1 border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.key)}
            className={cn(
              '-mb-px inline-flex items-center border-b-2 px-4 py-2 text-sm transition-colors',
              isActive
                ? 'border-blue-600 font-medium text-blue-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;