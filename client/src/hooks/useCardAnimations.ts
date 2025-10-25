// client/src/hooks/useCardAnimations.ts
import { useState, useEffect, useCallback } from "react";

/**
 * Represents the possible animation types for cards
 */
export type CardAnimationType = "draw" | "discard" | "swap" | "reveal" | "none";

/**
 * Configuration for card animations
 */
interface AnimationConfig {
  duration: number;
  className: string;
}

/**
 * Maps animation types to their configuration
 */
const ANIMATION_CONFIGS: Record<CardAnimationType, AnimationConfig> = {
  draw: { duration: 500, className: "animate-cardDraw" },
  discard: { duration: 500, className: "animate-cardDiscard" },
  swap: { duration: 500, className: "animate-cardSwap" },
  reveal: { duration: 500, className: "animate-bounce" },
  none: { duration: 0, className: "" },
};

/**
 * Custom hook for managing card animations
 *
 * This hook provides a clean interface for handling card animations,
 * including automatic cleanup and state management.
 *
 * @returns {Object} Animation state and control functions
 * @returns {string|null} currentAnimation - The currently active animation type
 * @returns {string|null} animatingCardId - The ID of the card being animated
 * @returns {Function} triggerAnimation - Function to trigger a new animation
 * @returns {Function} clearAnimation - Function to clear the current animation
 *
 * @example
 * ```tsx
 * const { currentAnimation, animatingCardId, triggerAnimation, clearAnimation } = useCardAnimations();
 *
 * // Trigger a draw animation
 * triggerAnimation("draw", "card-123");
 *
 * // Clear current animation
 * clearAnimation();
 * ```
 */
export const useCardAnimations = () => {
  const [currentAnimation, setCurrentAnimation] =
    useState<CardAnimationType | null>(null);
  const [animatingCardId, setAnimatingCardId] = useState<string | null>(null);

  /**
   * Triggers a card animation
   *
   * @param {CardAnimationType} animationType - The type of animation to trigger
   * @param {string} cardId - The ID of the card to animate
   */
  const triggerAnimation = useCallback(
    (animationType: CardAnimationType, cardId: string) => {
      if (animationType === "none") {
        setCurrentAnimation(null);
        setAnimatingCardId(null);
        return;
      }

      setCurrentAnimation(animationType);
      setAnimatingCardId(cardId);

      // Auto-clear animation after duration
      const config = ANIMATION_CONFIGS[animationType];
      if (config.duration > 0) {
        const timer = setTimeout(() => {
          setCurrentAnimation(null);
          setAnimatingCardId(null);
        }, config.duration);

        return () => clearTimeout(timer);
      }
    },
    []
  );

  /**
   * Clears the current animation
   */
  const clearAnimation = useCallback(() => {
    setCurrentAnimation(null);
    setAnimatingCardId(null);
  }, []);

  /**
   * Gets the CSS class for the current animation
   *
   * @returns {string} The CSS class name for the current animation
   */
  const getAnimationClass = useCallback((): string => {
    if (!currentAnimation) return "";
    return ANIMATION_CONFIGS[currentAnimation].className;
  }, [currentAnimation]);

  /**
   * Checks if a specific card is currently being animated
   *
   * @param {string} cardId - The ID of the card to check
   * @returns {boolean} True if the card is being animated
   */
  const isCardAnimating = useCallback(
    (cardId: string): boolean => {
      return animatingCardId === cardId && currentAnimation !== null;
    },
    [animatingCardId, currentAnimation]
  );

  return {
    currentAnimation,
    animatingCardId,
    triggerAnimation,
    clearAnimation,
    getAnimationClass,
    isCardAnimating,
  };
};

export default useCardAnimations;
