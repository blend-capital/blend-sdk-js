import { Address, Contract, xdr } from 'stellar-base';
import { i128, u32, u64 } from '..';
import {
  ReserveMetadata,
  ReserveEmissionMetadata,
  LiquidationMetadata,
  ReserveEmissionMetadataToXDR,
  ReserveMetadataToXDR,
  LiquidationMetadataToXDR,
} from '.';
import { bigintToI128 } from '../scval_converter';

export class PoolOpBuilder {
  _contract: Contract;

  constructor(address: string) {
    this._contract = new Contract(address);
  }

  /**
   * Initialize the Pool
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public initialize({
    admin,
    name,
    oracle,
    bstop_rate,
    backstop_id,
    b_token_hash,
    d_token_hash,
    blnd_id,
    usdc_id,
  }: {
    admin: string;
    name: string;
    oracle: string;
    bstop_rate: u64;
    backstop_id: string;
    b_token_hash: Buffer;
    d_token_hash: Buffer;
    blnd_id: string;
    usdc_id: string;
  }): string {
    const invokeArgs = {
      method: 'initialize',
      args: [
        ((i) => Address.fromString(i).toScVal())(admin),
        ((i) => xdr.ScVal.scvSymbol(i))(name),
        ((i) => Address.fromString(i).toScVal())(oracle),
        ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(bstop_rate),
        ((i) => Address.fromString(i).toScVal())(backstop_id),
        ((i) => xdr.ScVal.scvBytes(i))(b_token_hash),
        ((i) => xdr.ScVal.scvBytes(i))(d_token_hash),
        ((i) => Address.fromString(i).toScVal())(blnd_id),
        ((i) => Address.fromString(i).toScVal())(usdc_id),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Initialize a new reserve
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public init_reserve({
    admin,
    asset,
    metadata,
  }: {
    admin: string;
    asset: string;
    metadata: ReserveMetadata;
  }): string {
    const invokeArgs = {
      method: 'init_reserve',
      args: [
        ((i) => Address.fromString(i).toScVal())(admin),
        ((i) => Address.fromString(i).toScVal())(asset),
        ((i) => ReserveMetadataToXDR(i))(metadata),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Update an existing reserve
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public update_reserve({
    admin,
    asset,
    metadata,
  }: {
    admin: string;
    asset: string;
    metadata: ReserveMetadata;
  }): string {
    const invokeArgs = {
      method: 'update_reserve',
      args: [
        ((i) => Address.fromString(i).toScVal())(admin),
        ((i) => Address.fromString(i).toScVal())(asset),
        ((i) => ReserveMetadataToXDR(i))(metadata),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * @readonly - VIEW
   *
   * Get a reserve's configuration
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public reserve_config({ asset }: { asset: string }): string {
    const invokeArgs = {
      method: 'reserve_config',
      args: [((i) => Address.fromString(i).toScVal())(asset)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * @readonly - VIEW
   *
   * Get the configuration for a user
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public config({ user }: { user: string }): string {
    const invokeArgs = {
      method: 'config',
      args: [((i) => Address.fromString(i).toScVal())(user)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Supply "amount" of "asset" from "from"
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public supply({ from, asset, amount }: { from: string; asset: string; amount: i128 }): string {
    const invokeArgs = {
      method: 'supply',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(asset),
        ((i) => bigintToI128(i))(amount),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Withdraw "amount" of "asset" from "from" and send to "to"
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public withdraw({
    from,
    asset,
    amount,
    to,
  }: {
    from: string;
    asset: string;
    amount: i128;
    to: string;
  }): string {
    const invokeArgs = {
      method: 'withdraw',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(asset),
        ((i) => bigintToI128(i))(amount),
        ((i) => Address.fromString(i).toScVal())(to),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Borrow "amount" of "asset" from "from" and send to "to"
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public borrow({
    from,
    asset,
    amount,
    to,
  }: {
    from: string;
    asset: string;
    amount: i128;
    to: string;
  }): string {
    const invokeArgs = {
      method: 'borrow',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(asset),
        ((i) => bigintToI128(i))(amount),
        ((i) => Address.fromString(i).toScVal())(to),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Repay "amount" of "asset" from "from" for "on_behalf_of"
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public repay({
    from,
    asset,
    amount,
    on_behalf_of,
  }: {
    from: string;
    asset: string;
    amount: i128;
    on_behalf_of: string;
  }): string {
    const invokeArgs = {
      method: 'repay',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(asset),
        ((i) => bigintToI128(i))(amount),
        ((i) => Address.fromString(i).toScVal())(on_behalf_of),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * @readonly - VIEW
   *
   * Get the d rate for a reserve
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public get_d_rate({ asset }: { asset: string }): string {
    const invokeArgs = {
      method: 'get_d_rate',
      args: [((i) => Address.fromString(i).toScVal())(asset)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * @readonly - VIEW
   *
   * Get the b rate for a reserve
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public get_b_rate({ asset }: { asset: string }): string {
    const invokeArgs = {
      method: 'get_b_rate',
      args: [((i) => Address.fromString(i).toScVal())(asset)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Manage bad debt
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public bad_debt({ user }: { user: string }): string {
    const invokeArgs = {
      method: 'bad_debt',
      args: [((i) => Address.fromString(i).toScVal())(user)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Update the state of the pool based on market conditions
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public update_state(): string {
    const invokeArgs = { method: 'update_state', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * @admin
   *
   * Set the status of the pool
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public set_status({ admin, pool_status }: { admin: string; pool_status: u32 }): string {
    const invokeArgs = {
      method: 'set_status',
      args: [
        ((i) => Address.fromString(i).toScVal())(admin),
        ((i) => xdr.ScVal.scvU32(i))(pool_status),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Update the emissions for the next cycle
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public update_emissions(): string {
    const invokeArgs = { method: 'update_emissions', args: [] };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * @admin
   *
   * Update the emissions for the next cycle
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public set_emissions_config({
    admin,
    res_emission_metadata,
  }: {
    admin: string;
    res_emission_metadata: Array<ReserveEmissionMetadata>;
  }): string {
    const invokeArgs = {
      method: 'set_emissions_config',
      args: [
        ((i) => Address.fromString(i).toScVal())(admin),
        ((i) => xdr.ScVal.scvVec(i.map((j) => ReserveEmissionMetadataToXDR(j))))(
          res_emission_metadata
        ),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Claim emissions for a set of reserves
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public claim({
    from,
    reserve_token_ids,
    to,
  }: {
    from: string;
    reserve_token_ids: Array<u32>;
    to: string;
  }): string {
    const invokeArgs = {
      method: 'claim',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => xdr.ScVal.scvVec(i.map((j) => xdr.ScVal.scvU32(j))))(reserve_token_ids),
        ((i) => Address.fromString(i).toScVal())(to),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * @readonly - VIEW
   *
   * Get the emissions data for a reserve
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public get_reserve_emissions({ asset, token_type }: { asset: string; token_type: u32 }): string {
    const invokeArgs = {
      method: 'get_reserve_emissions',
      args: [
        ((i) => Address.fromString(i).toScVal())(asset),
        ((i) => xdr.ScVal.scvU32(i))(token_type),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Create a new liquidation auction
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public new_liquidation_auction({
    user,
    data,
  }: {
    user: string;
    data: LiquidationMetadata;
  }): string {
    const invokeArgs = {
      method: 'new_liquidation_auction',
      args: [
        ((i) => Address.fromString(i).toScVal())(user),
        ((i) => LiquidationMetadataToXDR(i))(data),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Delete a liquidation auction if the user is no longer eligible for liquidation
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public del_liquidation_auction({ user }: { user: string }): string {
    const invokeArgs = {
      method: 'del_liquidation_auction',
      args: [((i) => Address.fromString(i).toScVal())(user)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * @readonly - VIEW
   *
   * Get the details of an ongoing auction
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public get_auction({ auction_type, user }: { auction_type: u32; user: string }): string {
    const invokeArgs = {
      method: 'get_auction',
      args: [
        ((i) => xdr.ScVal.scvU32(i))(auction_type),
        ((i) => Address.fromString(i).toScVal())(user),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Create a new auction
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public new_auction({ auction_type }: { auction_type: u32 }): string {
    const invokeArgs = {
      method: 'new_auction',
      args: [((i) => xdr.ScVal.scvU32(i))(auction_type)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Fill an ongoing auction from "from"
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public fill_auction({
    from,
    auction_type,
    user,
  }: {
    from: string;
    auction_type: u32;
    user: string;
  }): string {
    const invokeArgs = {
      method: 'fill_auction',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => xdr.ScVal.scvU32(i))(auction_type),
        ((i) => Address.fromString(i).toScVal())(user),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }
}
