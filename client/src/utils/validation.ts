// client/src/utils/validation.ts
import type { Card, CardSuit, CardRank } from "../components/Card";

/**
 * Validation error class for custom validation errors
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validates if a string is a valid card suit
 *
 * @param {string} suit - The suit to validate
 * @returns {suit is CardSuit} True if the suit is valid
 */
export const isValidSuit = (suit: string): suit is CardSuit => {
  return ["hearts", "diamonds", "clubs", "spades"].includes(suit);
};

/**
 * Validates if a string is a valid card rank
 *
 * @param {string} rank - The rank to validate
 * @returns {rank is CardRank} True if the rank is valid
 */
export const isValidRank = (rank: string): rank is CardRank => {
  return [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ].includes(rank);
};

/**
 * Validates a card object
 *
 * @param {unknown} card - The card object to validate
 * @returns {card is Card} True if the card is valid
 * @throws {ValidationError} If the card is invalid
 */
export const validateCard = (card: unknown): card is Card => {
  if (!card || typeof card !== "object") {
    throw new ValidationError("Card must be an object");
  }

  const cardObj = card as Record<string, unknown>;

  // Validate required fields
  if (typeof cardObj.id !== "string" || cardObj.id.length === 0) {
    throw new ValidationError("Card must have a valid id");
  }

  if (!isValidSuit(cardObj.suit as string)) {
    throw new ValidationError(`Invalid suit: ${cardObj.suit}`, "suit");
  }

  if (!isValidRank(cardObj.rank as string)) {
    throw new ValidationError(`Invalid rank: ${cardObj.rank}`, "rank");
  }

  if (typeof cardObj.value !== "number" || cardObj.value < 0) {
    throw new ValidationError(
      "Card value must be a non-negative number",
      "value"
    );
  }

  if (typeof cardObj.isRevealed !== "boolean") {
    throw new ValidationError(
      "Card isRevealed must be a boolean",
      "isRevealed"
    );
  }

  return true;
};

/**
 * Validates an array of cards
 *
 * @param {unknown} cards - The cards array to validate
 * @returns {cards is Card[]} True if all cards are valid
 * @throws {ValidationError} If any card is invalid
 */
export const validateCards = (cards: unknown): cards is Card[] => {
  if (!Array.isArray(cards)) {
    throw new ValidationError("Cards must be an array");
  }

  cards.forEach((card, index) => {
    try {
      validateCard(card);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Card at index ${index}: ${error.message}`,
          `cards[${index}]`
        );
      }
      throw error;
    }
  });

  return true;
};

/**
 * Safely parses a JSON string and validates it as cards
 *
 * @param {string} jsonString - The JSON string to parse
 * @returns {Card[]} The parsed and validated cards
 * @throws {ValidationError} If parsing or validation fails
 */
export const parseAndValidateCards = (jsonString: string): Card[] => {
  try {
    const parsed = JSON.parse(jsonString);
    validateCards(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(
      `Failed to parse JSON: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

/**
 * Type guard to check if an object has a specific property
 *
 * @param {unknown} obj - The object to check
 * @param {string} property - The property name to check for
 * @returns {obj is Record<string, unknown>} True if the object has the property
 */
export const hasProperty = (
  obj: unknown,
  property: string
): obj is Record<string, unknown> => {
  return obj !== null && typeof obj === "object" && property in obj;
};

/**
 * Safely gets a property from an object with type checking
 *
 * @param {unknown} obj - The object to get the property from
 * @param {string} property - The property name
 * @param {unknown} defaultValue - The default value if property doesn't exist
 * @returns {unknown} The property value or default value
 */
export const safeGetProperty = (
  obj: unknown,
  property: string,
  defaultValue: unknown = undefined
): unknown => {
  if (hasProperty(obj, property)) {
    return obj[property];
  }
  return defaultValue;
};

/**
 * Validates that a value is a non-empty string
 *
 * @param {unknown} value - The value to validate
 * @param {string} fieldName - The name of the field for error messages
 * @returns {value is string} True if the value is a non-empty string
 * @throws {ValidationError} If the value is not a non-empty string
 */
export const validateNonEmptyString = (
  value: unknown,
  fieldName: string
): value is string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `${fieldName} must be a non-empty string`,
      fieldName
    );
  }
  return true;
};

/**
 * Validates that a value is a positive integer
 *
 * @param {unknown} value - The value to validate
 * @param {string} fieldName - The name of the field for error messages
 * @returns {value is number} True if the value is a positive integer
 * @throws {ValidationError} If the value is not a positive integer
 */
export const validatePositiveInteger = (
  value: unknown,
  fieldName: string
): value is number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(
      `${fieldName} must be a positive integer`,
      fieldName
    );
  }
  return true;
};
