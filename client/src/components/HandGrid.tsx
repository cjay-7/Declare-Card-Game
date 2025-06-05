// client/src/components/HandGrid.tsx - Updated with King power reveal support
import React from "react";
import Card from "./Card";
import { useGameContext } from "../contexts/GameContext";
import socket from "../socket";
import type { Card as CardType } from "../utils/cardUtils";

interface HandGridProps {
  cards: (CardType | null)[]; // Allow null cards for eliminated positions
  playerId: string;
  isCurrentPlayer: boolean;
}

const HandGrid: React.FC<HandGridProps> = ({
  cards,
  playerId,
  isCurrentPlayer,
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
                  <div className="text-gray-400 text-xs">ELIMINATED</div>
                  <div className="text-gray-500 text-xs">
                    Position {index + 1}
                  </div>
                </div>
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

        // Determine if this card should be revealed:
        // 1. Card is permanently revealed through gameplay (isRevealed=true)
        // 2. Current player can see their own bottom 2 cards ONLY before first draw
        // 3. Card is temporarily revealed (in temporaryRevealedCards array)
        // 4. Opponent card is temporarily revealed by power (9/10)
        // 5. King power is revealing this card
        const shouldReveal =
          card.isRevealed || // Permanently revealed cards
          (isCurrentPlayer && index >= 2 && !hasDrawnFirstCard) || // Bottom 2 visible only before first draw
          (isCurrentPlayer && temporaryRevealedCards.includes(index)) || // Temporary reveals from powers on own cards
          (!isCurrentPlayer &&
            opponentRevealedCard?.playerId === playerId &&
            opponentRevealedCard?.cardIndex === index) || // Opponent card revealed by 9/10 power
          isKingPowerRevealed; // King power reveal

        const currentPlayer = gameState?.players.find(
          (p) => p.id === socket.getId()
        );
        const hasAlreadyEliminated =
          currentPlayer?.hasEliminatedThisRound || false;

        const showEliminateButton =
          !drawnCard &&
          hasDiscardCard &&
          !hasAlreadyEliminated &&
          !activePower &&
          !isKingPowerRevealed;

        // Check if this card is selected for swapping
        const isSelectedForSwap = swapSelections.some(
          (sel) => sel.playerId === playerId && sel.cardIndex === index
        );

        // Show power glow effect when card can be used with active power (only for non-null cards)
        const showPowerGlow =
          canUsePowerOnThisHand && card !== null && !isKingPowerRevealed;

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
              onClick={() => {
                if (
                  activePower &&
                  canUsePowerOnThisHand &&
                  !isKingPowerRevealed
                ) {
                  // Handle power usage (but not during King power reveal)
                  handleCardClick(playerId, index);
                } else if (isCurrentPlayer && !isKingPowerRevealed) {
                  handleSelectCard(card);
                } else if (!isKingPowerRevealed) {
                  handleCardClick(playerId, index);
                }
              }}
              className={`${showPowerGlow ? "animate-pulse" : ""} ${
                isKingPowerRevealed ? "pointer-events-none" : ""
              }`}
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
