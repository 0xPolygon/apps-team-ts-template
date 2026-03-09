import { describe, expect, it } from 'vitest';

import { shortenAddress } from '../shorten-address';

describe('shortenAddress', () => {
  it('shortens a full Ethereum address', () => {
    expect(shortenAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234...5678');
  });

  it('uses custom char count', () => {
    expect(shortenAddress('0x1234567890abcdef1234567890abcdef12345678', 6)).toBe(
      '0x123456...345678'
    );
  });

  it('returns short strings unchanged', () => {
    expect(shortenAddress('0x1234')).toBe('0x1234');
  });
});
