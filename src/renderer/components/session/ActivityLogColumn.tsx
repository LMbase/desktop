import { useEffect, useRef } from 'react';
import type { ActivityEvent } from '@shared/contracts/session';
import './ActivityLogColumn.css';

interface ActivityLogColumnProps {
  activities: ActivityEvent[];
}

export function ActivityLogColumn({ activities }: ActivityLogColumnProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [activities]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="session-column">
      <div className="section-title">Activity Log</div>
      <div className="activity-log" ref={logRef}>
        {activities.length === 0 ? (
          <div className="activity-empty">
            No activity yet. Waiting for events...
          </div>
        ) : (
          activities.map((activity, index) => (
            <div key={`${activity.timestamp}-${index}`} className="activity-item">
              <div className="activity-time">{formatTime(activity.timestamp)}</div>
              <div className={`activity-message ${activity.type}`}>
                {activity.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}