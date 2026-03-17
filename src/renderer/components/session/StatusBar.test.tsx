import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('renders tunnel URL', () => {
    render(
      <StatusBar
        tunnelUrl="https://tokenhub.ngrok.io"
        proxyPort={9100}
        wsConnected={true}
      />
    );

    expect(screen.getByText(/Tunnel:/i)).toBeInTheDocument();
    expect(screen.getByText('https://tokenhub.ngrok.io')).toBeInTheDocument();
  });

  it('renders proxy port', () => {
    render(
      <StatusBar
        tunnelUrl="https://tokenhub.ngrok.io"
        proxyPort={9100}
        wsConnected={true}
      />
    );

    expect(screen.getByText(/Proxy:/i)).toBeInTheDocument();
    expect(screen.getByText('localhost:9100')).toBeInTheDocument();
  });

  it('shows connected WebSocket status', () => {
    const { container } = render(
      <StatusBar
        tunnelUrl="https://tokenhub.ngrok.io"
        proxyPort={9100}
        wsConnected={true}
      />
    );

    expect(screen.getByText('Connected')).toBeInTheDocument();
    const successDots = container.querySelectorAll('.dot.success');
    expect(successDots.length).toBe(3);
  });

  it('shows disconnected WebSocket status', () => {
    const { container } = render(
      <StatusBar
        tunnelUrl="https://tokenhub.ngrok.io"
        proxyPort={9100}
        wsConnected={false}
      />
    );

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    const warningDot = container.querySelector('.dot.warning');
    expect(warningDot).toBeInTheDocument();
  });

  it('handles missing tunnel URL', () => {
    render(
      <StatusBar
        tunnelUrl=""
        proxyPort={9100}
        wsConnected={true}
      />
    );

    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });

  it('renders version number', () => {
    render(
      <StatusBar
        tunnelUrl="https://tokenhub.ngrok.io"
        proxyPort={9100}
        wsConnected={true}
        version="2.0.0"
      />
    );

    expect(screen.getByText('v2.0.0')).toBeInTheDocument();
  });

  it('uses default version when not provided', () => {
    render(
      <StatusBar
        tunnelUrl="https://tokenhub.ngrok.io"
        proxyPort={9100}
        wsConnected={true}
      />
    );

    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });

  it('applies correct dot classes for connection states', () => {
    const { container } = render(
      <StatusBar
        tunnelUrl="https://tokenhub.ngrok.io"
        proxyPort={9100}
        wsConnected={false}
      />
    );

    const errorDot = container.querySelector('.dot.error');
    expect(errorDot).toBeInTheDocument();
  });
});