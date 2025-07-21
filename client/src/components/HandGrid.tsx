/* eslint-disable @typescript-eslint/no-unused-vars */
// Updated HandGrid.tsx - Better handling of eliminated cards

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
    eliminationCardSelection,
    handleEliminationCardSelected,
  } = useGameContext();

  // Check if current player has an active power
  const currentPlayer = gameState?.players.find((p) => p.id === socket.getId());
  const activePower = currentPlayer?.activePower;

  // Check if this hand should show power interaction hints
  const canUsePowerOnThisHand =
    activePower &&
    ((["7", "8"].includes(activePower) && isCurrentPlayer) ||
      (["9", "10"].includes(activePower) && !isCurrentPlayer) ||
      ["Q", "K"].includes(activePower)); // Q/K can target any hand

  // Ensure we always have 4 positions (pad with nulls if needed)
  const paddedCards: (CardType | null)[] = [...cards];
  while (paddedCards.length < 4) {
    paddedCards.push(null);
  }

  // CRITICAL FIX: Create mapping for elimination card selection
  // When in elimination mode, we need to map UI positions to actual non-null card indices
  const getNonNullCardMapping = () => {
    const mapping: number[] = [];
    paddedCards.forEach((card, index) => {
      if (card !== null) {
        mapping.push(index);
      }
    });
    return mapping;
  };

  // Check if there's a card in the discard pile for elimination
  const hasDiscardCard =
    gameState?.discardPile && gameState.discardPile.length > 0;

  const isEliminationSelectionActive =
    eliminationCardSelection?.isActive &&
    eliminationCardSelection.eliminatedCardInfo?.eliminatingPlayerId ===
      socket.getId();

  const handleCardClickWithValidation = (cardIndex: number) => {
    const card = paddedCards[cardIndex];

    // Add this check at the beginning of the function
    // Handle elimination card selection mode
    // Handle elimination card selection mode with proper index mapping
    if (isEliminationSelectionActive && isCurrentPlayer && card !== null) {
      console.log(
        `Selecting card at UI position ${cardIndex} to give to opponent`
      );

      // Map UI index to non-null card index for elimination selection
      const nonNullMapping = getNonNullCardMapping();
      const nonNullIndex = nonNullMapping.indexOf(cardIndex);

      if (nonNullIndex === -1) {
        console.error("Card not found in non-null mapping");
        return;
      }

      console.log(
        `UI position ${cardIndex} maps to non-null index ${nonNullIndex}`
      );
      handleEliminationCardSelected(nonNullIndex);
      return;
    }

    // Check if trying to interact with eliminated card
    if (card === null) {
      console.log(
        `Cannot interact with eliminated card at position ${cardIndex + 1}`
      );

      // Show specific error messages based on context
      if (activePower && ["Q", "K"].includes(activePower)) {
        console.log("Cannot select eliminated card for swap");
        // Could add toast notification here
        return;
      } else if (activePower && ["7", "8", "9", "10"].includes(activePower)) {
        console.log("Cannot use power on eliminated card");
        return;
      } else if (drawnCard && isCurrentPlayer) {
        console.log("Cannot swap with eliminated card");
        return;
      }

      // Add elimination selection specific error
      if (isEliminationSelectionActive) {
        console.log("Cannot give an eliminated card");
        return;
      }

      return;
    }

    // ... rest of existing handleCardClickWithValidation code
    // (Only handles card click when it's a valid interaction)
    handleCardClick(playerId, cardIndex);
  };

  return (
    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto relative">
      {/* Elimination card selection overlay */}
      {isEliminationSelectionActive && isCurrentPlayer && (
        <div className="absolute inset-0 bg-orange-500 bg-opacity-30 rounded-lg border-2 border-orange-400 border-dashed flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg animate-pulse">
            Select a card to give to{" "}
            {eliminationCardSelection?.eliminatedCardInfo?.cardOwnerName}
            <div className="text-xs mt-1 opacity-80">
              Click any of your remaining cards
            </div>
          </div>
        </div>
      )}
      {/* Power interaction overlay - only show if there are valid cards to interact with */}
      {canUsePowerOnThisHand && paddedCards.some((card) => card !== null) && (
        <div className="absolute inset-0 bg-purple-500 bg-opacity-20 rounded-lg border-2 border-purple-400 border-dashed flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg">
            {["7", "8"].includes(activePower)
              ? "Peek at your card"
              : ["9", "10"].includes(activePower)
              ? "Peek at opponent's card"
              : ["Q", "K"].includes(activePower)
              ? `Select cards to swap (${
                  activePower === "Q" ? "unseen" : "seen"
                })`
              : "Use power"}
          </div>
        </div>
      )}

      {/* King Power Reveal Overlay */}
      {kingPowerReveal && (
        <div className="absolute inset-0 bg-yellow-500 bg-opacity-30 rounded-lg border-4 border-yellow-400 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg text-center">
            <div className="flex items-center justify-center mb-1">
              <span className="text-lg mr-2">👑</span>
              King Power Active
            </div>
            <div className="text-xs">
              {kingPowerReveal.powerUserName} is revealing cards before swap
            </div>
          </div>
        </div>
      )}

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
                  <div className="text-gray-400 text-xs font-bold">
                    ELIMINATED
                  </div>
                  <div className="text-gray-500 text-xs">Pos {index + 1}</div>
                  <div className="text-green-400 text-xs">= 0 pts</div>
                </div>
              </div>

              {/* Show elimination benefit */}
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">0</span>
              </div>
            </div>
          );
        }

        // Check if this card is being revealed by King power
        const isKingPowerRevealed =
          kingPowerReveal &&
          ((kingPowerReveal.card1.playerId === playerId &&
            kingPowerReveal.card1.cardIndex === index) ||
            (kingPowerReveal.card2.playerId === playerId &&
              kingPowerReveal.card2.cardIndex === index));

        // Get the card to display for King power reveals
        let kingRevealedCard = null;
        if (isKingPowerRevealed) {
          if (
            kingPowerReveal.card1.playerId === playerId &&
            kingPowerReveal.card1.cardIndex === index
          ) {
            kingRevealedCard = kingPowerReveal.card1.card;
          } else if (
            kingPowerReveal.card2.playerId === playerId &&
            kingPowerReveal.card2.cardIndex === index
          ) {
            kingRevealedCard = kingPowerReveal.card2.card;
          }
        }

        // Determine if this card should be revealed
        const shouldReveal =
          card.isRevealed || // Permanently revealed cards
          (isCurrentPlayer && index >= 2 && !hasDrawnFirstCard) || // Bottom 2 visible only before first draw
          (isCurrentPlayer && temporaryRevealedCards.includes(index)) || // Temporary reveals from powers on own cards
          (!isCurrentPlayer &&
            opponentRevealedCard?.playerId === playerId &&
            opponentRevealedCard?.cardIndex === index) || // Opponent card revealed by 9/10 power
          isKingPowerRevealed; // King power reveal

        const currentPlayerData = gameState?.players.find(
          (p) => p.id === socket.getId()
        );
        const hasAlreadyEliminated =
          currentPlayerData?.hasEliminatedThisRound || false;

        // Only show eliminate button for actual cards (not eliminated positions)
        const showEliminateButton =
          !drawnCard &&
          hasDiscardCard &&
          !hasAlreadyEliminated &&
          !activePower &&
          !isKingPowerRevealed &&
          !isEliminationSelectionActive &&
          card !== null; // Key check: card must not be eliminated

        // Check if this card is selected for swapping
        const isSelectedForSwap = swapSelections.some(
          (sel) => sel.playerId === playerId && sel.cardIndex === index
        );

        // Show power glow effect when card can be used with active power
        const showPowerGlow = canUsePowerOnThisHand && !isKingPowerRevealed;

        // Check if this is a temporarily revealed opponent card by power
        const isTemporarilyRevealedOpponentCard =
          !isCurrentPlayer &&
          opponentRevealedCard?.playerId === playerId &&
          opponentRevealedCard?.cardIndex === index;

        // Use the appropriate revealed card data
        const displayCard = isKingPowerRevealed
          ? kingRevealedCard
          : isTemporarilyRevealedOpponentCard
          ? opponentRevealedCard.card
          : card;

        return (
          <div
            key={card.id}
            className="flex justify-center relative"
          >
            <div
              onClick={() => handleCardClickWithValidation(index)}
              className={`${showPowerGlow ? "animate-pulse" : ""} ${
                isKingPowerRevealed ? "pointer-events-none" : ""
              } ${
                isEliminationSelectionActive && isCurrentPlayer && card !== null
                  ? "ring-2 ring-orange-400 rounded animate-pulse"
                  : ""
              }
      cursor-pointer`}
            >
              <Card
                suit={shouldReveal ? displayCard?.suit : undefined}
                rank={shouldReveal ? displayCard?.rank : undefined}
                isRevealed={shouldReveal || false}
                isSelected={
                  (selectedCard?.cardId === card.id && isCurrentPlayer) ||
                  isSelectedForSwap
                }
                isHighlighted={
                  showPowerGlow ||
                  isTemporarilyRevealedOpponentCard ||
                  isKingPowerRevealed ||
                  false
                }
                animate={
                  (isCurrentPlayer && temporaryRevealedCards.includes(index)) ||
                  isTemporarilyRevealedOpponentCard ||
                  isKingPowerRevealed
                    ? "reveal"
                    : undefined
                }
              />
            </div>

            {isEliminationSelectionActive &&
              isCurrentPlayer &&
              card !== null && (
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold animate-bounce shadow-lg">
                  👆
                </div>
              )}

            {/* King Power Reveal Indicator */}
            {isKingPowerRevealed && (
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-lg font-bold animate-bounce shadow-lg border-2 border-yellow-300">
                👑
              </div>
            )}

            {/* Swap selection indicator */}
            {isSelectedForSwap && !isKingPowerRevealed && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce">
                {swapSelections.findIndex(
                  (sel) => sel.playerId === playerId && sel.cardIndex === index
                ) + 1}
              </div>
            )}

            {/* Power indicator for active powers */}
            {showPowerGlow && !isSelectedForSwap && !isKingPowerRevealed && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce">
                {activePower}
              </div>
            )}

            {/* Temporary reveal indicator for power-revealed cards */}
            {isTemporarilyRevealedOpponentCard && !isKingPowerRevealed && (
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-ping">
                👁️
              </div>
            )}

            {/* Eliminate button - enhanced with better validation */}
            {showEliminateButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card selection
                  if (card && card.id) {
                    handleEliminateCard(card.id);
                  }
                }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 hover:bg-red-700 
                          rounded-full flex items-center justify-center text-white text-xs
                          border-2 border-white shadow-lg transition-colors"
                title={`Eliminate this ${card.rank} (if it matches top discard)`}
              >
                ❌
              </button>
            )}

            {/* Card value indicator for revealed cards */}
            {shouldReveal && displayCard && (
              <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-gray-800 text-white text-xs rounded-full flex items-center justify-center border border-gray-600">
                {displayCard.value}
              </div>
            )}

            {/* Position indicator for debugging */}
            {process.env.NODE_ENV === "development" && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-800 text-white text-xs rounded-full flex items-center justify-center">
                {index + 1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HandGrid;
