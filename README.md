# blend-sdk-js

Blend Protocol SDK for Javascript to assist in interacting with the Blend Protocol.

## Getting Started

1. Install it using npm:

```bash
npm install blend-sdk
```

## Usage

Each Blend Protocol contract exports an operation builder and some optional helpers to help interact with the protocol.

NOTE: There is an outstanding issue passing XDR objects between packages. See the following issue for more details: https://github.com/stellar/js-stellar-base/issues/617

Both the [blend-utils](https://github.com/blend-capital/blend-utils) and [blend-ui](https://github.com/blend-capital/blend-ui) repositories make extensive use of this SDK for reference.

### Supply an Asset to a Pool

Operation builder classes currently return XDR strings that can be decoded by `xdr.Operation.fromXdr` as shown in the example below:

```ts
import { Pool } from 'blend-sdk';
import { xdr } from 'soroban-client';

const asset: Address = // ... the Address of the asset to lend
const user: Address = // ... some Address
const to_lend: bigint = // ... the amount to lend as a bigint

const pool_op_builder = new Pool.PoolOpBuilder(poolId);
const supply_op = xdr.Operation.fromXDR(
    pool_op_builder.submit({
        from: user,
        spender: user,
        to: user,
        requests: [
            {
                amount: to_lend,
                request_type: 2, // supply as collateral
                address: asset,
            },
        ],
    }),
    'base64'
);

// build a transaction with the operation and submit it to the network
// see `soroban-client` docs for more info: https://github.com/stellar/js-soroban-client/tree/main#usage
```

TODO: Documentation and examples.