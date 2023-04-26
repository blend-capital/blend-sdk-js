import { xdr } from 'stellar-base';

export function bigintToI128(value: bigint): xdr.ScVal {
  const hex = value.toString(16).replace(/^-/, '');
  if (hex.length > 32) {
    throw new Error('value overflow i128');
  }

  const buf = Buffer.alloc(16);
  buf.write(hex, 16 - Math.ceil(hex.length / 2), 'hex'); // BE

  // perform two's compliment if negative and i128:MIN is not passed
  if (value < 0) {
    // throw if MSB bit is 1 and is not i128:MIN
    if ((buf[0] & 0x80) != 0 && hex != '80000000000000000000000000000000') {
      throw new Error('value underflow i128');
    }

    twosComplimentInPlace(buf, 16);
  } else {
    if ((buf[0] & 0x80) != 0) {
      throw new Error('value overflow i128');
    }
  }

  // store binary in xdr i128 parts
  const lo = new xdr.Uint64(
    parseInt(buf.subarray(12, 16).toString('hex'), 16),
    parseInt(buf.subarray(8, 12).toString('hex'), 16)
  );
  const hi = new xdr.Uint64(
    parseInt(buf.subarray(4, 8).toString('hex'), 16),
    parseInt(buf.subarray(0, 4).toString('hex'), 16)
  );

  return xdr.ScVal.scvI128(new xdr.Int128Parts({ lo, hi }));
}

export function scvalToBigInt(scval: xdr.ScVal): bigint {
  switch (scval.switch()) {
    case xdr.ScValType.scvI128(): {
      const parts = scval.i128();
      const u64_lo = parts.lo();
      const u64_high = parts.hi();

      // build BE buffer
      const buf = Buffer.alloc(16);
      buf.writeInt32BE(u64_lo.low, 12);
      buf.writeInt32BE(u64_lo.high, 8);
      buf.writeInt32BE(u64_high.low, 4);
      buf.writeInt32BE(u64_high.high, 0);

      // perform two's compliment if necessary
      if ((buf[0] & 0x80) != 0) {
        twosComplimentInPlace(buf, 16);
        return BigInt('0x' + buf.toString('hex')) * BigInt(-1);
      } else {
        return BigInt('0x' + buf.toString('hex'));
      }
    }
    default: {
      throw new Error(`Invalid type for scvalToBigInt: ${scval?.switch().name}`);
    }
  }
}

export function scvalToNumber(scval: xdr.ScVal): number {
  switch (scval.switch()) {
    case xdr.ScValType.scvU64(): {
      const parts = scval.u64();

      // build BE buffer
      const buf = Buffer.alloc(8);
      buf.writeUInt32BE(parts.low, 4);
      buf.writeUInt32BE(parts.high, 0);

      return parseInt(buf.toString('hex'), 16);
    }
    case xdr.ScValType.scvU32(): {
      return scval.u32();
    }
    default: {
      throw new Error(`Invalid type for scvalToNumber: ${scval?.switch().name}`);
    }
  }
}

export function scvalToString(scval: xdr.ScVal): string {
  switch (scval.switch()) {
    case xdr.ScValType.scvBytes(): {
      const buffer = scval.bytes();
      return buffer.toString('hex');
    }
    default: {
      throw new Error(`Invalid type for scvalToString: ${scval?.switch().name}`);
    }
  }
}

/**
 * Perform BE two's compliment on the input buffer by reference
 */
function twosComplimentInPlace(buf: Buffer, bytes: number) {
  // iterate from LSByte first to carry the +1 if necessary
  let i = bytes - 1;
  let add_one = true;
  while (i >= 0) {
    let inverse = ~buf[i];
    if (add_one) {
      if (inverse == -1) {
        // addition will overflow
        inverse = 0;
      } else {
        inverse += 1;
        add_one = false;
      }
    }
    buf[i] = inverse;
    i -= 1;
  }
}
