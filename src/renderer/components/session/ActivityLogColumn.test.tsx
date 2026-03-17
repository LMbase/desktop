import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityLogColumn } from './ActivityLogColumn';
import type { ActivityEvent } from '@shared/contracts/session';

describe('ActivityLogColumn', () => {
  const mockActivities: ActivityEvent[] = [
    { timestamp: Date.now() - 3000, type: 'success', message: 'Request completed — 245 tokens' },
    { timestamp: Date.now() - 2000, type: 'info', message: 'Peer requested: claude-3-5-sonnet' },
    { timestamp: Date.now() - 1000, type: 'success', message: 'Session established' },
  ];

  it('renders activity log title', () => {
    render(<ActivityLogColumn activities={[]} />);

    expect(screen.getByText('Activity Log')).toBeInTheDocument();
  });

  it('displays empty state when no activities', () => {
    render(<ActivityLogColumn activities={[]} />);

    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument();
  });

  it('renders all activities', () => {
    render(<ActivityLogColumn activities={mockActivities} />);

    expect(screen.getByText('Request completed — 245 tokens')).toBeInTheDocument();
    expect(screen.getByText('Peer requested: claude-3-5-sonnet')).toBeInTheDocument();
    expect(screen.getByText('Session established')).toBeInTheDocument();
  });

  it('applies correct type classes', () => {
    const { container } = render(<ActivityLogColumn activities={mockActivities} />);

    const successMessages = container.querySelectorAll('.activity-message.success');
    const infoMessages = container.querySelectorAll('.activity-message.info');

    expect(successMessages.length).toBe(2);
    expect(infoMessages.length).toBe(1);
  });

  it('formats timestamps correctly', () => {
    const now = Date.now();
    const activities: ActivityEvent[] = [
      { timestamp: now, type: 'info', message: 'Test' },
    ];

    const { container } = render(<ActivityLogColumn activities={activities} />);

    const timeElement = container.querySelector('.activity-time');
    expect(timeElement).toBeInTheDocument();
    expect(timeElement?.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('displays error type correctly', () => {
    const activities: ActivityEvent[] = [
      { timestamp: Date.now(), type: 'error', message: 'Connection failed' },
    ];

    const { container } = render(<ActivityLogColumn activities={activities} />);

    const errorMessage = container.querySelector('.activity-message.error');
    expect(errorMessage).toBeInTheDocument();
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('displays warning type correctly', () => {
    const activities: ActivityEvent[] = [
      { timestamp: Date.now(), type: 'warning', message: 'Rate limit approaching' },
    ];

    const { container } = render(<ActivityLogColumn activities={activities} />);

    const warningMessage = container.querySelector('.activity-message.warning');
    expect(warningMessage).toBeInTheDocument();
    expect(screen.getByText('Rate limit approaching')).toBeInTheDocument();
  });
});