import { parseEther } from "viem";
import type { TroveData } from "../types";

export const DEMO_TROVES: TroveData[] = [
  {
    id: 1001n,
    coll: parseEther("50"),
    debt: parseEther("5000"),
    interestRate: parseEther("0.05"), // 5%
    icr: 250,
    status: 1, // active
  },
  {
    id: 1002n,
    coll: parseEther("100"),
    debt: parseEther("8000"),
    interestRate: parseEther("0.035"), // 3.5%
    icr: 312.5,
    status: 1,
  },
  {
    id: 1003n,
    coll: parseEther("25"),
    debt: parseEther("2000"),
    interestRate: parseEther("0.07"), // 7%
    icr: 312.5,
    status: 1,
  },
];
