import { Address, rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { BaseBlendEvent, BlendContractType } from '../base_event.js';
import { AuctionData, PoolContract } from './index.js';
import { ReserveConfig } from './reserve_types.js';

export enum PoolEventType {
  SetAdmin = 'set_admin',
  UpdatePool = 'update_pool',
  QueueSetReserve = 'queue_set_reserve',
  CancelSetReserve = 'cancel_set_reserve',
  SetReserve = 'set_reserve',
  SetStatus = 'set_status',
  UpdateEmissions = 'update_emissions',
  ReserveEmissionUpdate = 'reserve_emission_update',
  Claim = 'claim',
  NewLiquidationAuction = 'new_liquidation_auction',
  NewAuction = 'new_auction',
  BadDebt = 'bad_debt',
  Supply = 'supply',
  Withdraw = 'withdraw',
  SupplyCollateral = 'supply_collateral',
  WithdrawCollateral = 'withdraw_collateral',
  Borrow = 'borrow',
  Repay = 'repay',
  FillAuction = 'fill_auction',
  DeleteLiquidationAuction = 'delete_liquidation_auction',
}

export interface BasePoolEvent extends BaseBlendEvent {
  contractType: BlendContractType.Pool;
}

export interface PoolSetAdminEvent extends BasePoolEvent {
  eventType: PoolEventType.SetAdmin;
  oldAdmin: string;
  newAdmin: string;
}

export interface PoolUpdatePoolEvent extends BasePoolEvent {
  eventType: PoolEventType.UpdatePool;
  admin: string;
  backstopTakeRate: number;
  maxPositions: number;
}

export interface PoolQueueSetReserveEvent extends BasePoolEvent {
  eventType: PoolEventType.QueueSetReserve;
  admin: string;
  assetId: string;
  reserveConfig: ReserveConfig;
}

export interface PoolCancelSetReserveEvent extends BasePoolEvent {
  eventType: PoolEventType.CancelSetReserve;
  admin: string;
  assetId: string;
}

export interface PoolSetReserveEvent extends BasePoolEvent {
  eventType: PoolEventType.SetReserve;
  assetId: string;
  assetIndex: number;
}

export interface PoolSetStatusEvent extends BasePoolEvent {
  eventType: PoolEventType.SetStatus;
  admin: string | undefined;
  status: number;
}

export interface PoolUpdateEmissionsEvent extends BasePoolEvent {
  eventType: PoolEventType.UpdateEmissions;
  newBLND: bigint;
}

export interface PoolReserveEmissionUpdateEvent extends BasePoolEvent {
  eventType: PoolEventType.ReserveEmissionUpdate;
  reserveTokenId: number;
  eps: number;
  expiration: number;
}

export interface PoolClaimEvent extends BasePoolEvent {
  eventType: PoolEventType.Claim;
  from: string;
  reserveTokenIds: number[];
  amount: bigint;
}

export interface PoolNewLiquidationAuctionEvent extends BasePoolEvent {
  eventType: PoolEventType.NewLiquidationAuction;
  user: string;
  auctionData: AuctionData;
}

export interface PoolNewAuctionEvent extends BasePoolEvent {
  eventType: PoolEventType.NewAuction;
  auctionType: number;
  auctionData: AuctionData;
}

export interface PoolBadDebtEvent extends BasePoolEvent {
  eventType: PoolEventType.BadDebt;
  user: string;
  assetId: string;
  dTokens: bigint;
}

export interface PoolSupplyEvent extends BasePoolEvent {
  eventType: PoolEventType.Supply;
  assetId: string;
  from: string;
  amount: bigint;
  bTokensMinted: bigint;
}

export interface PoolWithdrawEvent extends BasePoolEvent {
  eventType: PoolEventType.Withdraw;
  assetId: string;
  from: string;
  amount: bigint;
  bTokensBurned: bigint;
}

export interface PoolSupplyCollateralEvent extends BasePoolEvent {
  eventType: PoolEventType.SupplyCollateral;
  assetId: string;
  from: string;
  amount: bigint;
  bTokensMinted: bigint;
}

export interface PoolWithdrawCollateralEvent extends BasePoolEvent {
  eventType: PoolEventType.WithdrawCollateral;
  assetId: string;
  from: string;
  amount: bigint;
  bTokensBurned: bigint;
}

export interface PoolBorrowEvent extends BasePoolEvent {
  eventType: PoolEventType.Borrow;
  assetId: string;
  from: string;
  amount: bigint;
  dTokensMinted: bigint;
}

export interface PoolRepayEvent extends BasePoolEvent {
  eventType: PoolEventType.Repay;
  assetId: string;
  from: string;
  amount: bigint;
  dTokensBurned: bigint;
}

export interface PoolFillAuctionEvent extends BasePoolEvent {
  eventType: PoolEventType.FillAuction;
  user: string;
  auctionType: number;
  from: string;
  fillAmount: bigint;
}

export interface PoolDeleteLiquidationAuctionEvent extends BasePoolEvent {
  eventType: PoolEventType.DeleteLiquidationAuction;
  user: string;
}

export type PoolEvent =
  | PoolSetAdminEvent
  | PoolUpdatePoolEvent
  | PoolQueueSetReserveEvent
  | PoolCancelSetReserveEvent
  | PoolSetReserveEvent
  | PoolSetStatusEvent
  | PoolUpdateEmissionsEvent
  | PoolReserveEmissionUpdateEvent
  | PoolClaimEvent
  | PoolNewLiquidationAuctionEvent
  | PoolNewAuctionEvent
  | PoolBadDebtEvent
  | PoolSupplyEvent
  | PoolWithdrawEvent
  | PoolSupplyCollateralEvent
  | PoolWithdrawCollateralEvent
  | PoolBorrowEvent
  | PoolRepayEvent
  | PoolFillAuctionEvent
  | PoolDeleteLiquidationAuctionEvent;

/**
 * Create a PoolEvent from a RawEventResponse.
 * @param eventResponse - The RawEventResponse from the RPC to convert
 * @returns The PoolEvent or undefined if the EventResponse is not a PoolEvent
 */
export function poolEventFromEventResponse(
  eventResponse: rpc.Api.RawEventResponse
): PoolEvent | undefined {
  if (
    eventResponse.type !== 'contract' ||
    eventResponse.topic.length === 0 ||
    eventResponse.contractId === undefined
  ) {
    return undefined;
  }

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
      contractType: BlendContractType.Pool,
      eventType: eventString as PoolEventType,
      ledger: eventResponse.ledger,
      ledgerClosedAt: eventResponse.ledgerClosedAt,
      txHash: eventResponse.txHash,
    };
    switch (eventString) {
      case PoolEventType.SetAdmin: {
        if (topic_scval.length !== 2) {
          return undefined;
        }
        const old_admin = Address.fromScVal(topic_scval[1]).toString();
        const new_admin = Address.fromScVal(value_scval).toString();
        return {
          ...baseEvent,
          eventType: PoolEventType.SetAdmin,
          oldAdmin: old_admin,
          newAdmin: new_admin,
        } as PoolSetAdminEvent;
      }
      case PoolEventType.UpdatePool: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 2 || valueAsVec?.length !== 2) {
          return undefined;
        }
        const admin = Address.fromScVal(topic_scval[1]).toString();
        const backstopTakeRate = Number(scValToNative(valueAsVec[0]));
        const maxPositions = Number(scValToNative(valueAsVec[1]));
        if (isNaN(backstopTakeRate) || isNaN(maxPositions)) {
          return undefined;
        }
        return {
          ...baseEvent,
          eventType: PoolEventType.UpdatePool,
          admin: admin,
          backstopTakeRate: backstopTakeRate,
          maxPositions: maxPositions,
        } as PoolUpdatePoolEvent;
      }
      case PoolEventType.QueueSetReserve: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 2 || valueAsVec?.length !== 2) {
          return undefined;
        }
        const admin = Address.fromScVal(topic_scval[1]).toString();
        const asset_id = Address.fromScVal(valueAsVec[0]).toString();
        const reserve_config = ReserveConfig.fromScVal(valueAsVec[1]);
        return {
          ...baseEvent,
          eventType: PoolEventType.QueueSetReserve,
          admin: admin,
          assetId: asset_id,
          reserveConfig: reserve_config,
        } as PoolQueueSetReserveEvent;
      }
      case PoolEventType.CancelSetReserve: {
        if (topic_scval.length !== 2) {
          return undefined;
        }
        const admin = Address.fromScVal(topic_scval[1]).toString();
        const asset_id = Address.fromScVal(value_scval).toString();
        return {
          ...baseEvent,
          eventType: PoolEventType.CancelSetReserve,
          admin: admin,
          assetId: asset_id,
        } as PoolCancelSetReserveEvent;
      }
      case PoolEventType.SetReserve: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 1 || valueAsVec?.length !== 2) {
          return undefined;
        }
        const asset_id = Address.fromScVal(valueAsVec[0]).toString();
        const asset_index = Number(scValToNative(valueAsVec[1]));
        if (isNaN(asset_index)) {
          return undefined;
        }
        return {
          ...baseEvent,
          eventType: PoolEventType.SetReserve,
          assetId: asset_id,
          assetIndex: asset_index,
        } as PoolSetReserveEvent;
      }
      case PoolEventType.SetStatus: {
        if (topic_scval.length !== 1 && topic_scval.length !== 2) {
          return undefined;
        }
        const admin =
          topic_scval.length === 2 ? Address.fromScVal(topic_scval[1]).toString() : undefined;
        const status = Number(scValToNative(value_scval));
        if (isNaN(status)) {
          return undefined;
        }
        return {
          ...baseEvent,
          eventType: PoolEventType.SetStatus,
          admin: admin,
          status: status,
        } as PoolSetStatusEvent;
      }
      case PoolEventType.UpdateEmissions: {
        if (topic_scval.length !== 1) {
          return undefined;
        }
        const new_blnd = BigInt(scValToNative(value_scval));
        return {
          ...baseEvent,
          eventType: PoolEventType.UpdateEmissions,
          newBLND: new_blnd,
        } as PoolUpdateEmissionsEvent;
      }
      case PoolEventType.ReserveEmissionUpdate: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 1 || valueAsVec?.length !== 3) {
          return undefined;
        }
        const reserveTokenId = scValToNative(valueAsVec[0]);
        const eps = Number(scValToNative(valueAsVec[1]));
        const expiration = Number(scValToNative(valueAsVec[2]));
        if (isNaN(eps) || isNaN(expiration)) {
          return undefined;
        }
        return {
          ...baseEvent,
          eventType: PoolEventType.ReserveEmissionUpdate,
          reserveTokenId: reserveTokenId,
          eps: eps,
          expiration: expiration,
        } as PoolReserveEmissionUpdateEvent;
      }
      case PoolEventType.Claim: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 2 || valueAsVec?.length !== 2) {
          return undefined;
        }
        const from = Address.fromScVal(topic_scval[1]).toString();
        const reserveTokenIds = valueAsVec[0].vec().map((val) => {
          const as_num = Number(scValToNative(val));
          if (isNaN(as_num)) {
            throw Error('Invalid event');
          }
          return as_num;
        });
        const amount = BigInt(scValToNative(valueAsVec[1]));
        return {
          ...baseEvent,
          eventType: PoolEventType.Claim,
          from: from,
          reserveTokenIds: reserveTokenIds,
          amount: amount,
        } as PoolClaimEvent;
      }
      case PoolEventType.NewLiquidationAuction: {
        if (topic_scval.length !== 2) {
          return undefined;
        }
        const user = Address.fromScVal(topic_scval[1]).toString();
        const auctionData = PoolContract.spec.funcResToNative('get_auction', value_scval);
        return {
          ...baseEvent,
          eventType: PoolEventType.NewLiquidationAuction,
          user: user,
          auctionData: auctionData,
        } as PoolNewLiquidationAuctionEvent;
      }
      case PoolEventType.NewAuction: {
        if (topic_scval.length !== 2) {
          return undefined;
        }
        const auctionType = Number(scValToNative(topic_scval[1]));
        if (isNaN(auctionType)) {
          return undefined;
        }
        const auctionData = PoolContract.spec.funcResToNative('get_auction', value_scval);
        return {
          ...baseEvent,
          eventType: PoolEventType.NewAuction,
          auctionType: auctionType,
          auctionData: auctionData,
        } as PoolNewAuctionEvent;
      }
      case PoolEventType.BadDebt: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 2 || valueAsVec?.length !== 2) {
          return undefined;
        }
        const user = Address.fromScVal(topic_scval[1]).toString();
        const assetId = Address.fromScVal(valueAsVec[0]).toString();
        const dTokens = BigInt(scValToNative(valueAsVec[1]));
        return {
          ...baseEvent,
          eventType: PoolEventType.BadDebt,
          user: user,
          assetId: assetId,
          dTokens: dTokens,
        } as PoolBadDebtEvent;
      }
      case PoolEventType.Supply:
      case PoolEventType.Withdraw:
      case PoolEventType.SupplyCollateral:
      case PoolEventType.WithdrawCollateral:
      case PoolEventType.Borrow:
      case PoolEventType.Repay: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 3 || valueAsVec?.length !== 2) {
          return undefined;
        }
        const assetId = Address.fromScVal(topic_scval[1]).toString();
        const from = Address.fromScVal(topic_scval[2]).toString();
        const amount = BigInt(scValToNative(valueAsVec[0]));
        const reserveTokens = BigInt(scValToNative(valueAsVec[1]));
        switch (eventString) {
          case PoolEventType.Supply:
            return {
              ...baseEvent,
              eventType: PoolEventType.Supply,
              assetId: assetId,
              from: from,
              amount: amount,
              bTokensMinted: reserveTokens,
            } as PoolSupplyEvent;
          case PoolEventType.Withdraw:
            return {
              ...baseEvent,
              eventType: PoolEventType.Withdraw,
              assetId: assetId,
              from: from,
              amount: amount,
              bTokensBurned: reserveTokens,
            } as PoolWithdrawEvent;
          case PoolEventType.SupplyCollateral:
            return {
              ...baseEvent,
              eventType: PoolEventType.SupplyCollateral,
              assetId: assetId,
              from: from,
              amount: amount,
              bTokensMinted: reserveTokens,
            } as PoolSupplyCollateralEvent;
          case PoolEventType.WithdrawCollateral:
            return {
              ...baseEvent,
              eventType: PoolEventType.WithdrawCollateral,
              assetId: assetId,
              from: from,
              amount: amount,
              bTokensBurned: reserveTokens,
            } as PoolWithdrawCollateralEvent;
          case PoolEventType.Borrow:
            return {
              ...baseEvent,
              eventType: PoolEventType.Borrow,
              assetId: assetId,
              from: from,
              amount: amount,
              dTokensMinted: reserveTokens,
            } as PoolBorrowEvent;
          case PoolEventType.Repay:
            return {
              ...baseEvent,
              eventType: PoolEventType.Repay,
              assetId: assetId,
              from: from,
              amount: amount,
              dTokensBurned: reserveTokens,
            } as PoolRepayEvent;
          default:
            return undefined;
        }
      }
      case PoolEventType.FillAuction: {
        const valueAsVec = value_scval.vec();
        if (topic_scval.length !== 3 || valueAsVec?.length !== 2) {
          return undefined;
        }
        const user = Address.fromScVal(topic_scval[1]).toString();
        const auctionType = Number(scValToNative(topic_scval[2]));
        if (isNaN(auctionType)) {
          return undefined;
        }
        const from = Address.fromScVal(valueAsVec[0]).toString();
        const fillAmount = BigInt(scValToNative(valueAsVec[1]));
        return {
          ...baseEvent,
          eventType: PoolEventType.FillAuction,
          user: user,
          auctionType: auctionType,
          from: from,
          fillAmount: fillAmount,
        } as PoolFillAuctionEvent;
      }
      case PoolEventType.DeleteLiquidationAuction: {
        if (topic_scval.length !== 2) {
          return undefined;
        }
        const user = Address.fromScVal(topic_scval[1]).toString();
        return {
          ...baseEvent,
          eventType: PoolEventType.DeleteLiquidationAuction,
          user: user,
        } as PoolDeleteLiquidationAuctionEvent;
      }
      default:
        return undefined;
    }
  } catch (e) {
    // conversion functions throw on a malformed (or non-pool) events
    // return undefined in this case
    return undefined;
  }
}
