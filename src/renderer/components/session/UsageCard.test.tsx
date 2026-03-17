import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsageCard } from './UsageCard';

describe('UsageCard', () => {
  it('renders serving card correctly', () => {
    render(
      <UsageCard
        title="Your API Being Used"
        badge="Serving"
        current={4250}
        limit={10000}
        variant="serving"
      />
    );

    expect(screen.getByText('Your API Being Used')).toBeInTheDocument();
    expect(screen.getByText('Serving')).toBeInTheDocument();
    expect(screen.getByText('4,250 used')).toBeInTheDocument();
    expect(screen.getByText('10,000 limit')).toBeInTheDocument();
    expect(screen.getByText('4,250')).toBeInTheDocument();
  });

  it('renders available card correctly', () => {
    render(
      <UsageCard
        title="Peer API You Can Use"
        badge="Available"
        current={3850}
        limit={8333}
        variant="using"
      />
    );

    expect(screen.getByText('Peer API You Can Use')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('3,850 used')).toBeInTheDocument();
    expect(screen.getByText('8,333 limit')).toBeInTheDocument();
  });

  it('calculates percentage correctly', () => {
    const { container } = render(
      <UsageCard
        title="Test"
        badge="Serving"
        current={50}
        limit={100}
        variant="serving"
      />
    );

    const progressFill = container.querySelector('.progress-fill');
    expect(progressFill).toHaveStyle({ width: '50%' });
  });

  it('handles zero limit gracefully', () => {
    const { container } = render(
      <UsageCard
        title="Test"
        badge="Serving"
        current={50}
        limit={0}
        variant="serving"
      />
    );

    const progressFill = container.querySelector('.progress-fill');
    expect(progressFill).toHaveStyle({ width: '0%' });
  });

  it('caps percentage at 100%', () => {
    const { container } = render(
      <UsageCard
        title="Test"
        badge="Serving"
        current={150}
        limit={100}
        variant="serving"
      />
    );

    const progressFill = container.querySelector('.progress-fill');
    expect(progressFill).toHaveStyle({ width: '100%' });
  });

  it('applies correct variant class for serving', () => {
    const { container } = render(
      <UsageCard
        title="Test"
        badge="Serving"
        current={50}
        limit={100}
        variant="serving"
      />
    );

    const progressFill = container.querySelector('.progress-fill');
    expect(progressFill).toHaveClass('serving');
  });

  it('applies correct variant class for using', () => {
    const { container } = render(
      <UsageCard
        title="Test"
        badge="Available"
        current={50}
        limit={100}
        variant="using"
      />
    );

    const progressFill = container.querySelector('.progress-fill');
    expect(progressFill).toHaveClass('using');
  });
});