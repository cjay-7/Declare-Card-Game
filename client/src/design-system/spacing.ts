// client/src/design-system/spacing.ts
/**
 * Design system spacing scale
 *
 * This file defines the spacing system used throughout the Declare Card Game.
 * Spacing values are based on a 4px base unit for consistency.
 */

export const spacing = {
  // Base spacing scale (4px increments)
  0: "0px",
  1: "4px", // 0.25rem
  2: "8px", // 0.5rem
  3: "12px", // 0.75rem
  4: "16px", // 1rem
  5: "20px", // 1.25rem
  6: "24px", // 1.5rem
  8: "32px", // 2rem
  10: "40px", // 2.5rem
  12: "48px", // 3rem
  16: "64px", // 4rem
  20: "80px", // 5rem
  24: "96px", // 6rem
  32: "128px", // 8rem
  40: "160px", // 10rem
  48: "192px", // 12rem
  56: "224px", // 14rem
  64: "256px", // 16rem
} as const;

export const spacingRem = {
  // Rem-based spacing for responsive design
  0: "0rem",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  32: "8rem",
  40: "10rem",
  48: "12rem",
  56: "14rem",
  64: "16rem",
} as const;

// Semantic spacing tokens
export const semanticSpacing = {
  // Component spacing
  cardPadding: spacing[1], // 4px
  cardMargin: spacing[2], // 8px
  cardGap: spacing[2], // 8px

  // Layout spacing
  sectionPadding: spacing[6], // 24px
  containerPadding: spacing[4], // 16px

  // Interactive spacing
  buttonPadding: spacing[3], // 12px
  inputPadding: spacing[3], // 12px

  // Card game specific
  handGap: spacing[2], // 8px
  playerGap: spacing[6], // 24px
  boardPadding: spacing[8], // 32px
} as const;

export type SpacingKey = keyof typeof spacing;
export type SpacingRemKey = keyof typeof spacingRem;
export type SemanticSpacingKey = keyof typeof semanticSpacing;
