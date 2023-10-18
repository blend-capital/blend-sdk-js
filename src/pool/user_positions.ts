import { Address, Server, xdr } from 'soroban-client';
import { scvalToBigInt } from '../scval_converter.js';
import { Network, i128, u32 } from '../index.js';

export class UserPositions {
  constructor(
    public liabilities: Map<u32, i128>,
    public collateral: Map<u32, i128>,
    public supply: Map<u32, i128>
  ) {}
  static contractDataKey(poolId: string, userId: string): xdr.LedgerKey {
    const res: xdr.ScVal[] = [
      xdr.ScVal.scvSymbol('Positions'),
      Address.fromString(userId).toScVal(),
    ];
    return xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(poolId).toScAddress(),
        key: xdr.ScVal.scvVec(res),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
  }
  static async load(network: Network, poolId: string, userId: string): Promise<UserPositions> {
    const SorobanRpc = new Server(network.rpc, network.opts);
    const userPositionsKey = UserPositions.contractDataKey(poolId, userId);
    const postitionLedgerEntry = await SorobanRpc.getLedgerEntries(userPositionsKey);

    let userPositions: UserPositions | undefined = undefined;

    for (const entry of postitionLedgerEntry.entries) {
      const ledgerData = xdr.LedgerEntryData.fromXDR(entry.xdr, 'base64').contractData();
      let key: xdr.ScVal;
      switch (ledgerData.key().switch()) {
        case xdr.ScValType.scvVec():
          key = ledgerData.key().vec().at(0);
          break;
      }
      switch (key.sym().toString()) {
        case 'Positions':
          userPositions = UserPositions.fromContractDataXDR(entry.xdr);
          break;
      }
    }
    if (userPositions == undefined) {
      throw Error("Error: Unable to load user's positions");
    }
    return userPositions;
  }

  static fromContractDataXDR(xdr_string: string) {
    const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
      .contractData()
      .val()
      .map();

    if (data_entry_map == undefined) {
      throw Error('contract data value is not a map');
    }
    let liability_map: Map<u32, i128> | undefined;
    let collateral_map: Map<u32, i128> | undefined;
    let supply_map: Map<u32, i128> | undefined;

    for (const map_entry of data_entry_map) {
      switch (map_entry?.key()?.sym()?.toString()) {
        case 'liabilities': {
          liability_map = new Map<u32, i128>();
          const liabilities = map_entry.val().map();
          if (liabilities) {
            for (const liability of liabilities) {
              liability_map.set(liability.key().u32(), scvalToBigInt(liability.val()));
            }
          }
          break;
        }
        case 'collateral': {
          collateral_map = new Map<u32, i128>();
          const collaterals = map_entry.val().map();
          if (collaterals) {
            for (const collateral of collaterals) {
              collateral_map.set(collateral.key().u32(), scvalToBigInt(collateral.val()));
            }
          }

          break;
        }
        case 'supply': {
          supply_map = new Map<u32, i128>();
          const supplies = map_entry.val().map();
          if (supplies) {
            for (const supply of supplies) {
              supply_map.set(supply.key().u32(), scvalToBigInt(supply.val()));
            }
          }
          break;
        }
        default:
          throw Error(
            `User positions scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`
          );
      }
    }

    if (!liability_map || !collateral_map || !supply_map) {
      throw Error('User positions xdr_string is malformed');
    }
    return new UserPositions(liability_map, collateral_map, supply_map);
  }
}