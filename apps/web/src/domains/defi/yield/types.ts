export interface VaultData {
    address: `0x${string}`;
    strategy: `0x${string}`;
    want: `0x${string}`;
    wantSymbol: string;
    name: string;
    description: string;
    tvl: bigint | undefined;
    totalSupply: bigint | undefined;
    pricePerShare: bigint | undefined;
    userShares: bigint | undefined;
    lastHarvest: bigint | undefined;
    paused: boolean | undefined;
    withdrawFee: bigint | undefined;
}

export type FieldKey = "tvl" | "totalSupply" | "pricePerShare" | "userShares" | "lastHarvest" | "paused" | "withdrawFee";
