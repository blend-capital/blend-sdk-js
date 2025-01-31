export const SCALAR_7 = BigInt(10000000);
export const SCALAR_9 = BigInt(1000000000);
export const SCALAR_12 = BigInt(1000000000000);
export function toFixed(x: number, decimals = 7): bigint {
  return BigInt(Math.floor(x * 10 ** decimals));
}

export function toFloat(x: bigint, decimals = 7): number {
  return Number(x) / 10 ** decimals;
}

export function mulFloor(x: bigint, y: bigint, denominator: bigint): bigint {
  return mulDivFloor(x, y, denominator);
}

export function mulCeil(x: bigint, y: bigint, denominator: bigint): bigint {
  return mulDivCeil(x, y, denominator);
}

export function divFloor(x: bigint, y: bigint, denominator: bigint): bigint {
  return mulDivFloor(x, denominator, y);
}

export function divCeil(x: bigint, y: bigint, denominator: bigint): bigint {
  return mulDivCeil(x, denominator, y);
}

// Performs floor(x * y / z)
function mulDivFloor(x: bigint, y: bigint, z: bigint): bigint {
  const r = x * y;
  return r / z;
}

// Performs ceil(x * y / z)
function mulDivCeil(x: bigint, y: bigint, z: bigint): bigint {
  const r = x * y;
  const remainder = r % z;
  return r / z + (remainder > 0n ? 1n : 0n);
}
