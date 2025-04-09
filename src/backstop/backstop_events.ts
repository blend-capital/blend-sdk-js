import { Address, rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
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
  Distribute = 'distribute',
  RewardZoneAdd = 'rw_zone_add',
  RewardZoneRemove = 'rw_zone_remove',
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
  from: string;
  shares: bigint;
  tokensWithdrawn: bigint;
}

export interface BackstopGulpEmissionsV1Event extends BaseBackstopEvent {
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

export interface BackstopGulpEmissionsV2Event extends BaseBackstopEvent {
  eventType: BackstopEventType.GulpEmissions;
  newBackstopEmissions: bigint;
  newPoolEmissions: bigint;
}

export interface BackstopDistributeEvent extends BaseBackstopEvent {
  eventType: BackstopEventType.Distribute;
  newEmissions: bigint;
}

export interface BackstopRewardZoneAddEvent extends BaseBackstopEvent {
  eventType: BackstopEventType.RewardZoneAdd;
  toAdd: string;
  toRemove: string | undefined;
}

export interface BackstopRewardZoneRemoveEvent extends BaseBackstopEvent {
  eventType: BackstopEventType.RewardZoneRemove;
  toRemove: string;
}

export type BackstopEvent =
  | BackstopDepositEvent
  | BackstopQ4WEvent
  | BackstopDequeueEvent
  | BackstopWithdrawEvent
  | BackstopClaimEvent
  | BackstopDrawEvent
  | BackstopDonateEvent;

export type BackstopV1Event =
  | BackstopEvent
  | BackstopGulpEmissionsV1Event
  | BackstopRewardZoneEvent;

export type BackstopV2Event =
  | BackstopEvent
  | BackstopGulpEmissionsV2Event
  | BackstopDistributeEvent
  | BackstopRewardZoneAddEvent
  | BackstopRewardZoneRemoveEvent;

/**
 * Create a BackstopEventV1 from a RawEventResponse.
 * @param eventResponse - The RawEventResponse from the RPC to convert
 * @returns The BackstopV1Event or undefined if the EventResponse is not a BackstopEvent
 */
export function backstopEventV1FromEventResponse(
  eventResponse: rpc.Api.RawEventResponse
): BackstopV1Event | undefined {
  if (
    eventResponse.type !== 'contract' ||
    eventResponse.topic.length === 0 ||
    eventResponse.contractId === undefined
  ) {
    return undefined;
  }
  const baseEvent = backstopEventFromEventResponse(eventResponse);
  if (baseEvent === undefined) {
    try {
      // NOTE: Decode RawEventResponse to ScVals. Do not update to `rpc.Api.EventResponse`. This
      // will cause failures in the conversion functions due to the requirement that the exact same
      // `js-xdr` code is used. (the same version from two different sources does not work)
      const topic_scval = eventResponse.topic.map((topic) => xdr.ScVal.fromXDR(topic, 'base64'));
      const value_scval = xdr.ScVal.fromXDR(eventResponse.value, 'base64');

      // The first topic is the event name as a symbol
      const eventString = scValToNative(topic_scval[0]) as string;

      const baseEvent = {
        id: eventResponse.id,
        contractId: eventResponse.contractId,
        eventType: eventString as BackstopEventType,
        ledger: eventResponse.ledger,
        ledgerClosedAt: eventResponse.ledgerClosedAt,
        txHash: eventResponse.txHash,
      };
      switch (eventString) {
        case BackstopEventType.GulpEmissions: {
          if (topic_scval.length !== 1) {
            return undefined;
          }
          const newBLND = BigInt(scValToNative(value_scval));
          return {
            ...baseEvent,
            contractType: BlendContractType.Backstop,
            eventType: BackstopEventType.GulpEmissions,
            newBLND: newBLND,
          };
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
            contractType: BlendContractType.Backstop,
            eventType: BackstopEventType.RewardZone,
            toAdd: toAdd,
            toRemove: toRemove,
          };
        }

        default:
          return undefined;
      }
    } catch (e) {
      // conversion functions throw on a malformed (or non-backstop) events
      // return undefined in this case
      return undefined;
    }
  } else {
    return baseEvent;
  }
}

/**
 * Create a BackstopEventV2 from a RawEventResponse.
 * @param eventResponse - The RawEventResponse from the RPC to convert
 * @returns The BackstopV2Event or undefined if the EventResponse is not a BackstopEvent
 */
export function backstopEventV2FromEventResponse(
  eventResponse: rpc.Api.RawEventResponse
): BackstopV2Event | undefined {
  if (
    eventResponse.type !== 'contract' ||
    eventResponse.topic.length === 0 ||
    eventResponse.contractId === undefined
  ) {
    return undefined;
  }
  const baseEvent = backstopEventFromEventResponse(eventResponse);
  if (baseEvent === undefined) {
    try {
      // NOTE: Decode RawEventResponse to ScVals. Do not update to `rpc.Api.EventResponse`. This
      // will cause failures in the conversion functions due to the requirement that the exact same
      // `js-xdr` code is used. (the same version from two different sources does not work)
      const topic_scval = eventResponse.topic.map((topic) => xdr.ScVal.fromXDR(topic, 'base64'));
      const value_scval = xdr.ScVal.fromXDR(eventResponse.value, 'base64');

      // The first topic is the event name as a symbol
      const eventString = scValToNative(topic_scval[0]) as string;

      const baseEvent = {
        id: eventResponse.id,
        contractId: eventResponse.contractId,
        eventType: eventString as BackstopEventType,
        ledger: eventResponse.ledger,
        ledgerClosedAt: eventResponse.ledgerClosedAt,
        txHash: eventResponse.txHash,
      };
      switch (eventString) {
        case BackstopEventType.GulpEmissions: {
          const valueAsVec = value_scval.vec();
          if (topic_scval.length !== 1 && valueAsVec.length != 2) {
            return undefined;
          }
          const newBackstopEmissions = BigInt(scValToNative(valueAsVec[0]));
          const newPoolEmissions = BigInt(scValToNative(valueAsVec[1]));
          return {
            ...baseEvent,
            contractType: BlendContractType.Backstop,
            eventType: BackstopEventType.GulpEmissions,
            newBackstopEmissions: newBackstopEmissions,
            newPoolEmissions: newPoolEmissions,
          };
        }
        case BackstopEventType.Distribute: {
          if (topic_scval.length !== 1) {
            return undefined;
          }
          const newEmissions = BigInt(scValToNative(value_scval));
          return {
            ...baseEvent,
            contractType: BlendContractType.Backstop,
            eventType: BackstopEventType.Distribute,
            newEmissions: newEmissions,
          };
        }
        case BackstopEventType.RewardZoneAdd: {
          const valueAsVec = value_scval.vec();
          if (topic_scval.length !== 1 || valueAsVec.length !== 2) {
            return undefined;
          }
          const toAdd = Address.fromScVal(valueAsVec[0]).toString();
          const toRemove = scValToNative(valueAsVec[1]);
          return {
            ...baseEvent,
            contractType: BlendContractType.Backstop,
            eventType: BackstopEventType.RewardZoneAdd,
            toAdd: toAdd,
            toRemove: toRemove,
          };
        }
        case BackstopEventType.RewardZoneRemove: {
          const valueAsVec = value_scval.vec();
          if (topic_scval.length !== 1) {
            return undefined;
          }
          const toRemove = Address.fromScVal(valueAsVec[0]).toString();
          return {
            ...baseEvent,
            contractType: BlendContractType.Backstop,
            eventType: BackstopEventType.RewardZoneRemove,
            toRemove: toRemove,
          };
        }

        default:
          return undefined;
      }
    } catch (e) {
      // conversion functions throw on a malformed (or non-backstop) events
      // return undefined in this case
      return undefined;
    }
  } else {
    return baseEvent;
  }
}

/**
 * Create a base BackstopEvent from a RawEventResponse.
 * @param eventResponse - The RawEventResponse from the RPC to convert
 * @returns The BackstopEvent or undefined if the EventResponse is not a BackstopEvent
 */
function backstopEventFromEventResponse(
  eventResponse: rpc.Api.RawEventResponse
): BackstopEvent | undefined {
  try {
    // NOTE: Decode RawEventResponse to ScVals. Do not update to `rpc.Api.EventResponse`. This
    // will cause failures in the conversion functions due to the requirement that the exact same
    // `js-xdr` code is used. (the same version from two different sources does not work)
    const topic_scval = eventResponse.topic.map((topic) => xdr.ScVal.fromXDR(topic, 'base64'));
    const value_scval = xdr.ScVal.fromXDR(eventResponse.value, 'base64');

    // The first topic is the event name as a symbol
    const eventString = scValToNative(topic_scval[0]) as string;

    const baseEvent = {
      id: eventResponse.id,
      contractId: eventResponse.contractId,
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
          contractType: BlendContractType.Backstop,
          eventType: BackstopEventType.Deposit,
          poolAddress: pool_address,
          from: from,
          amount: amount,
          sharesMinted: shares,
        };
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
          contractType: BlendContractType.Backstop,
          eventType: BackstopEventType.QueueWithdrawal,
          poolAddress: pool_address,
          from: from,
          shares: shares,
          expiration: expiration,
        };
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
          contractType: BlendContractType.Backstop,
          eventType: BackstopEventType.DequeueWithdrawal,
          poolAddress: pool_address,
          from: from,
          shares: shares,
        };
      }
      case BackstopEventType.Withdraw: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 3 || valueAsVec.length !== 2) {
          return undefined;
        }
        const pool_address = Address.fromScVal(topic_scval[1]).toString();
        const from = Address.fromScVal(topic_scval[2]).toString();
        const shares = BigInt(scValToNative(valueAsVec[0]));
        const tokensWithdrawn = BigInt(scValToNative(valueAsVec[1]));
        return {
          ...baseEvent,
          contractType: BlendContractType.Backstop,
          eventType: BackstopEventType.Withdraw,
          poolAddress: pool_address,
          from: from,
          shares: shares,
          tokensWithdrawn: tokensWithdrawn,
        };
      }
      case BackstopEventType.Claim: {
        if (topic_scval.length !== 2) {
          return undefined;
        }
        const from = Address.fromScVal(topic_scval[1]).toString();
        const amount = BigInt(scValToNative(value_scval));
        return {
          ...baseEvent,
          contractType: BlendContractType.Backstop,
          eventType: BackstopEventType.Claim,
          from: from,
          amount: amount,
        };
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
          contractType: BlendContractType.Backstop,
          eventType: BackstopEventType.Draw,
          poolAddress: pool_address,
          to: to,
          amount: amount,
        };
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
          contractType: BlendContractType.Backstop,
          eventType: BackstopEventType.Donate,
          poolAddress: pool_address,
          from: from,
          amount: amount,
        };
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
