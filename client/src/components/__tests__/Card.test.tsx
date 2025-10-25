// client/src/components/__tests__/Card.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Card, {
  type CardSuit,
  type CardRank,
  type CardAnimation,
} from "../Card";

/**
 * Test suite for the Card component
 *
 * This test suite covers all the major functionality of the Card component
 * including rendering, interactions, animations, and accessibility.
 */
describe("Card Component", () => {
  /**
   * Test that the card renders correctly when revealed
   */
  describe("Revealed Card Rendering", () => {
    it("should render a revealed card with suit and rank", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
        />
      );

      expect(screen.getByText("A")).toBeInTheDocument();
      expect(screen.getByText("♥")).toBeInTheDocument();
    });

    it("should render different suits correctly", () => {
      const suits: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"];
      const expectedSymbols = ["♥", "♦", "♣", "♠"];

      suits.forEach((suit, index) => {
        const { unmount } = render(
          <Card
            suit={suit}
            rank="A"
            isRevealed={true}
          />
        );

        expect(screen.getByText(expectedSymbols[index])).toBeInTheDocument();
        unmount();
      });
    });

    it("should render different ranks correctly", () => {
      const ranks: CardRank[] = [
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
      ];

      ranks.forEach((rank) => {
        const { unmount } = render(
          <Card
            suit="hearts"
            rank={rank}
            isRevealed={true}
          />
        );

        expect(screen.getByText(rank)).toBeInTheDocument();
        unmount();
      });
    });

    it("should apply correct color classes for red suits", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).toHaveClass("text-red-600");
    });

    it("should apply correct color classes for black suits", () => {
      render(
        <Card
          suit="clubs"
          rank="A"
          isRevealed={true}
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).toHaveClass("text-black");
    });
  });

  /**
   * Test that the card renders correctly when not revealed
   */
  describe("Unrevealed Card Rendering", () => {
    it("should render a face-down card", () => {
      render(<Card isRevealed={false} />);

      expect(
        screen.getByLabelText("Face-down playing card")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: "card back" })
      ).toBeInTheDocument();
    });

    it("should not show suit or rank when not revealed", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={false}
        />
      );

      expect(screen.queryByText("A")).not.toBeInTheDocument();
      expect(screen.queryByText("♥")).not.toBeInTheDocument();
    });
  });

  /**
   * Test card selection functionality
   */
  describe("Card Selection", () => {
    it("should show selection styling when selected", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
          isSelected={true}
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).toHaveClass("border-yellow-400");
    });

    it("should not show selection styling when not selected", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
          isSelected={false}
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).not.toHaveClass("border-yellow-400");
    });

    it("should call onClick when clicked", () => {
      const handleClick = jest.fn();

      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
          onClick={handleClick}
        />
      );

      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Test card highlighting functionality
   */
  describe("Card Highlighting", () => {
    it("should show highlight styling when highlighted", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
          isHighlighted={true}
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).toHaveClass("ring-purple-400");
    });

    it("should show special glow when revealed and highlighted", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
          isHighlighted={true}
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).toHaveClass("shadow-yellow-400");
    });
  });

  /**
   * Test animation functionality
   */
  describe("Card Animations", () => {
    it("should apply draw animation class", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
          animate="draw"
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).toHaveClass("animate-cardDraw");
    });

    it("should apply discard animation class", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
          animate="discard"
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).toHaveClass("animate-cardDiscard");
    });

    it("should apply reveal animation class", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
          animate="reveal"
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).toHaveClass("animate-bounce");
    });

    it("should not apply animation class when animate is none", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
          animate="none"
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).not.toHaveClass("animate-cardDraw");
      expect(cardElement).not.toHaveClass("animate-cardDiscard");
      expect(cardElement).not.toHaveClass("animate-bounce");
    });
  });

  /**
   * Test accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper ARIA labels for revealed cards", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
        />
      );

      expect(screen.getByLabelText("A of hearts")).toBeInTheDocument();
    });

    it("should have proper ARIA labels for face-down cards", () => {
      render(<Card isRevealed={false} />);

      expect(
        screen.getByLabelText("Face-down playing card")
      ).toBeInTheDocument();
    });

    it("should have proper ARIA labels for empty cards", () => {
      render(<Card isRevealed={true} />);

      expect(screen.getByLabelText("Empty card slot")).toBeInTheDocument();
    });

    it("should be keyboard accessible when onClick is provided", () => {
      const handleClick = jest.fn();

      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
          onClick={handleClick}
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).toHaveAttribute("tabIndex", "0");

      fireEvent.keyDown(cardElement, { key: "Enter" });
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(cardElement, { key: " " });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it("should not be keyboard accessible when onClick is not provided", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).toHaveAttribute("tabIndex", "-1");
    });

    it("should indicate pressed state when selected", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
          isSelected={true}
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).toHaveAttribute("aria-pressed", "true");
    });
  });

  /**
   * Test edge cases and error handling
   */
  describe("Edge Cases", () => {
    it("should handle missing suit and rank gracefully", () => {
      render(<Card isRevealed={true} />);

      expect(screen.getByText("Empty")).toBeInTheDocument();
    });

    it("should render with minimal props", () => {
      render(<Card />);

      expect(
        screen.getByLabelText("Face-down playing card")
      ).toBeInTheDocument();
    });

    it("should handle null highlight state", () => {
      render(
        <Card
          suit="hearts"
          rank="A"
          isRevealed={true}
          isHighlighted={null}
        />
      );

      const cardElement = screen.getByRole("button");
      expect(cardElement).not.toHaveClass("ring-purple-400");
    });
  });

  /**
   * Test symbol arrangement for different ranks
   */
  describe("Symbol Arrangement", () => {
    it("should show single symbol for face cards", () => {
      const faceCards: CardRank[] = ["A", "J", "Q", "K"];

      faceCards.forEach((rank) => {
        const { unmount } = render(
          <Card
            suit="hearts"
            rank={rank}
            isRevealed={true}
          />
        );

        const symbols = screen.getAllByText("♥");
        expect(symbols).toHaveLength(1);
        unmount();
      });
    });

    it("should show correct number of symbols for number cards", () => {
      const numberCards: CardRank[] = [
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
      ];

      numberCards.forEach((rank) => {
        const { unmount } = render(
          <Card
            suit="hearts"
            rank={rank}
            isRevealed={true}
          />
        );

        const expectedCount = parseInt(rank);
        const symbols = screen.getAllByText("♥");
        expect(symbols).toHaveLength(expectedCount);
        unmount();
      });
    });
  });
});
