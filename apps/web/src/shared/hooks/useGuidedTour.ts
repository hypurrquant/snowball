"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "snowball-tour-completed";
export const TOUR_TOTAL_STEPS = 6;

export function useGuidedTour() {
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) setShowTour(true);
  }, []);

  const completeTour = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShowTour(false);
  };

  const nextStep = () => {
    if (currentStep >= TOUR_TOTAL_STEPS - 1) {
      completeTour();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  return {
    showTour,
    currentStep,
    nextStep,
    prevStep,
    completeTour,
    skipTour: completeTour,
  };
}
