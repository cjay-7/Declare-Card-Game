/* eslint-disable @typescript-eslint/no-unused-vars */
// client/src/components/HandGrid.tsx - Updated with separated power activation and prioritized elimination
import React from "react";
import Card from "./Card";
import { useGameContext } from "../contexts/GameContext";
import socket from "../socket";
import type { Card as CardType } from "../utils/cardUtils";

interface HandGridProps {
  cards: (CardType | null)[];
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
    opponentRevealedCard,
    swapSelections,
    kingPowerReveal,
    eliminationCardSelection,
    handleEliminationCardSelected,
    pendingPowerActivation, // NEW: Check for pending power activation
  } = useGameContext();

  // Check if current player has an active power (after explicit activation)
  const currentPlayer = gameState?.players.find((p) => p.id === socket.getId());
  const activePower = currentPlayer?.activePower;

  // Check if this hand should show power interaction hints (only for active powers)
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

  // UPDATED: Check if there's a card in the discard pile (elimination always available)
  const hasDiscardCard =
    gameState?.discardPile && gameState.discardPile.length > 0;
  const topDiscardCard = hasDiscardCard
    ? gameState.discardPile[gameState.discardPile.length - 1]
    : null;

  // Check if current player can eliminate (hasn't eliminated this round)
  const canEliminate =
    currentPlayer && !currentPlayer.hasEliminatedThisRound && hasDiscardCard;

  const isEliminationSelectionActive =
    eliminationCardSelection?.isActive &&
    eliminationCardSelection.eliminatedCardInfo?.eliminatingPlayerId ===
      socket.getId();

  // UPDATED: Better card click handling with proper priority system
  const handleCardClickWithValidation = (cardIndex: number) => {
    const card = paddedCards[cardIndex];

    console.log(
      `[DEBUG] Card click - Index: ${cardIndex}, IsCurrentPlayer: ${isCurrentPlayer}, DrawnCard: ${
        drawnCard ? drawnCard.rank : "none"
      }, ActivePower: ${activePower || "none"}, PendingPower: ${
        pendingPowerActivation ? pendingPowerActivation.cardRank : "none"
      }`
    );

    // PRIORITY 0: Handle elimination card selection mode (special UI state)
    if (isEliminationSelectionActive && isCurrentPlayer && card !== null) {
      console.log(
        `[ELIMINATION-SELECT] Selecting card at index ${cardIndex} to give to opponent`
      );
      handleEliminationCardSelected(cardIndex);
      return;
    }

    // Check if trying to interact with eliminated card
    if (card === null) {
      console.log(
        `[NULL-CARD] Cannot interact with eliminated card at position ${
          cardIndex + 1
        }`
      );
      return;
    }

    // PRIORITY 1: Elimination (highest priority - always check first if conditions are met)
    if (canEliminate && topDiscardCard && card.rank === topDiscardCard.rank) {
      console.log(
        `[ELIMINATION] 🎯 Elimination opportunity: ${card.rank} matches top discard ${topDiscardCard.rank}`
      );
      handleEliminateCard(card.id);
      return;
    }

    // PRIORITY 2: Active power usage (only if player has activated power)
    if (activePower && canUsePowerOnThisHand) {
      console.log(
        `[POWER-USE] ⚡ Using ${activePower} power on card at index ${cardIndex}`
      );
      handleCardClick(playerId, cardIndex);
      return;
    }

    // PRIORITY 3: Card swapping with drawn card (for current player)
    if (
      drawnCard &&
      isCurrentPlayer &&
      !activePower &&
      !pendingPowerActivation
    ) {
      console.log(
        `[SWAP] 🔄 Attempting to swap drawn card ${drawnCard.rank} with hand card ${card.rank}`
      );
      handleSelectCard(card);
      return;
    }

    // PRIORITY 4: Regular card selection for current player (when no other priorities apply)
    if (isCurrentPlayer && !activePower && !pendingPowerActivation) {
      console.log(`[SELECT] 👆 Regular card selection for card ${card.rank}`);
      handleSelectCard(card);
      return;
    }

    // PRIORITY 5: Handle opponent card clicks (when no other actions apply)
    if (!isCurrentPlayer) {
      console.log(
        `[OPPONENT-CLICK] 🔍 Clicking opponent card at index ${cardIndex}`
      );
      handleCardClick(playerId, cardIndex);
      return;
    }

    // Fallback: Log when no action is taken
    console.log(
      `[NO-ACTION] No valid action for card click at index ${cardIndex}`
    );
  };

  return (
    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto relative">
      {/* DEBUG: Show current state */}
      {process.env.NODE_ENV === "development" && isCurrentPlayer && (
        <div className="absolute -top-12 left-0 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded text-center z-30 space-y-1">
          <div>
            Drawn: {drawnCard ? drawnCard.rank : "none"} | Active:{" "}
            {activePower || "none"} | Pending:{" "}
            {pendingPowerActivation ? pendingPowerActivation.cardRank : "none"}
          </div>
          {canEliminate && topDiscardCard && (
            <div className="text-red-300">
              Can eliminate {topDiscardCard.rank}s!
            </div>
          )}
        </div>
      )}

      {/* PRIORITY 0: Elimination card selection overlay */}
      {isEliminationSelectionActive && isCurrentPlayer && (
        <div className="absolute inset-0 bg-orange-500 bg-opacity-30 rounded-lg border-2 border-orange-400 border-dashed flex items-center justify-center z-25 pointer-events-none">
          <div className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg animate-pulse">
            Select a card to give to{" "}
            {eliminationCardSelection?.eliminatedCardInfo?.cardOwnerName}
          </div>
        </div>
      )}

      {/* PRIORITY 1: Elimination overlay (shown when elimination is possible) */}
      {canEliminate && topDiscardCard && !isEliminationSelectionActive && (
        <div className="absolute inset-0 bg-red-500 bg-opacity-15 rounded-lg border-2 border-red-400 border-dotted flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold shadow-lg animate-pulse">
            🎯 Eliminate {topDiscardCard.rank}s
          </div>
        </div>
      )}

      {/* PRIORITY 2: Active Power interaction overlay */}
      {activePower &&
        canUsePowerOnThisHand &&
        paddedCards.some((card) => card !== null) && (
          <div className="absolute inset-0 bg-purple-500 bg-opacity-20 rounded-lg border-2 border-purple-400 border-dashed flex items-center justify-center z-15 pointer-events-none">
            <div className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg">
              {["7", "8"].includes(activePower)
                ? "👁️ Peek at your card"
                : ["9", "10"].includes(activePower)
                ? "🔍 Peek at opponent's card"
                : ["Q", "K"].includes(activePower)
                ? `🔄 Select cards to swap (${
                    activePower === "Q" ? "unseen" : "seen"
                  }) (${swapSelections.length}/2)`
                : "⚡ Use power"}
            </div>
          </div>
        )}

      {/* PRIORITY 3: Card swapping overlay (when drawn card exists) */}
      {drawnCard &&
        isCurrentPlayer &&
        !activePower &&
        !pendingPowerActivation && (
          <div className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-lg border-2 border-green-400 border-dashed flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg animate-pulse">
              🔄 Click any card to swap with {drawnCard.rank}
            </div>
          </div>
        )}

      {/* NEW: Pending power activation overlay (blocks other interactions) */}
      {pendingPowerActivation &&
        pendingPowerActivation.playerId === socket.getId() &&
        isCurrentPlayer && (
          <div className="absolute inset-0 bg-yellow-500 bg-opacity-20 rounded-lg border-2 border-yellow-400 border-dashed flex items-center justify-center z-5 pointer-events-none">
            <div className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg animate-bounce">
              ⏳ Power activation pending - check ActionPanel
            </div>
          </div>
        )}

      {/* Cards */}
      {paddedCards.map((card, index) => {
        if (card === null) {
          // Render eliminated card placeholder
          return (
            <div
              key={`eliminated-${index}`}
              className="flex justify-center relative"
            >
              <div
                onClick={() => handleCardClickWithValidation(index)}
                className={`cursor-pointer ${
                  isEliminationSelectionActive
                    ? "cursor-pointer"
                    : "cursor-not-allowed"
                }`}
              >
                <div className="w-16 h-24 bg-gray-800 border-2 border-dashed border-gray-600 rounded flex items-center justify-center relative">
                  <span className="text-gray-500 text-xs">Eliminated</span>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-red-800 text-white text-xs rounded-full flex items-center justify-center">
                    {index + 1}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Determine if this card should be revealed
        const shouldReveal =
          card.isRevealed ||
          (isCurrentPlayer && index >= 2 && !hasDrawnFirstCard) ||
          (isCurrentPlayer && temporaryRevealedCards.includes(index)) ||
          (!isCurrentPlayer &&
            opponentRevealedCard?.playerId === playerId &&
            opponentRevealedCard?.cardIndex === index);

        const hasAlreadyEliminated =
          currentPlayer?.hasEliminatedThisRound || false;

        // Check if this card is selected for swapping
        const isSelectedForSwap = swapSelections.some(
          (sel) => sel.playerId === playerId && sel.cardIndex === index
        );

        // UPDATED: Determine visual indicators based on priority system
        const canEliminateThisCard =
          canEliminate && topDiscardCard && card.rank === topDiscardCard.rank;
        const showPowerGlow =
          activePower && canUsePowerOnThisHand && card !== null;
        const showSwapGlow =
          drawnCard &&
          isCurrentPlayer &&
          !activePower &&
          !pendingPowerActivation;
        const showPendingPowerGlow =
          pendingPowerActivation &&
          pendingPowerActivation.playerId === socket.getId() &&
          isCurrentPlayer;

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
              onClick={() => handleCardClickWithValidation(index)}
              className={`
                cursor-pointer transition-all duration-200
                ${
                  canEliminateThisCard
                    ? "ring-2 ring-red-500 shadow-lg shadow-red-500/50 animate-pulse"
                    : ""
                }
                ${
                  showPowerGlow
                    ? "ring-2 ring-purple-500 shadow-lg shadow-purple-500/50"
                    : ""
                }
                ${showSwapGlow ? "ring-2 ring-green-400 animate-pulse" : ""}
                ${
                  showPendingPowerGlow
                    ? "ring-2 ring-yellow-400 animate-pulse opacity-75"
                    : ""
                }
                ${
                  selectedCard?.cardId === card.id ? "ring-2 ring-blue-400" : ""
                }
                ${isSelectedForSwap ? "ring-2 ring-blue-500 scale-105" : ""}
                hover:scale-105
              `}
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
                  canEliminateThisCard ||
                  showPowerGlow ||
                  isTemporarilyRevealedOpponentCard ||
                  showSwapGlow ||
                  showPendingPowerGlow
                }
                animate={
                  (isCurrentPlayer && temporaryRevealedCards.includes(index)) ||
                  isTemporarilyRevealedOpponentCard
                    ? "reveal"
                    : undefined
                }
              />
            </div>

            {/* PRIORITY 1: Elimination indicator (highest priority visual) */}
            {canEliminateThisCard && !isSelectedForSwap && (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold animate-bounce z-30">
                🎯 MATCH!
              </div>
            )}

            {/* PRIORITY 2: Active Power indicator */}
            {showPowerGlow && !canEliminateThisCard && !isSelectedForSwap && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce z-25">
                {activePower}
              </div>
            )}

            {/* PRIORITY 3: Swap selection indicator */}
            {isSelectedForSwap && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce z-20">
                {swapSelections.findIndex(
                  (sel) => sel.playerId === playerId && sel.cardIndex === index
                ) + 1}
              </div>
            )}

            {/* PRIORITY 4: Swap indicator for drawn card mode */}
            {showSwapGlow &&
              !canEliminateThisCard &&
              !showPowerGlow &&
              !isSelectedForSwap && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce z-15">
                  ↔
                </div>
              )}

            {/* PRIORITY 5: Pending power indicator */}
            {showPendingPowerGlow &&
              !canEliminateThisCard &&
              !showPowerGlow &&
              !showSwapGlow &&
              !isSelectedForSwap && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse z-10">
                  ⏳
                </div>
              )}

            {/* Temporary reveal indicator for power-revealed cards */}
            {isTemporarilyRevealedOpponentCard && (
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-ping z-25">
                👁️
              </div>
            )}

            {/* Card value indicator for revealed cards */}
            {shouldReveal && displayCard && (
              <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-gray-800 text-white text-xs rounded-full flex items-center justify-center border border-gray-600">
                {displayCard.value}
              </div>
            )}

            {/* Position indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-800 text-white text-xs rounded-full flex items-center justify-center">
              {index + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HandGrid;
