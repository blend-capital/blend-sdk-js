import { Address, scValToNative, SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { BaseBlendEvent, BlendContractType } from '../base_event.js';

export enum BackstopEventType {
  Deposit = 'deposit',
  QueueWithdrawal = 'queue_withdrawal',
  DequeueWithdrawal = 'dequeue_withdrawal',
  Withdraw = 'withdraw',
  GulpEmissions = 'gulp_emissions',
  RewardZone = 'rw_zone',
  Claim = 'claim',
  Draw = 'draw',
  Donate = 'donate',
}

export interface BaseBackstopEvent extends BaseBlendEvent {
  contractType: BlendContractType.Backstop;
}

export interface BackstopDepositEvent extends BaseBackstopEvent {
  eventType: BackstopEventType.Deposit;
  poolAddress: string;
  from: string;
  amount: bigint;
  sharesMinted: bigint;
}

export interface BackstopQ4WEvent extends BaseBackstopEvent {
  eventType: BackstopEventType.QueueWithdrawal;
  poolAddress: string;
  from: string;
  shares: bigint;
  expiration: number;
}

export interface BackstopDequeueEvent extends BaseBackstopEvent {
  eventType: BackstopEventType.DequeueWithdrawal;
  poolAddress: string;
  from: string;
  shares: bigint;
}

export interface BackstopWithdrawEvent extends BaseBackstopEvent {
  eventType: BackstopEventType.Withdraw;
  poolAddress: string;
  shares: bigint;
  tokensWithdrawn: bigint;
}

export interface BackstopGulpEmissionsEvent extends BaseBackstopEvent {
  eventType: BackstopEventType.GulpEmissions;
  newBLND: bigint;
}

export interface BackstopRewardZoneEvent extends BaseBackstopEvent {
  eventType: BackstopEventType.RewardZone;
  toAdd: string;
  toRemove: string;
}

export interface BackstopClaimEvent extends BaseBackstopEvent {
  eventType: BackstopEventType.Claim;
  from: string;
  amount: bigint;
}

export interface BackstopDrawEvent extends BaseBackstopEvent {
  eventType: BackstopEventType.Draw;
  poolAddress: string;
  to: string;
  amount: bigint;
}

export interface BackstopDonateEvent extends BaseBackstopEvent {
  eventType: BackstopEventType.Donate;
  poolAddress: string;
  from: string;
  amount: bigint;
}

export type BackstopEvent =
  | BackstopDepositEvent
  | BackstopQ4WEvent
  | BackstopDequeueEvent
  | BackstopWithdrawEvent
  | BackstopGulpEmissionsEvent
  | BackstopRewardZoneEvent
  | BackstopClaimEvent
  | BackstopDrawEvent
  | BackstopDonateEvent;

/**
 * Create a BackstopEvent from a RawEventResponse.
 * @param eventResponse - The RawEventResponse from the RPC to convert
 * @returns The BackstopEvent or undefined if the EventResponse is not a BackstopEvent
 */
export function backstopEventFromEventResponse(
  eventResponse: SorobanRpc.Api.RawEventResponse
): BackstopEvent | undefined {
  if (
    eventResponse.type !== 'contract' ||
    eventResponse.topic.length === 0 ||
    eventResponse.contractId === undefined
  ) {
    return undefined;
  }

  try {
    // NOTE: Decode RawEventResponse to ScVals. Do not update to `SorobanRpc.Api.EventResponse`. This
    // will cause failures in the conversion functions due to the requirement that the exact same
    // `js-xdr` code is used. (the same version from two different sources does not work)
    const topic_scval = eventResponse.topic.map((topic) => xdr.ScVal.fromXDR(topic, 'base64'));
    const value_scval = xdr.ScVal.fromXDR(eventResponse.value, 'base64');

    // The first topic is the event name as a symbol
    const eventString = scValToNative(topic_scval[0]) as string;

    const baseEvent = {
      id: eventResponse.id,
      contractId: eventResponse.contractId,
      contractType: BlendContractType.Backstop,
      eventType: eventString as BackstopEventType,
      ledger: eventResponse.ledger,
      ledgerClosedAt: eventResponse.ledgerClosedAt,
      txHash: eventResponse.txHash,
    };
    switch (eventString) {
      case BackstopEventType.Deposit: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 3 || valueAsVec.length !== 2) {
          return undefined;
        }
        const pool_address = Address.fromScVal(topic_scval[1]).toString();
        const from = Address.fromScVal(topic_scval[2]).toString();
        const amount = BigInt(scValToNative(valueAsVec[0]));
        const shares = BigInt(scValToNative(valueAsVec[1]));
        return {
          ...baseEvent,
          eventType: BackstopEventType.Deposit,
          poolAddress: pool_address,
          from: from,
          amount: amount,
          sharesMinted: shares,
        } as BackstopDepositEvent;
      }
      case BackstopEventType.QueueWithdrawal: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 3 || valueAsVec.length !== 2) {
          return undefined;
        }
        const pool_address = Address.fromScVal(topic_scval[1]).toString();
        const from = Address.fromScVal(topic_scval[2]).toString();
        const shares = BigInt(scValToNative(valueAsVec[0]));
        const expiration = Number(scValToNative(valueAsVec[1]));
        if (isNaN(expiration)) {
          return undefined;
        }
        return {
          ...baseEvent,
          eventType: BackstopEventType.QueueWithdrawal,
          poolAddress: pool_address,
          from: from,
          shares: shares,
          expiration: expiration,
        } as BackstopQ4WEvent;
      }
      case BackstopEventType.DequeueWithdrawal: {
        if (topic_scval.length !== 3) {
          return undefined;
        }
        const pool_address = Address.fromScVal(topic_scval[1]).toString();
        const from = Address.fromScVal(topic_scval[2]).toString();
        const shares = BigInt(scValToNative(value_scval));
        return {
          ...baseEvent,
          eventType: BackstopEventType.DequeueWithdrawal,
          poolAddress: pool_address,
          from: from,
          shares: shares,
        } as BackstopDequeueEvent;
      }
      case BackstopEventType.Withdraw: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 2 || valueAsVec.length !== 2) {
          return undefined;
        }
        const pool_address = Address.fromScVal(topic_scval[1]).toString();
        const shares = BigInt(scValToNative(valueAsVec[0]));
        const tokensWithdrawn = BigInt(scValToNative(valueAsVec[1]));
        return {
          ...baseEvent,
          eventType: BackstopEventType.Withdraw,
          poolAddress: pool_address,
          shares: shares,
          tokensWithdrawn: tokensWithdrawn,
        } as BackstopWithdrawEvent;
      }
      case BackstopEventType.GulpEmissions: {
        if (topic_scval.length !== 1) {
          return undefined;
        }
        const newBLND = BigInt(scValToNative(value_scval));
        return {
          ...baseEvent,
          eventType: BackstopEventType.GulpEmissions,
          newBLND: newBLND,
        } as BackstopGulpEmissionsEvent;
      }
      case BackstopEventType.RewardZone: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 1 || valueAsVec.length !== 2) {
          return undefined;
        }
        const toAdd = Address.fromScVal(valueAsVec[0]).toString();
        const toRemove = Address.fromScVal(valueAsVec[1]).toString();
        return {
          ...baseEvent,
          eventType: BackstopEventType.RewardZone,
          toAdd: toAdd,
          toRemove: toRemove,
        } as BackstopRewardZoneEvent;
      }
      case BackstopEventType.Claim: {
        if (topic_scval.length !== 2) {
          return undefined;
        }
        const from = Address.fromScVal(topic_scval[1]).toString();
        const amount = BigInt(scValToNative(value_scval));
        return {
          ...baseEvent,
          eventType: BackstopEventType.Claim,
          from: from,
          amount: amount,
        } as BackstopClaimEvent;
      }
      case BackstopEventType.Draw: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 2 || valueAsVec.length !== 2) {
          return undefined;
        }
        const pool_address = Address.fromScVal(topic_scval[1]).toString();
        const to = Address.fromScVal(valueAsVec[0]).toString();
        const amount = BigInt(scValToNative(valueAsVec[1]));
        return {
          ...baseEvent,
          eventType: BackstopEventType.Draw,
          poolAddress: pool_address,
          to: to,
          amount: amount,
        } as BackstopDrawEvent;
      }
      case BackstopEventType.Donate: {
        if (topic_scval.length !== 3) {
          return undefined;
        }
        const pool_address = Address.fromScVal(topic_scval[1]).toString();
        const from = Address.fromScVal(topic_scval[2]).toString();
        const amount = BigInt(scValToNative(value_scval));
        return {
          ...baseEvent,
          eventType: BackstopEventType.Donate,
          poolAddress: pool_address,
          from: from,
          amount: amount,
        } as BackstopDonateEvent;
      }
      default:
        return undefined;
    }
  } catch (e) {
    // conversion functions throw on a malformed (or non-backstop) events
    // return undefined in this case
    return undefined;
  }
}
