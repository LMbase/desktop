import './UsageCard.css';

interface UsageCardProps {
  title: string;
  badge: 'Serving' | 'Available';
  current: number;
  limit: number;
  variant: 'serving' | 'using';
}

export function UsageCard({ title, badge, current, limit, variant }: UsageCardProps) {
  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;

  return (
    <div className="usage-card">
      <div className="usage-card-header">
        <span className="usage-card-title">{title}</span>
        <span className={`usage-card-badge ${badge.toLowerCase()}`}>{badge}</span>
      </div>
      <div className="usage-progress">
        <div className="progress-bar">
          <div
            className={`progress-fill ${variant}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="progress-labels">
          <span>{current.toLocaleString()} used</span>
          <span>{limit.toLocaleString()} limit</span>
        </div>
      </div>
      <div className="usage-numbers">
        <span className="usage-current">{current.toLocaleString()}</span>
        <span className="usage-limit">/ {limit.toLocaleString()}</span>
      </div>
    </div>
  );
}