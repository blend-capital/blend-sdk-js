import { Address, rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { Network } from '../index.js';
import { decodeEntryKey } from '../ledger_entry_helper.js';

/**
 * Ledger data for the Comet BLND/USDC LP
 */
export class BackstopToken {
  constructor(
    /**
     * The address of the comet pool
     */
    public id: string,
    /**
     * The amount of BLND in the comet LP
     */
    public blnd: bigint,
    /**
     * The amount of USDC in the comet LP
     */
    public usdc: bigint,
    /**
     * The number of shares in the comet LP
     */
    public shares: bigint,
    /**
     * The amount of BLND per LP token
     */
    public blndPerLpToken: number,
    /**
     * The amount of USDC per LP token
     */
    public usdcPerLpToken: number,
    /**
     * The price of the LP token in USDC
     */
    public lpTokenPrice: number
  ) {}

  /**
   * Load the backstop token data from the ledger
   * @param network - The network information to load the backstop from
   * @param id - The contract address of the backstop
   * @returns - The backstop token object
   */
  public static async load(
    network: Network,
    id: string,
    blndTkn: string,
    usdcTkn: string
  ): Promise<BackstopToken> {
    const stellarRpc = new rpc.Server(network.rpc, network.opts);
    const recordDataKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(id).toScAddress(),
        key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('AllRecordData')]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
    const totalSharesKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: Address.fromString(id).toScAddress(),
        key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('TotalShares')]),
        durability: xdr.ContractDataDurability.persistent(),
      })
    );
    const ledgerEntriesResp = await stellarRpc.getLedgerEntries(recordDataKey, totalSharesKey);
    let blnd: bigint | undefined;
    let usdc: bigint | undefined;
    let totalShares: bigint | undefined;
    for (const entry of ledgerEntriesResp.entries) {
      const ledgerData = entry.val;
      const key = decodeEntryKey(ledgerData.contractData().key());
      switch (key) {
        case 'AllRecordData': {
          const records = scValToNative(ledgerData.contractData().val());
          if (records != undefined) {
            blnd = records[blndTkn]?.balance;
            usdc = records[usdcTkn]?.balance;
          }
          break;
        }
        case 'TotalShares':
          totalShares = scValToNative(ledgerData.contractData().val());
          break;
        default:
          throw new Error(`Invalid backstop pool key: should not contain ${key}`);
      }
    }

    if (blnd === undefined || usdc === undefined || totalShares === undefined) {
      throw new Error('Invalid backstop token data');
    }

    const blndPerLpToken = Number(blnd) / Number(totalShares);
    const usdcPerLpToken = Number(usdc) / Number(totalShares);
    const lpTokenPrice = (Number(usdc) * 5) / Number(totalShares);

    return new BackstopToken(
      id,
      blnd,
      usdc,
      totalShares,
      blndPerLpToken,
      usdcPerLpToken,
      lpTokenPrice
    );
  }
}
