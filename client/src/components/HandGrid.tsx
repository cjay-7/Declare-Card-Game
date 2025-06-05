// client/src/components/HandGrid.tsx - Updated with null card support for eliminated positions
import React from "react";
import Card from "./Card";
import { useGameContext } from "../contexts/GameContext";
import socket from "../socket";
import type { Card as CardType } from "../utils/cardUtils";

interface HandGridProps {
  cards: (CardType | null)[]; // Allow null cards for eliminated positions
  playerId: string;
  isCurrentPlayer: boolean;
  isPlayerTurn?: boolean;
}

const HandGrid: React.FC<HandGridProps> = ({
  cards,
  playerId,
  isCurrentPlayer,
  isPlayerTurn = false,
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
    myPlayer,
    opponentRevealedCard,
    swapSelections,
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

  // Check if there's a card in the discard pile
  const hasDiscardCard =
    gameState?.discardPile && gameState.discardPile.length > 0;

  return (
    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto relative">
      {/* Power interaction overlay */}
      {canUsePowerOnThisHand && (
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
                  <div className="text-gray-500 text-xs">
                    Position {index + 1}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Determine if this card should be revealed:
        // 1. Card is permanently revealed through gameplay (isRevealed=true)
        // 2. Current player can see their own bottom 2 cards ONLY before first draw
        // 3. Card is temporarily revealed (in temporaryRevealedCards array)
        // 4. Opponent card is temporarily revealed by power (9/10)
        const shouldReveal =
          card.isRevealed || // Permanently revealed cards
          (isCurrentPlayer && index >= 2 && !hasDrawnFirstCard) || // Bottom 2 visible only before first draw
          (isCurrentPlayer && temporaryRevealedCards.includes(index)) || // Temporary reveals from powers on own cards
          (!isCurrentPlayer &&
            opponentRevealedCard?.playerId === playerId &&
            opponentRevealedCard?.cardIndex === index); // Opponent card revealed by 9/10 power

        const currentPlayer = gameState?.players.find(
          (p) => p.id === socket.getId()
        );
        const hasAlreadyEliminated =
          currentPlayer?.hasEliminatedThisRound || false;

        const showEliminateButton =
          !drawnCard && hasDiscardCard && !hasAlreadyEliminated && !activePower;

        // Check if this card is selected for swapping
        const isSelectedForSwap = swapSelections.some(
          (sel) => sel.playerId === playerId && sel.cardIndex === index
        );

        // Show power glow effect when card can be used with active power (only for non-null cards)
        const showPowerGlow = canUsePowerOnThisHand && card !== null;

        // Check if this is a temporarily revealed opponent card by power
        const isTemporarilyRevealedOpponentCard =
          !isCurrentPlayer &&
          opponentRevealedCard?.playerId === playerId &&
          opponentRevealedCard?.cardIndex === index;

        // Use the revealed card data for opponent cards
        const displayCard = isTemporarilyRevealedOpponentCard
          ? opponentRevealedCard.card
          : card;

        return (
          <div
            key={card.id}
            className="flex justify-center relative"
          >
            <div
              onClick={() => {
                if (activePower && canUsePowerOnThisHand) {
                  // Handle power usage
                  handleCardClick(playerId, index);
                } else if (isCurrentPlayer) {
                  handleSelectCard(card);
                } else {
                  handleCardClick(playerId, index);
                }
              }}
              className={`${showPowerGlow ? "animate-pulse" : ""}`}
            >
              <Card
                suit={shouldReveal ? displayCard.suit : undefined}
                rank={shouldReveal ? displayCard.rank : undefined}
                isRevealed={shouldReveal}
                isSelected={
                  (selectedCard?.cardId === card.id && isCurrentPlayer) ||
                  isSelectedForSwap
                }
                isHighlighted={
                  showPowerGlow || isTemporarilyRevealedOpponentCard
                }
                animate={
                  (isCurrentPlayer && temporaryRevealedCards.includes(index)) ||
                  isTemporarilyRevealedOpponentCard
                    ? "reveal"
                    : undefined
                }
              />
            </div>

            {/* Swap selection indicator */}
            {isSelectedForSwap && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce">
                {swapSelections.findIndex(
                  (sel) => sel.playerId === playerId && sel.cardIndex === index
                ) + 1}
              </div>
            )}

            {/* Power indicator for active powers */}
            {showPowerGlow && !isSelectedForSwap && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce">
                {activePower}
              </div>
            )}

            {/* Temporary reveal indicator for power-revealed cards */}
            {isTemporarilyRevealedOpponentCard && (
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-ping">
                👁️
              </div>
            )}

            {/* Eliminate button - only show for non-null cards */}
            {showEliminateButton && !showPowerGlow && card !== null && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card selection
                  handleEliminateCard(card.id);
                }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 hover:bg-red-700 
                          rounded-full flex items-center justify-center text-white text-xs
                          border-2 border-white shadow-lg transition-colors"
                title="Eliminate this card"
              >
                ❌
              </button>
            )}

            {/* Position indicator for eliminated cards or debugging */}
            {process.env.NODE_ENV === "development" && (
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gray-800 text-white text-xs rounded-full flex items-center justify-center">
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
