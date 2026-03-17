import './StatusBar.css';

interface StatusBarProps {
  tunnelUrl: string;
  proxyPort: number;
  wsConnected: boolean;
  version?: string;
}

export function StatusBar({ tunnelUrl, proxyPort, wsConnected, version = '1.0.0' }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-bar-item">
        <span className={`dot ${wsConnected ? 'success' : 'error'}`} />
        <strong>Tunnel:</strong>
        <span>{tunnelUrl || 'Not connected'}</span>
      </div>
      <div className="status-bar-item">
        <span className="dot success" />
        <strong>Proxy:</strong>
        <span>localhost:{proxyPort}</span>
      </div>
      <div className="status-bar-item">
        <span className={`dot ${wsConnected ? 'success' : 'warning'}`} />
        <strong>WebSocket:</strong>
        <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      <div className="status-bar-right">
        <span>v{version}</span>
      </div>
    </div>
  );
}