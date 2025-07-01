// components/HandGrid.tsx - FORCED horizontal layout to fix the vertical stacking issue
import React from "react";
import Card from "./Card";
import { useGameContext } from "../contexts/GameContext";
import socket from "../socket";
import type { Card as CardType } from "../utils/cardUtils";

interface HandGridProps {
  cards: (CardType | null)[]; // Allow null cards for eliminated positions
  playerId: string;
  isCurrentPlayer: boolean;
  isPlayerTurn?: boolean; // Optional prop for turn-based interactions
}

const HandGrid: React.FC<HandGridProps> = ({
  cards,
  playerId,
  isCurrentPlayer,
  isPlayerTurn = false, // Default to false if not provided
}) => {
  const {
    handleSelectCard,
    selectedCard,
    handleCardClick,
    temporaryRevealedCards,
    hasDrawnFirstCard,
    handleEliminateCard,
    drawnCard,
    gameState,
    opponentRevealedCard,
    swapSelections,
    kingPowerReveal,
  } = useGameContext();

  // Check if current player has an active power
  const currentPlayer = gameState?.players.find((p) => p.id === socket.getId());
  const activePower = currentPlayer?.activePower;
  const isSelectingCardToGive = currentPlayer?.isSelectingCardToGive;

  // Ensure we always have 4 positions (pad with nulls if needed)
  const paddedCards: (CardType | null)[] = [...cards];
  while (paddedCards.length < 4) {
    paddedCards.push(null);
  }

  // Check if there's a card in the discard pile for elimination
  const hasDiscardCard =
    gameState?.discardPile && gameState.discardPile.length > 0;

  const handleCardClickWithValidation = (cardIndex: number) => {
    const card = paddedCards[cardIndex];

    // FIX 3: Handle card selection for giving
    if (isSelectingCardToGive && isCurrentPlayer) {
      if (card === null) {
        console.log("Cannot give eliminated card");
        return;
      }

      // Emit card selection for giving
      socket.emit("select-card-to-give", {
        roomId: "QUICK",
        playerId: socket.getId(),
        cardIndex,
      });
      console.log(`Selected card at position ${cardIndex} to give`);
      return;
    }

    // Handle card swapping with drawn card
    if (drawnCard && isCurrentPlayer && isPlayerTurn) {
      if (card === null) {
        console.log("Cannot swap with eliminated card");
        return;
      }

      // Emit swap
      socket.emit("swap-card", {
        roomId: "QUICK",
        playerId: socket.getId(),
        cardIndex,
        drawnCardId: drawnCard.id,
      });
      return;
    }

    // Handle elimination
    if (
      hasDiscardCard &&
      !isCurrentPlayer &&
      !gameState?.eliminationUsedThisRound &&
      !currentPlayer?.hasEliminatedThisRound &&
      card !== null
    ) {
      socket.emit("eliminate-card", {
        roomId: "QUICK",
        playerId: socket.getId(),
        cardOwnerId: playerId,
        cardIndex,
        cardId: card.id,
      });
      return;
    }

    // Handle power usage
    if (activePower && card !== null) {
      if (["7", "8"].includes(activePower) && isCurrentPlayer) {
        // Peek at own card
        socket.emit("use-power", {
          roomId: "QUICK",
          playerId: socket.getId(),
          power: activePower,
          targetPlayerId: playerId,
          targetCardIndex: cardIndex,
        });
        return;
      } else if (["9", "10"].includes(activePower) && !isCurrentPlayer) {
        // Peek at opponent's card
        socket.emit("use-power", {
          roomId: "QUICK",
          playerId: socket.getId(),
          power: activePower,
          targetPlayerId: playerId,
          targetCardIndex: cardIndex,
        });
        return;
      }
    }

    // Default card click behavior
    if (handleCardClick) {
      handleCardClick(playerId, cardIndex);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      {/* Player identification */}
      <div className="text-center">
        <div className="text-sm font-medium text-gray-300">
          {isCurrentPlayer ? "Your Cards" : `${playerId}'s Cards`}
        </div>

        {/* FIX 3: Show card selection instruction */}
        {isSelectingCardToGive && isCurrentPlayer && (
          <div className="text-xs text-yellow-300 bg-yellow-900 rounded px-2 py-1 mt-1">
            🎯 Choose a card to give to your opponent
          </div>
        )}
      </div>

      {/* FORCE HORIZONTAL LAYOUT - This is the key fix! */}
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        {paddedCards.map((card, index) => {
          // Handle eliminated cards (null positions)
          if (card === null) {
            return (
              <div
                key={`eliminated-${playerId}-${index}`}
                className="flex justify-center relative"
              >
                <div className="w-16 h-24 bg-gray-600 border-2 border-gray-500 border-dashed rounded shadow flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-gray-400 text-xs">ELIMINATED</div>
                    <div className="text-gray-500 text-xs">Pos {index + 1}</div>
                  </div>
                </div>

                {/* Show elimination benefit */}
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">0</span>
                </div>
              </div>
            );
          }

          // Determine if this card should be revealed
          const shouldReveal =
            card.isRevealed || // Permanently revealed cards
            (isCurrentPlayer && index >= 2 && !hasDrawnFirstCard) || // Bottom 2 visible only before first draw
            (isCurrentPlayer && temporaryRevealedCards?.includes(card.id)) || // Temporarily revealed
            (opponentRevealedCard?.playerId === playerId &&
              opponentRevealedCard?.cardIndex === index); // Opponent card revealed

          // Determine if this card can be eliminated
          const topDiscardCard = hasDiscardCard
            ? gameState!.discardPile[gameState!.discardPile.length - 1]
            : null;

          const canEliminate =
            hasDiscardCard &&
            !isCurrentPlayer &&
            topDiscardCard &&
            card.rank === topDiscardCard.rank &&
            !gameState?.eliminationUsedThisRound &&
            !currentPlayer?.hasEliminatedThisRound;

          // Determine selection state for card giving
          const isSelectableForGiving =
            isSelectingCardToGive && isCurrentPlayer && card !== null;

          // Determine if clickable for swapping
          const isSwappable =
            drawnCard && isCurrentPlayer && isPlayerTurn && card !== null;

          return (
            <div
              key={card.id}
              className="flex justify-center relative"
            >
              <Card
                card={card}
                isRevealed={shouldReveal}
                onClick={() => handleCardClickWithValidation(index)}
                isClickable={
                  canEliminate ||
                  isSelectableForGiving ||
                  isSwappable ||
                  (activePower && card !== null)
                }
                className={`
                  transition-all duration-200
                  ${
                    canEliminate
                      ? "ring-2 ring-red-400 hover:ring-red-300 cursor-pointer"
                      : ""
                  }
                  ${
                    isSelectableForGiving
                      ? "ring-2 ring-yellow-400 hover:ring-yellow-300 cursor-pointer"
                      : ""
                  }
                  ${
                    isSwappable
                      ? "ring-2 ring-blue-400 hover:ring-blue-300 cursor-pointer"
                      : ""
                  }
                  ${
                    activePower && card !== null
                      ? "ring-2 ring-purple-400 hover:ring-purple-300 cursor-pointer"
                      : ""
                  }
                `}
              />

              {/* Show elimination indicator */}
              {canEliminate && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-400">
                  <span className="text-white text-xs font-bold">❌</span>
                </div>
              )}

              {/* FIX 3: Show card giving indicator */}
              {isSelectableForGiving && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-yellow-400">
                  <span className="text-white text-xs font-bold">🎯</span>
                </div>
              )}

              {/* Show swap indicator */}
              {isSwappable && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-400">
                  <span className="text-white text-xs font-bold">🔄</span>
                </div>
              )}

              {/* Show power usage indicator */}
              {activePower &&
                card !== null &&
                !canEliminate &&
                !isSelectableForGiving &&
                !isSwappable && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-400">
                    <span className="text-white text-xs font-bold">
                      {activePower === "7" || activePower === "8"
                        ? "👁️"
                        : activePower === "9" || activePower === "10"
                        ? "🔍"
                        : activePower === "Q"
                        ? "🔄"
                        : "👑"}
                    </span>
                  </div>
                )}

              {/* Show card position */}
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gray-800 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {index + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HandGrid;
