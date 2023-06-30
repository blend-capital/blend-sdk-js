import { Address, Contract, xdr } from 'stellar-base';
import { u32, u64 } from '..';
import {
  ReserveEmissionMetadata,
  LiquidationMetadata,
  ReserveEmissionMetadataToXDR,
  LiquidationMetadataToXDR,
  ReserveConfig,
  RequestToXDR,
  Request,
} from '.';

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

    blnd_id,
    usdc_id,
  }: {
    admin: string;
    name: string;
    oracle: string;
    bstop_rate: u64;
    backstop_id: string;

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
        ((i) => Address.fromString(i).toScVal())(blnd_id),
        ((i) => Address.fromString(i).toScVal())(usdc_id),
      ],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Update the pool backstop take rate
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public update_pool({
    admin,
    backstop_take_rate,
  }: {
    admin: string;
    backstop_take_rate: u64;
  }): string {
    const invokeArgs = {
      method: 'update_pool',
      args: [
        ((i) => Address.fromString(i).toScVal())(admin),
        ((i) => xdr.ScVal.scvU64(xdr.Uint64.fromString(i.toString())))(backstop_take_rate),
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
    config,
  }: {
    admin: string;
    asset: string;
    config: ReserveConfig;
  }): string {
    const invokeArgs = {
      method: 'init_reserve',
      args: [
        ((i) => Address.fromString(i).toScVal())(admin),
        ((i) => Address.fromString(i).toScVal())(asset),
        ((i) => ReserveConfig.ReserveConfigToXDR(i))(config),
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
    config,
  }: {
    admin: string;
    asset: string;
    config: ReserveConfig;
  }): string {
    const invokeArgs = {
      method: 'update_reserve',
      args: [
        ((i) => Address.fromString(i).toScVal())(admin),
        ((i) => Address.fromString(i).toScVal())(asset),
        ((i) => ReserveConfig.ReserveConfigToXDR(i))(config),
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
  public get_reserve_config({ asset }: { asset: string }): string {
    const invokeArgs = {
      method: 'get_reserve_config',
      args: [((i) => Address.fromString(i).toScVal())(asset)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * @readonly - VIEW
   *
   * Get a reserve's data
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public get_reserve_data({ asset }: { asset: string }): string {
    const invokeArgs = {
      method: 'get_reserve_data',
      args: [((i) => Address.fromString(i).toScVal())(asset)],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * Submit "requests" containing actions from "from" to "to"
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public submit({
    from,
    spender,
    to,
    requests,
  }: {
    from: string;
    spender: string;
    to: string;
    requests: Array<Request>;
  }): string {
    const invokeArgs = {
      method: 'submit',
      args: [
        ((i) => Address.fromString(i).toScVal())(from),
        ((i) => Address.fromString(i).toScVal())(spender),
        ((i) => Address.fromString(i).toScVal())(to),
        ((i) => xdr.ScVal.scvVec(i.map((request) => RequestToXDR(request))))(requests),
      ],
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
  public update_status(): string {
    const invokeArgs = { method: 'update_status', args: [] };
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
   * @readonly - VIEW
   *
   * Get the pool config
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public get_pool_config(): string {
    const invokeArgs = {
      method: 'get_pool_config',
      args: [],
    };
    return this._contract.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  /**
   * @readonly - VIEW
   *
   * Get the emissions config for all reserves
   * @returns - Base64 XDR string of the InvokeHostOperation
   */
  public get_emissions_config(): string {
    const invokeArgs = {
      method: 'get_emissions_config',
      args: [],
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
