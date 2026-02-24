export default function PoolDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-3xl font-bold">Position #{params.id}</h1>
      <p className="mt-4 text-text-secondary">
        Position detail — liquidity, range, unclaimed fees
      </p>
      {/* TODO: PositionDetail component with collect/increase/remove actions */}
    </main>
  );
}
