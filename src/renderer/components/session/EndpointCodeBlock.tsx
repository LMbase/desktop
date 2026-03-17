import { useState, useCallback } from 'react';
import type { PairingInfo } from '@shared/contracts/session';
import { generateCodeSnippet } from '@shared/lib/snippets';
import './EndpointCodeBlock.css';

interface EndpointCodeBlockProps {
  pairing: PairingInfo;
}

export function EndpointCodeBlock({ pairing }: EndpointCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const code = generateCodeSnippet(pairing);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  }, [code]);

  return (
    <div className="code-section">
      <div className="code-header">
        <span className="code-title">Copy-ready endpoint</span>
        <button className="btn-copy" onClick={handleCopy}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <div className="code-block">
        <pre>{code}</pre>
      </div>
    </div>
  );
}
