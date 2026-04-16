import { useEffect, useState } from 'react';
import { parseEther } from 'viem';
import { useConnection, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

import { shortenAddress } from '../utils/shorten-address';
import { Button } from './ui/button';
import { Card } from './ui/card';

/**
 * Demonstrates a native token transfer using wagmi hooks. When the Sequence v3
 * setup hook has been called, transactions route through the wallet's native
 * path transparently — this component needs no Sequence-specific logic.
 */
export const SendNative = () => {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [confirmedHash, setConfirmedHash] = useState<string>();

  const { chain } = useConnection();
  const { data: hash, isPending, mutate: sendTransaction, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const explorerUrl =
    confirmedHash && chain?.blockExplorers?.default.url
      ? `${chain.blockExplorers.default.url}/tx/${confirmedHash}`
      : undefined;

  useEffect(() => {
    if (!isSuccess || !hash) return;
    setConfirmedHash(hash);
    setTo('');
    setAmount('');
    const timer = setTimeout(() => {
      setConfirmedHash(undefined);
      reset();
    }, 5000);
    return () => clearTimeout(timer);
  }, [isSuccess, hash, reset]);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    e.preventDefault();
    if (!to || !amount) return;
    setConfirmedHash(undefined);

    sendTransaction({
      to: to as `0x${string}`,
      value: parseEther(amount)
    });
  };

  return (
    <Card className="w-full items-stretch gap-5">
      <h2 className="text-2xl font-semibold text-foreground">Send Native Token</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Recipient address (0x...)"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-grey-light bg-surface px-3 py-2 text-foreground"
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-md border border-grey-light bg-surface px-3 py-2 text-foreground"
        />
        <Button type="submit" disabled={isPending || !to || !amount}>
          {isPending ? 'Confirm in wallet...' : 'Send'}
        </Button>
      </form>

      {hash && !isSuccess && (
        <p className="text-sm text-grey">
          Tx: {shortenAddress(hash)}
          {isConfirming && ' — confirming...'}
        </p>
      )}

      {confirmedHash && (
        <div className="rounded-md border border-green/30 bg-green/10 px-4 py-3">
          <p className="text-sm font-medium text-foreground">Transaction confirmed</p>
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-xs text-primary underline"
            >
              View on block explorer
            </a>
          ) : (
            <p className="mt-1 text-xs text-grey">{shortenAddress(confirmedHash)}</p>
          )}
        </div>
      )}
    </Card>
  );
};
