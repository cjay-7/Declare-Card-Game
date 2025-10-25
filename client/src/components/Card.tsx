/* eslint-disable @typescript-eslint/no-unused-vars */
// client/src/components/Card.tsx - Updated with highlight support
import React, { useState, useEffect, useMemo } from "react";

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
 */
interface CardProps {
  suit?: CardSuit;
  rank?: CardRank;
  isRevealed?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean | null;
  onClick?: () => void;
  animate?: CardAnimation;
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
}) => {
  const [animationClass, setAnimationClass] = useState("");

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
   * Gets the appropriate color class for a given suit
   */
  const getSuitColor = (suit: CardSuit): string => {
    const suitColors: Record<CardSuit, string> = {
      hearts: "text-red-600",
      diamonds: "text-red-600",
      clubs: "text-black",
      spades: "text-black",
    };
    return suitColors[suit];
  };

  /**
   * Gets the Unicode symbol for a given suit
   */
  const getSuitSymbol = (suit: CardSuit): string => {
    const suitSymbols: Record<CardSuit, string> = {
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
      spades: "♠",
    };
    return suitSymbols[suit] || "?";
  };

  /**
   * Generates the CSS classes for card styling based on current state
   * Memoized to prevent unnecessary recalculations on every render
   */
  const cardStyles = useMemo((): string => {
    const baseStyles =
      "w-16 h-24 rounded shadow cursor-pointer transform transition-all duration-200 hover:scale-105";
    const backgroundStyles = isRevealed
      ? "bg-white"
      : "bg-blue-500 pattern-cross-dots-lg";
    const selectionStyles = isSelected
      ? "border-2 border-yellow-400 shadow-lg shadow-yellow-400/50"
      : "";
    const highlightStyles = isHighlighted
      ? "ring-2 ring-purple-400 ring-opacity-75 shadow-lg shadow-purple-400/50"
      : "";
    const tempRevealGlow =
      isRevealed && isHighlighted
        ? "shadow-lg shadow-yellow-400/75 ring-2 ring-yellow-400"
        : "";
    const animationStyles = animationClass;
    const pulseStyles = isHighlighted ? "animate-pulse" : "";
    const bounceStyles = tempRevealGlow ? "animate-bounce" : "";

    return [
      baseStyles,
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
        className={cardStyles}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        tabIndex={onClick ? 0 : -1}
        role="button"
        aria-label={getAccessibleLabel()}
        aria-pressed={isSelected}
      >
        <div className="h-full flex items-center justify-center">
          <div className="bg-white rounded-full h-8 w-8 flex items-center justify-center">
            <span
              className="text-6em"
              role="img"
              aria-label="card back"
            >
              🎴
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show revealed card with special glow for power reveals
  return (
    <div
      className={`${cardStyles} flex flex-col justify-between p-1`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : -1}
      role="button"
      aria-label={getAccessibleLabel()}
      aria-pressed={isSelected}
    >
      {suit && rank ? (
        <>
          <div className={`text-xs font-bold ${getSuitColor(suit)}`}>
            {rank}
          </div>

          <div
            className={`flex-1 flex items-center justify-center ${getSuitColor(
              suit
            )}`}
          >
            {/* Display multiple suit symbols based on rank */}
            {(() => {
              const symbol = getSuitSymbol(suit);

              // For face cards, show just one large symbol
              if (["J", "Q", "K", "A"].includes(rank)) {
                return <span className="text-lg">{symbol}</span>;
              }

              // For number cards 2-10, show that many symbols
              const count = parseInt(rank);
              if (count >= 2 && count <= 10) {
                const symbols = Array(count).fill(symbol);

                // Arrange symbols in a nice pattern based on count
                if (count <= 3) {
                  // 2-3: vertical column
                  return (
                    <div className="flex flex-col items-center gap-0.5">
                      {symbols.map((sym, i) => (
                        <span
                          key={i}
                          className="text-xs leading-none"
                        >
                          {sym}
                        </span>
                      ))}
                    </div>
                  );
                } else if (count <= 6) {
                  // 4-6: two columns
                  const leftCol = symbols.slice(0, Math.ceil(count / 2));
                  const rightCol = symbols.slice(Math.ceil(count / 2));
                  return (
                    <div className="flex gap-1 items-center">
                      <div className="flex flex-col gap-0.5">
                        {leftCol.map((sym, i) => (
                          <span
                            key={i}
                            className="text-xs leading-none"
                          >
                            {sym}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {rightCol.map((sym, i) => (
                          <span
                            key={i}
                            className="text-xs leading-none"
                          >
                            {sym}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                } else {
                  // 7-10: three columns
                  const cols = [
                    symbols.slice(0, Math.ceil(count / 3)),
                    symbols.slice(
                      Math.ceil(count / 3),
                      Math.ceil((count * 2) / 3)
                    ),
                    symbols.slice(Math.ceil((count * 2) / 3)),
                  ];
                  return (
                    <div className="flex gap-0.5 items-center">
                      {cols.map((col, colIndex) => (
                        <div
                          key={colIndex}
                          className="flex flex-col gap-0.5"
                        >
                          {col.map((sym, i) => (
                            <span
                              key={i}
                              className="text-xs leading-none"
                            >
                              {sym}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                }
              }

              // Fallback for any edge cases
              return <span className="text-lg">{symbol}</span>;
            })()}
          </div>

          <div
            className={`text-xs font-bold self-end rotate-180 ${getSuitColor(
              suit
            )}`}
          >
            {rank}
          </div>
        </>
      ) : (
        <div className="h-full flex items-center justify-center text-sm text-gray-400">
          Empty
        </div>
      )}
    </div>
  );
};

export default Card;
