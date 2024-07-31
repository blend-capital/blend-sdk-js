import { BackstopEventType } from './backstop/index.js';
import { EmitterEventType } from './emitter/index.js';
import { PoolEventType } from './pool/index.js';
import { PoolFactoryEventType } from './pool_factory/index.js';

export enum BlendContractType {
  Backstop = 'backstop',
  Emitter = 'emitter',
  Pool = 'pool',
  PoolFactory = 'pool_factory',
}

export interface BaseBlendEvent {
  id: string;
  contractId: string;
  contractType: BlendContractType;
  eventType: BackstopEventType | EmitterEventType | PoolEventType | PoolFactoryEventType;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
}
