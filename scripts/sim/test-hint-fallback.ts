/**
 * Test: Liquity hint fallback to (0n, 0n) on error.
 * Run: npx tsx scripts/test-hint-fallback.ts
 */

import { getInsertPosition } from "../../apps/web/src/domains/defi/liquity/lib/liquityMath";

async function main() {
  // Mock readContract that always throws
  const failingReadContract = async (): Promise<unknown> => {
    throw new Error("RPC call failed");
  };

  const [upper, lower] = await getInsertPosition(
    failingReadContract,
    "0x0000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000002",
    [],
    [],
    0n,
    50000000000000000n, // 5%
  );

  if (upper === 0n && lower === 0n) {
    console.log("PASS: hint fallback returns (0n, 0n) on error");
    process.exit(0);
  } else {
    console.error(`FAIL: expected (0n, 0n), got (${upper}, ${lower})`);
    process.exit(1);
  }
}

main();
