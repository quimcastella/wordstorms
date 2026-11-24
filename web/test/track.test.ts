import { afterEach, describe, expect, it, vi } from 'vitest';
import { documentsBucket, secondsBucket, track, wordsBucket } from '../src/app/track.ts';

describe('track', () => {
  afterEach(() => {
    delete (globalThis as { plausible?: unknown }).plausible;
  });

  it('sends the event with its props to Plausible, leaving out unset ones', () => {
    const plausible = vi.fn();
    (globalThis as { plausible?: unknown }).plausible = plausible;
    track('Setting Change', { setting: 'seed', value: undefined });
    track('Word Pin');
    expect(plausible.mock.calls).toEqual([['Setting Change', { props: { setting: 'seed' } }], ['Word Pin', undefined]]);
  });

  it('does nothing without Plausible on the page', () => {
    expect(() => track('Copy BibTeX')).not.toThrow();
  });
});

describe('buckets', () => {
  it('puts counts in ranges', () => {
    expect([1, 5, 6, 10, 11, 20, 21].map(documentsBucket)).toEqual(['1', '5', '6-10', '6-10', '11-20', '11-20', '21+']);
    expect([0, 999, 1000, 99_999, 100_000, 2e6].map(wordsBucket)).toEqual(['<1k', '<1k', '1k-10k', '10k-100k', '100k-1M', '1M+']);
    expect([10, 1000, 2999, 3000, 12_000].map(secondsBucket)).toEqual(['<1', '1-3', '1-3', '3-10', '10+']);
  });
});
