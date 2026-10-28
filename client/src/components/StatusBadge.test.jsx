import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('formats and displays the status in an accessible text node', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
  });
});
