import { PoolDetailInterface } from "@/components/PoolDetailInterface";
import { Address } from "viem";

export default function PoolDetailPage({ params }: { params: { id: string } }) {
  const [token0, token1] = params.id.split("%2D"); // assuming URL-encoded '-'
  const t0 = token0?.includes("-") ? token0.split("-")[0] : token0;
  const t1 = token0?.includes("-") ? token0.split("-")[1] : token1;

  return (
    <main className="container mx-auto max-w-5xl py-12 px-4">
      <PoolDetailInterface token0={t0 as Address} token1={t1 as Address} />
    </main>
  );
}
