import { useState } from 'react';

import { Button } from './ui/button';

/**
 * Dismissable banner shown when a non-Sequence smart contract wallet is detected.
 * Sequence v3 wallets behave like EOAs so this banner should not appear for them.
 */
export const ScwBanner = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-start gap-4 rounded-lg border border-yellow/30 bg-yellow/10 px-5 py-4">
      <div className="flex-1">
        <p className="font-medium text-foreground">Smart contract wallet detected</p>
        <p className="mt-1 text-sm text-grey">
          Some features may behave differently with this wallet. Transaction confirmations can take
          longer and certain signing flows (like permits) are not supported — the app will use
          standard approvals instead.
        </p>
      </div>
      <Button variant="primary" className="shrink-0 text-xs" onClick={() => setDismissed(true)}>
        Dismiss
      </Button>
    </div>
  );
};
