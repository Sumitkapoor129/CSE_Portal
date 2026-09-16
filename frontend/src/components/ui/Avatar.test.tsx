// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders an image when photo is provided', () => {
    const { container } = render(<Avatar name="Aarav Gupta" photo="https://x/photo.jpg" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://x/photo.jpg');
  });

  it('falls back to initials when no photo', () => {
    render(<Avatar name="Aarav Gupta" />);
    expect(screen.getByText('AG')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});