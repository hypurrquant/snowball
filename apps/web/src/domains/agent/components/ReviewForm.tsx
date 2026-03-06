"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Star, MessageSquare, Loader2 } from "lucide-react";
import { useSubmitReview } from "../hooks/useSubmitReview";

interface ReviewFormProps {
  agentId: bigint;
  onSuccess?: () => void;
}

export function ReviewForm({ agentId, onSuccess }: ReviewFormProps) {
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState("");
  const { submitReview, isPending, isConfirming } = useSubmitReview();

  const handleSubmit = async () => {
    if (score === 0) return;
    try {
      await submitReview({ agentId, score, comment });
      setScore(0);
      setComment("");
      onSuccess?.();
    } catch {
      // error handled by wallet
    }
  };

  const isLoading = isPending || isConfirming;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-ice-400" />
          Write a Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              className="p-0.5"
              onMouseEnter={() => setHoverScore(i)}
              onMouseLeave={() => setHoverScore(0)}
              onClick={() => setScore(i)}
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  i <= (hoverScore || score)
                    ? "fill-warning text-warning"
                    : "text-text-tertiary"
                }`}
              />
            </button>
          ))}
          {score > 0 && (
            <span className="text-sm text-text-secondary ml-2">
              {score}/5
            </span>
          )}
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          className="w-full h-20 rounded-lg bg-bg-input border border-border p-3 text-sm text-white placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-ice-400"
        />

        <Button
          onClick={handleSubmit}
          disabled={score === 0 || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isPending ? "Confirm in wallet..." : "Confirming..."}
            </>
          ) : (
            "Submit Review"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
