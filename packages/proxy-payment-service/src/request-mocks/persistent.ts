import nock from 'nock';

type TPersistentMockObject = Record<string, (address?: string) => nock.Scope>;

export type { TPersistentMockObject };
export { persistent as POSProxy } from './POSProxy';
export { persistent as StarTSP650 } from './StarTSP650';
