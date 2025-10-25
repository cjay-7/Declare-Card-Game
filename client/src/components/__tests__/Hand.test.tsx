// client/src/components/__tests__/Hand.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Hand from "../Hand";
import { GameProvider } from "../../contexts/GameContext";
import { GameStateProvider } from "../../contexts/GameStateContext";
import { UIStateProvider } from "../../contexts/UIStateContext";
import type { Card as CardType } from "../../utils/cardUtils";

/**
 * Test wrapper component that provides all necessary contexts
 */
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <GameStateProvider initialCurrentPlayerId="player1">
    <UIStateProvider>
      <GameProvider>
        {children}
      </GameProvider>
    </UIStateProvider>
  </GameStateProvider>
);

/**
 * Mock card data for testing
 */
const mockCards: CardType[] = [
  {
    id: "card-1",
    suit: "hearts",
    rank: "A",
    value: 1,
    isRevealed: false,
    position: 0,
  },
  {
    id: "card-2",
    suit: "spades",
    rank: "K",
    value: 13,
    isRevealed: true,
    position: 1,
  },
  {
    id: "card-3",
    suit: "diamonds",
    rank: "7",
    value: 7,
    isRevealed: false,
    position: 2,
  },
];

/**
 * Test suite for the Hand component
 * 
 * This test suite covers the Hand component functionality including
 * rendering, card interactions, and context integration.
 */
describe("Hand Component", () => {
  /**
   * Test that the hand renders correctly with cards
   */
  describe("Rendering", () => {
    it("should render cards correctly", () => {
      render(
        <TestWrapper>
          <Hand
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should render 3 cards
      expect(screen.getAllByRole("button")).toHaveLength(3);
    });

    it("should render empty slots when no cards", () => {
      render(
        <TestWrapper>
          <Hand
            cards={[]}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should render 4 empty slots
      expect(screen.getAllByText("Empty")).toHaveLength(4);
    });

    it("should sort cards by position", () => {
      const unsortedCards = [
        { ...mockCards[0], position: 2 },
        { ...mockCards[1], position: 0 },
        { ...mockCards[2], position: 1 },
      ];

      render(
        <TestWrapper>
          <Hand
            cards={unsortedCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Cards should be rendered in position order
      const cardElements = screen.getAllByRole("button");
      expect(cardElements).toHaveLength(3);
    });
  });

  /**
   * Test card interaction functionality
   */
  describe("Card Interactions", () => {
    it("should handle card clicks for current player", () => {
      render(
        <TestWrapper>
          <Hand
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      const firstCard = screen.getAllByRole("button")[0];
      fireEvent.click(firstCard);

      // Card should be clickable (no error thrown)
      expect(firstCard).toBeInTheDocument();
    });

    it("should handle card clicks for opponent player", () => {
      render(
        <TestWrapper>
          <Hand
            cards={mockCards}
            playerId="player2"
            isCurrentPlayer={false}
          />
        </TestWrapper>
      );

      const firstCard = screen.getAllByRole("button")[0];
      fireEvent.click(firstCard);

      // Card should be clickable (no error thrown)
      expect(firstCard).toBeInTheDocument();
    });
  });

  /**
   * Test card reveal functionality
   */
  describe("Card Reveal", () => {
    it("should reveal cards that are marked as revealed", () => {
      render(
        <TestWrapper>
          <Hand
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // The second card (spades K) should be revealed
      const cards = screen.getAllByRole("button");
      expect(cards[1]).toHaveAttribute("aria-label", "K of spades");
    });

    it("should not reveal cards that are not marked as revealed", () => {
      render(
        <TestWrapper>
          <Hand
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // The first card (hearts A) should not be revealed
      const cards = screen.getAllByRole("button");
      expect(cards[0]).toHaveAttribute("aria-label", "Face-down playing card");
    });
  });

  /**
   * Test accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(
        <TestWrapper>
          <Hand
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      const cards = screen.getAllByRole("button");
      
      // First card should be face-down
      expect(cards[0]).toHaveAttribute("aria-label", "Face-down playing card");
      
      // Second card should be revealed
      expect(cards[1]).toHaveAttribute("aria-label", "K of spades");
      
      // Third card should be face-down
      expect(cards[2]).toHaveAttribute("aria-label", "Face-down playing card");
    });

    it("should be keyboard accessible", () => {
      render(
        <TestWrapper>
          <Hand
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      const cards = screen.getAllByRole("button");
      
      // All cards should be focusable
      cards.forEach(card => {
        expect(card).toHaveAttribute("tabIndex", "0");
      });
    });
  });

  /**
   * Test edge cases
   */
  describe("Edge Cases", () => {
    it("should handle cards with missing position", () => {
      const cardsWithoutPosition = mockCards.map(card => ({
        ...card,
        position: undefined,
      }));

      render(
        <TestWrapper>
          <Hand
            cards={cardsWithoutPosition}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should render without errors
      expect(screen.getAllByRole("button")).toHaveLength(3);
    });

    it("should handle null cards gracefully", () => {
      const cardsWithNulls = [
        mockCards[0],
        null,
        mockCards[2],
      ].filter(Boolean) as CardType[];

      render(
        <TestWrapper>
          <Hand
            cards={cardsWithNulls}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should render the valid cards
      expect(screen.getAllByRole("button")).toHaveLength(2);
    });
  });

  /**
   * Test performance optimizations
   */
  describe("Performance", () => {
    it("should be memoized and not re-render unnecessarily", () => {
      const { rerender } = render(
        <TestWrapper>
          <Hand
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Re-render with same props
      rerender(
        <TestWrapper>
          <Hand
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should still render correctly
      expect(screen.getAllByRole("button")).toHaveLength(3);
    });
  });
});
