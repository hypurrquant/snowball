"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Star, BarChart3 } from "lucide-react";
import type { ReputationData, Review } from "../types";

interface ReputationSectionProps {
  reputation: ReputationData | undefined;
  successRate: bigint | undefined;
  reviews: Review[];
  isLoading: boolean;
}

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= stars
              ? "fill-warning text-warning"
              : "text-text-tertiary"
          }`}
        />
      ))}
    </div>
  );
}

export function ReputationSection({
  reputation,
  successRate,
  reviews,
  isLoading,
}: ReputationSectionProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const scoreNum = reputation
    ? Number(reputation.reputationScore) / 100
    : 0;
  const successRateNum = successRate
    ? Number(successRate) / 100
    : 0;
  const totalInteractions = reputation
    ? Number(reputation.totalInteractions)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-ice-400" />
          Reputation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Summary */}
        <div className="rounded-xl bg-bg-input p-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">
              {scoreNum.toFixed(2)}
            </div>
            <div className="flex justify-center mt-1">
              <StarRating score={scoreNum} />
            </div>
            <div className="text-xs text-text-tertiary mt-1">Score</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {successRateNum.toFixed(1)}%
            </div>
            <div className="text-xs text-text-tertiary mt-1">Success Rate</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {totalInteractions}
            </div>
            <div className="text-xs text-text-tertiary mt-1">Interactions</div>
          </div>
        </div>

        {/* Reviews */}
        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-3">
            Reviews ({reviews.length})
          </h3>
          {reviews.length === 0 ? (
            <div className="text-center py-6 text-text-tertiary text-sm">
              No reviews yet
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {reviews.map((review, i) => (
                <div key={i} className="rounded-lg bg-bg-input p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <StarRating score={Number(review.score) / 100} />
                    <span className="text-xs text-text-tertiary">
                      {new Date(
                        Number(review.timestamp) * 1000
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-text-secondary">
                      {review.comment}
                    </p>
                  )}
                  <span className="text-xs text-text-tertiary">
                    {review.reviewer.slice(0, 6)}...{review.reviewer.slice(-4)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
