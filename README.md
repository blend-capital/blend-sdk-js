# blend-sdk-js

Blend Protocol SDK for Javascript to assist in interacting with the Blend Protocol.

## Getting Started

1. Install it using npm:

```bash
npm install @blend-capital/blend-sdk
```

## Usage

Each Blend Protocol contract exports a contract class for interacting with the contract. Some contracts, like the Pool, include additional classes to help read ledger state.

NOTE: There is an outstanding issue passing XDR objects between packages. See the following issue for more details: https://github.com/stellar/js-stellar-base/issues/617

Both the [blend-utils](https://github.com/blend-capital/blend-utils) and [blend-ui](https://github.com/blend-capital/blend-ui) repositories make extensive use of this SDK for reference.

### Supply an Asset to a Pool

The contract class creates an operation as a base64 XDR string that can be used with the `@stellar/stellar-sdk` [TransactionBuilder class](https://stellar.github.io/js-stellar-sdk/TransactionBuilder.html). When interacting with Soroban contracts, the invoker must populate the `SorobanData` portion of the transaction. The `@stellar/stellar-sdk` provides an easy way to do this by simulating the transaction against an RPC. For more details about how to submit a Soroban operation to the Stellar network, please see: https://developers.stellar.org/docs/build/guides/transactions/invoke-contract-tx-sdk

```ts
import { PoolContract, RequestType } from '@blend-capital/blend-sdk';
import { xdr } from '@stellar/stellar-sdk';

const asset: Address = // C... the Address of the asset to lend
const user: Address = // G... some Address
const to_lend: bigint = // ... the amount to lend as a bigint fixed point number with the tokens decimals 

const pool_contract = new PoolContract(poolId);
const supply_op = xdr.Operation.fromXDR(
    pool_contract.submit({
        from: user,
        spender: user,
        to: user,
        requests: [
            {
                amount: to_lend,
                request_type: RequestType.SupplyCollateral,
                address: asset,
            },
        ],
    }),
    'base64'
);

// build a transaction with the operation and submit it to the network
```

To submit other actions against the pool, you can modify the `Requests` array to contain the actions to take against the pool for `from`, `spender`, and `to`.

### Read ledger data for a Pool and a User

Helper classes are included to help read ledger data for a pool from an RPC efficiently. The following code reads the ledger data for the pool, it's reserves, and the state of it's backstop.

```ts
import {
  Backstop,
  BackstopPool,
  BackstopPoolEst,
  BackstopPoolUser,
  BackstopPoolUserEst,
  Network,
  Pool,
  PoolEstimate,
  PoolOracle,
  PositionsEstimate,
} from '@blend-capital/blend-sdk';

const network: Network = {
  rpc: // rpc URL,
  passphrase: // Stellar network passphrase,
  // optional, allows you to connect to a local RPC instance
  opts: { allowHttp: true },
};

const backstop_id = // C... the address of the backstop contract
const pool_id = // C... the address of the pool contract
const user_id = // G... the address of a user that has taken a position in the pool

// Load the pool data from the ledger to check things like supported reserves, current interest rates
// and other pool specific information like emissions.
const pool = await Pool.load(network, pool_id);

// If price is needed, load the pool's oracle.
const pool_oracle = await pool.loadOracle();

// Additional estimates aggregate information using oracle prices. For example,
// the PoolEstimate class calculates things like total value supplied and borrowed.
const pool_est = PoolEstimate.build(pool.reserves, pool_oracle);

// The pool also allows you to directly load a user's position and emissions information.
const pool_user = await pool.loadUser(user_id);

// Additional estimates for their positions calculate things like borrow limit, net apr, ect.
const user_est = PositionsEstimate.build(pool, pool_oracle, pool_user.positions);

// Load the backstop data from the ledger to check things like the status of the backstop token and the
// configuration of the backstop
const backstop = await Backstop.load(network, backstop_id);

// Load a pool's backstop data to get information like backstop size, Q4W percentage, and more.
const backstop_pool = await BackstopPool.load(network, backstop_id, pool_id);

// Additional estimates calculate the total number of BLND/USDC tokens the backstop holds.
const backstop_pool_est = BackstopPoolEst.build(backstop.backstopToken, backstop_pool.poolBalance);

// Load a user's position in a pool's backstop
const backstop_pool_user = await BackstopPoolUser.load(network, backstop_id, pool_id, user_id);

// Additional estimates calcualte total number of BLND/USDC tokens the user holds the status
// of any queued withdrawals, and the unclaimed emissions.
const backstop_pool_user_est = BackstopPoolUserEst.build(backstop, backstop_pool, backstop_pool_user);
```
