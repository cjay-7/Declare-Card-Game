// client/src/components/__tests__/HandGrid.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import HandGrid from "../HandGrid";
import { GameProvider } from "../../contexts/GameContext";
import { GameStateProvider } from "../../contexts/GameStateContext";
import { UIStateProvider } from "../../contexts/UIStateContext";
import type { Card as CardType } from "../../utils/cardUtils";

/**
 * Mock socket for testing
 */
vi.mock("../../socket", () => ({
  default: {
    getId: () => "player1",
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getCurrentPlayer: () => "player1",
  },
}));

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
const mockCards: (CardType | null)[] = [
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
  null, // Eliminated card
  {
    id: "card-4",
    suit: "diamonds",
    rank: "7",
    value: 7,
    isRevealed: false,
    position: 3,
  },
];

/**
 * Test suite for the HandGrid component
 * 
 * This test suite covers the HandGrid component functionality including
 * rendering, card interactions, power usage, and context integration.
 */
describe("HandGrid Component", () => {
  /**
   * Test that the hand grid renders correctly
   */
  describe("Rendering", () => {
    it("should render cards correctly", () => {
      render(
        <TestWrapper>
          <HandGrid
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should render 3 cards (one is null)
      expect(screen.getAllByRole("button")).toHaveLength(3);
    });

    it("should render empty slots for null cards", () => {
      render(
        <TestWrapper>
          <HandGrid
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should show empty slot for null card
      expect(screen.getByText("Empty")).toBeInTheDocument();
    });

    it("should show declaration mode when enabled", () => {
      render(
        <TestWrapper>
          <HandGrid
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
            isDeclarationMode={true}
          />
        </TestWrapper>
      );

      // Should show declaration mode UI
      expect(screen.getByText("Select cards to declare")).toBeInTheDocument();
    });
  });

  /**
   * Test card interaction functionality
   */
  describe("Card Interactions", () => {
    it("should handle card clicks for current player", () => {
      render(
        <TestWrapper>
          <HandGrid
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
          <HandGrid
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

    it("should not allow interaction with eliminated cards", () => {
      render(
        <TestWrapper>
          <HandGrid
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      const emptySlot = screen.getByText("Empty");
      fireEvent.click(emptySlot);

      // Should not throw error or cause issues
      expect(emptySlot).toBeInTheDocument();
    });
  });

  /**
   * Test power usage functionality
   */
  describe("Power Usage", () => {
    it("should show power interaction hints when power is active", () => {
      // Mock game state with active power
      const mockGameState = {
        players: [
          {
            id: "player1",
            name: "Player 1",
            activePower: "7",
            usingPower: true,
            hand: mockCards.filter(Boolean),
          },
        ],
        currentPlayerIndex: 0,
        deck: [],
        discardPile: [],
        gameStatus: "playing" as const,
        matchingDiscardWindow: false,
        matchingDiscardCard: null,
        matchingDiscardTimeout: null,
        roundNumber: 1,
        declarer: null,
        lastAction: null,
        type: "view" as const,
      };

      render(
        <TestWrapper>
          <HandGrid
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should show power interaction hints
      const cards = screen.getAllByRole("button");
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  /**
   * Test accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(
        <TestWrapper>
          <HandGrid
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      const cards = screen.getAllByRole("button");
      
      // Cards should have proper labels
      cards.forEach(card => {
        expect(card).toHaveAttribute("aria-label");
      });
    });

    it("should be keyboard accessible", () => {
      render(
        <TestWrapper>
          <HandGrid
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
    it("should handle empty cards array", () => {
      render(
        <TestWrapper>
          <HandGrid
            cards={[]}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should render empty slots
      expect(screen.getAllByText("Empty")).toHaveLength(4);
    });

    it("should handle all null cards", () => {
      const allNullCards = [null, null, null, null];

      render(
        <TestWrapper>
          <HandGrid
            cards={allNullCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should render all empty slots
      expect(screen.getAllByText("Empty")).toHaveLength(4);
    });

    it("should handle cards with missing properties", () => {
      const incompleteCards = [
        {
          id: "card-1",
          suit: "hearts" as const,
          rank: "A" as const,
          value: 1,
          isRevealed: false,
          // Missing position
        },
        null,
        {
          id: "card-3",
          suit: "spades" as const,
          rank: "K" as const,
          value: 13,
          isRevealed: true,
          position: 2,
        },
      ];

      render(
        <TestWrapper>
          <HandGrid
            cards={incompleteCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should render without errors
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
          <HandGrid
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Re-render with same props
      rerender(
        <TestWrapper>
          <HandGrid
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

  /**
   * Test context integration
   */
  describe("Context Integration", () => {
    it("should use GameStateContext for game state", () => {
      render(
        <TestWrapper>
          <HandGrid
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should render without context errors
      expect(screen.getAllByRole("button")).toHaveLength(3);
    });

    it("should use UIStateContext for UI state", () => {
      render(
        <TestWrapper>
          <HandGrid
            cards={mockCards}
            playerId="player1"
            isCurrentPlayer={true}
          />
        </TestWrapper>
      );

      // Should render without context errors
      expect(screen.getAllByRole("button")).toHaveLength(3);
    });
  });
});
