import type { SessionSnapshot } from '@shared/contracts/session';
import { UsageCard } from './UsageCard';
import { EndpointCodeBlock } from './EndpointCodeBlock';
import { ExchangeDetails } from './ExchangeDetails';
import './UsageAndCodeColumn.css';

interface UsageAndCodeColumnProps {
  session: SessionSnapshot;
}

export function UsageAndCodeColumn({ session }: UsageAndCodeColumnProps) {
  const pairing = session.pairing;
  const config = session.config;

  const servingCurrent = session.tokensToServeDone;
  const servingLimit = pairing?.tokensToServe || 0;

  const usingCurrent = session.tokensGrantedDone;
  const usingLimit = pairing?.tokensGranted || 0;

  const showEndpointCode = Boolean(pairing?.peerUrl && pairing?.proxyKey && pairing?.peerModel);
  const hasConfig = Boolean(config);

  return (
    <div className="session-column center-column">
      <div className="usage-cards">
        <UsageCard
          title="Your API Being Used"
          badge="Serving"
          current={servingCurrent}
          limit={servingLimit}
          variant="serving"
        />
        <UsageCard
          title="Peer API You Can Use"
          badge="Available"
          current={usingCurrent}
          limit={usingLimit}
          variant="using"
        />
      </div>

      {hasConfig && <ExchangeDetails session={session} />}

      {showEndpointCode && <EndpointCodeBlock pairing={pairing!} />}
    </div>
  );
}
