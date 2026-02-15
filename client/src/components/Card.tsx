// client/src/components/Card.tsx - Updated with swipe gestures and enhanced design
import React, { useState, useEffect, useMemo } from "react";
import { getCardImagePath } from "../utils/cardImageUtils";

/**
 * Represents the possible suits for a playing card
 */
export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades";

/**
 * Represents the possible ranks for a playing card
 */
export type CardRank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

/**
 * Represents the possible animation types for card interactions
 */
export type CardAnimation = "draw" | "discard" | "swap" | "reveal" | "none";

/**
 * Animation configuration constants
 */
const ANIMATION_DURATION_MS = 500;

/**
 * Props for the Card component
 *
 * @interface CardProps
 * @property {CardSuit} [suit] - The suit of the card (hearts, diamonds, clubs, spades)
 * @property {CardRank} [rank] - The rank of the card (A, 2-10, J, Q, K)
 * @property {boolean} [isRevealed=false] - Whether the card is face-up and visible
 * @property {boolean} [isSelected=false] - Whether the card is currently selected
 * @property {boolean|null} [isHighlighted=false] - Whether the card should be highlighted (for power usage)
 * @property {() => void} [onClick] - Callback function when the card is clicked
 * @property {CardAnimation} [animate="none"] - Animation type to apply to the card
 * @property {() => void} [onSwipeDown] - Callback function when card is swiped down (for discard)
 * @property {boolean} [swipeable=false] - Whether the card can be swiped to discard
 */
interface CardProps {
  suit?: CardSuit;
  rank?: CardRank;
  isRevealed?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean | null;
  onClick?: () => void;
  animate?: CardAnimation;
  onSwipeDown?: () => void;
  swipeable?: boolean;
}

/**
 * Card component for displaying playing cards in the Declare card game.
 *
 * This component handles both face-down (unrevealed) and face-up (revealed) card states,
 * with support for animations, selection highlighting, and power usage highlighting.
 * The component is fully accessible with proper ARIA labels and keyboard support.
 *
 * @param {CardProps} props - The component props
 * @returns {JSX.Element} The rendered card component
 *
 * @example
 * ```tsx
 * <Card
 *   suit="hearts"
 *   rank="A"
 *   isRevealed={true}
 *   isSelected={false}
 *   onClick={() => console.log('Card clicked')}
 *   animate="draw"
 * />
 * ```
 */
const Card: React.FC<CardProps> = ({
  suit,
  rank,
  isRevealed = false,
  isSelected = false,
  isHighlighted = false,
  onClick,
  animate = "none",
  onSwipeDown,
  swipeable = false,
}) => {
  const [animationClass, setAnimationClass] = useState("");
  const [swipeState, setSwipeState] = useState<{
    isSwiping: boolean;
    startY: number;
    startX: number;
    currentY: number;
    currentX: number;
  } | null>(null);

  /**
   * Maps animation types to their corresponding CSS classes
   */
  const getAnimationClass = (animationType: CardAnimation): string => {
    switch (animationType) {
      case "draw":
        return "animate-cardDraw";
      case "discard":
        return "animate-cardDiscard";
      case "swap":
        return "animate-cardSwap";
      case "reveal":
        return "animate-bounce";
      default:
        return "";
    }
  };


  /**
   * Generates the CSS classes for card styling based on current state
   * Memoized to prevent unnecessary recalculations on every render
   */
  const cardStyles = useMemo((): string => {
    // Fixed dimensions for all cards - uniform size regardless of state
    // overflow-hidden ensures inner content doesn't affect outer size
    // Revealed cards are 10% smaller, hidden cards use uniform-card
    const sizeClass = isRevealed ? "revealed-card-size" : "uniform-card";
    const baseStyles =
      `${sizeClass} rounded-lg shadow-lg cursor-pointer transform transition-all duration-200 hover:scale-110 hover:shadow-2xl hover:-translate-y-1 box-border flex-shrink-0 overflow-hidden`;
    // Only add border for revealed cards, hidden cards have no border
    // Nice rounded borders for revealed cards with elegant styling
    const borderStyles = isRevealed
      ? "revealed-card-border"
      : "";
    const backgroundStyles = isRevealed
      ? "bg-white"
      : "bg-blue-500 pattern-cross-dots-lg";
    const selectionStyles = isSelected
      ? "shadow-lg"
      : "";
    const highlightStyles = isHighlighted
      ? "shadow-lg"
      : "";
    const tempRevealGlow =
      isRevealed && isHighlighted
        ? "shadow-lg"
        : "";
    const animationStyles = animationClass;
    const pulseStyles = isHighlighted ? "animate-pulse" : "";
    const bounceStyles = tempRevealGlow ? "animate-bounce" : "";

    return [
      baseStyles,
      borderStyles,
      backgroundStyles,
      selectionStyles,
      highlightStyles,
      tempRevealGlow,
      animationStyles,
      pulseStyles,
      bounceStyles,
    ]
      .filter(Boolean)
      .join(" ");
  }, [isRevealed, isSelected, isHighlighted, animationClass]);

  // Use Tailwind responsive classes with explicit sizing - same for all cards
  // Note: uniform-card CSS class enforces the dimensions with !important
  const dimensionClasses = "w-20 h-32 md:w-24 md:h-36 lg:w-28 lg:h-44";

  /**
   * Calculates swipe transform styles
   */
  const swipeTransform = useMemo((): React.CSSProperties => {
    if (!swipeState) return {};
    
    const deltaX = swipeState.currentX - swipeState.startX;
    const deltaY = swipeState.currentY - swipeState.startY;
    const opacity = Math.max(0.3, 1 - Math.abs(deltaX) / 150);
    
    return {
      transform: `translate(${deltaX}px, ${deltaY}px)`,
      opacity,
      transition: swipeState.isSwiping ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
    };
  }, [swipeState]);

  /**
   * Glow style for selected/highlighted states (replaces harsh borders/rings)
   */
  const glowStyle = useMemo((): React.CSSProperties | undefined => {
    if (isSelected) {
      return {
        boxShadow: "0 0 6px rgba(234, 179, 8, 0.6), 0 0 12px rgba(234, 179, 8, 0.3), inset 0 0 8px rgba(234, 179, 8, 0.12)",
      };
    }
    if (isRevealed && isHighlighted) {
      return {
        boxShadow: "0 0 6px rgba(234, 179, 8, 0.6), 0 0 12px rgba(234, 179, 8, 0.25), inset 0 0 8px rgba(234, 179, 8, 0.08)",
      };
    }
    if (isHighlighted) {
      return {
        boxShadow: "0 0 6px rgba(192, 132, 252, 0.6), 0 0 12px rgba(192, 132, 252, 0.3), inset 0 0 8px rgba(192, 132, 252, 0.12)",
      };
    }
    return undefined;
  }, [isSelected, isHighlighted, isRevealed]);

  /**
   * Get the card image path using cardsJS SVG images
   * Must be called before any early returns to satisfy React hooks rules
   */
  const cardImagePath = useMemo(() => {
    return getCardImagePath(suit, rank, isRevealed);
  }, [suit, rank, isRevealed]);

  /**
   * Handles animation state changes
   */
  useEffect(() => {
    if (animate !== "none") {
      const animationClass = getAnimationClass(animate);
      setAnimationClass(animationClass);

      // Reset animation after it completes
      const timer = setTimeout(() => {
        setAnimationClass("");
      }, ANIMATION_DURATION_MS);

      return () => clearTimeout(timer);
    }
  }, [animate]);

  /**
   * Handles keyboard interactions for accessibility
   */
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  /**
   * Handles touch start for swipe detection
   */
  const handleTouchStart = (event: React.TouchEvent): void => {
    if (!swipeable || !onSwipeDown) return;
    
    const touch = event.touches[0];
    setSwipeState({
      isSwiping: true,
      startY: touch.clientY,
      startX: touch.clientX,
      currentY: touch.clientY,
      currentX: touch.clientX,
    });
  };

  /**
   * Handles touch move for swipe feedback
   */
  const handleTouchMove = (event: React.TouchEvent): void => {
    if (!swipeable || !onSwipeDown || !swipeState) return;
    
    const touch = event.touches[0];
    setSwipeState({
      ...swipeState,
      currentY: touch.clientY,
      currentX: touch.clientX,
    });
  };

  /**
   * Handles touch end for swipe completion
   */
  const handleTouchEnd = (): void => {
    if (!swipeable || !onSwipeDown || !swipeState) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    const deltaY = Math.abs(swipeState.currentY - swipeState.startY);

    // Swipe right threshold: 50px right, less than 30px vertical
    if (deltaX > 50 && deltaY < 30) {
      // Valid swipe right - trigger discard
      onSwipeDown();
    }

    // Reset swipe state (with slight delay for visual feedback)
    setTimeout(() => {
      setSwipeState(null);
    }, 100);
  };

  /**
   * Generates accessible label for the card
   */
  const getAccessibleLabel = (): string => {
    if (!isRevealed) {
      return "Face-down playing card";
    }
    if (!suit || !rank) {
      return "Empty card slot";
    }
    return `${rank} of ${suit}`;
  };

  /**
   * Validates card props and handles edge cases
   */
  const validateProps = (): boolean => {
    // If revealed, suit and rank should be provided
    if (isRevealed && (!suit || !rank)) {
      console.warn("Card is revealed but missing suit or rank");
      return false;
    }
    return true;
  };

  // Validate props before rendering
  if (!validateProps()) {
    return (
      <div className="w-16 h-24 bg-gray-300 rounded shadow flex items-center justify-center">
        <span className="text-xs text-gray-600">Invalid</span>
      </div>
    );
  }

  // If card is not revealed, show back side
  if (!isRevealed) {
    return (
      <div
        className={`${dimensionClasses} ${cardStyles} flex items-center justify-center relative`}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        tabIndex={onClick ? 0 : -1}
        role="button"
        aria-label={getAccessibleLabel()}
        aria-pressed={isSelected}
        style={{ ...swipeTransform, ...glowStyle }}
      >
        <img
          src={cardImagePath}
          alt="Face-down playing card"
          className="card w-full h-full object-contain"
        />
        {swipeable && swipeState && swipeState.currentX - swipeState.startX > 20 && (
          <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-red-600 font-bold animate-pulse bg-white bg-opacity-90 rounded px-1">
            → Swipe right to discard
          </div>
        )}
      </div>
    );
  }

  // Show revealed card with SVG image
  return (
    <div
      className={`${dimensionClasses} ${cardStyles} relative`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      tabIndex={onClick ? 0 : -1}
      role="button"
      aria-label={getAccessibleLabel()}
      aria-pressed={isSelected}
      style={{ ...swipeTransform, ...glowStyle }}
    >
      <img
        src={cardImagePath}
        alt={getAccessibleLabel()}
        className="card w-full h-full object-contain"
      />
      {swipeable && swipeState && swipeState.currentX - swipeState.startX > 20 && (
        <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-red-600 font-bold animate-pulse bg-white bg-opacity-90 rounded px-1">
          → Swipe right to discard
        </div>
      )}
    </div>
  );
};

export default Card;
