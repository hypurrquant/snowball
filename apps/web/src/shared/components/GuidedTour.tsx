"use client";

import Link from "next/link";
import {
  Snowflake,
  Gift,
  TrendingUp,
  Vault,
  ArrowLeftRight,
  Zap,
  X,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useGuidedTour, TOUR_TOTAL_STEPS } from "@/shared/hooks/useGuidedTour";
import { useState } from "react";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: { label: string; href: string } | null;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Snowball DeFi",
    description:
      "The unified DeFi protocol on Creditcoin. Swap, Lend, Borrow, and Earn — all in one place.",
    icon: <Snowflake className="w-6 h-6" />,
    action: null,
  },
  {
    title: "Get Test Tokens",
    description:
      "Visit the Faucet to receive free test tokens (wCTC, USDC) for trying out the protocol.",
    icon: <Gift className="w-6 h-6" />,
    action: { label: "Go to Faucet", href: "/faucet" },
  },
  {
    title: "Earn Yield",
    description:
      "Supply your tokens to lending markets and earn interest automatically. Up to 12% APY.",
    icon: <TrendingUp className="w-6 h-6" />,
    action: { label: "Start Earning", href: "/earn/supply" },
  },
  {
    title: "Borrow sbUSD",
    description:
      "Use your crypto as collateral to mint sbUSD stablecoins or borrow other assets at low rates.",
    icon: <Vault className="w-6 h-6" />,
    action: { label: "Open a Trove", href: "/liquity/borrow" },
  },
  {
    title: "Swap Tokens",
    description:
      "Trade tokens instantly with deep liquidity across multiple pools on Creditcoin.",
    icon: <ArrowLeftRight className="w-6 h-6" />,
    action: { label: "Go to Swap", href: "/swap" },
  },
  {
    title: "Enable Gas-Free Transactions",
    description:
      "Set up a Smart Account to get gas sponsorship — transact on Snowball without holding native CTC.",
    icon: <Zap className="w-6 h-6" />,
    action: { label: "Set Up Smart Account", href: "/dashboard" },
  },
];

export function GuidedTour() {
  const { showTour, currentStep, nextStep, prevStep, skipTour } =
    useGuidedTour();
  const [dontShow, setDontShow] = useState(false);

  if (!showTour) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_TOTAL_STEPS - 1;
  const isFirst = currentStep === 0;

  const handleSkip = () => {
    skipTour();
  };

  const handleNext = () => {
    nextStep();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-bg-card border border-ice-400/20 shadow-[0_0_60px_rgba(96,165,250,0.15)] overflow-hidden">
        {/* Ice-blue top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-ice-400 via-ice-300 to-blue-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            Step {currentStep + 1} of {TOUR_TOTAL_STEPS}
          </span>
          <button
            onClick={handleSkip}
            className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-tertiary hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 px-6 pt-3">
          {Array.from({ length: TOUR_TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i <= currentStep
                  ? "bg-ice-400"
                  : "bg-border"
              } ${i === currentStep ? "flex-[2]" : "flex-1"}`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ice-400/20 to-blue-500/20 border border-ice-400/20 flex items-center justify-center text-ice-400 mb-5">
            {step.icon}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-2">{step.title}</h2>

          {/* Description */}
          <p className="text-text-secondary leading-relaxed text-sm mb-6">
            {step.description}
          </p>

          {/* Action link */}
          {step.action && (
            <Link
              href={step.action.href}
              onClick={skipTour}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ice-400/10 border border-ice-400/20 text-ice-400 text-sm font-medium hover:bg-ice-400/20 hover:border-ice-400/40 transition-all mb-6"
            >
              {step.action.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6">
          {/* Don't show again */}
          <label className="flex items-center gap-2 cursor-pointer group">
            <div
              onClick={() => setDontShow((v) => !v)}
              className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                dontShow
                  ? "bg-ice-400 border-ice-400"
                  : "border-border group-hover:border-ice-400/40"
              }`}
            >
              {dontShow && (
                <svg
                  viewBox="0 0 10 8"
                  className="w-2.5 h-2.5 text-white fill-none stroke-current stroke-[1.5]"
                >
                  <path d="M1 4l2.5 2.5L9 1" />
                </svg>
              )}
            </div>
            <span className="text-xs text-text-tertiary group-hover:text-text-secondary transition-colors">
              Don't show again
            </span>
          </label>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-white hover:bg-bg-hover transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ice-400 hover:bg-ice-500 text-white text-xs font-semibold transition-all hover:shadow-[0_0_16px_rgba(96,165,250,0.4)] active:scale-95"
            >
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
