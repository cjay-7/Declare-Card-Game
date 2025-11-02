/* eslint-disable @typescript-eslint/no-unused-vars */
// client/src/components/HandGrid.tsx - Migrated to use split contexts
import React, { memo } from "react";
import Card from "./Card";
import { useGameContext } from "../contexts/GameContext";
import socket from "../socket";
import type { Card as CardType } from "../utils/cardUtils";
import { DeclarationMode } from "./HandGrid/DeclarationMode";

interface HandGridProps {
  cards: (CardType | null)[];
  playerId: string;
  isCurrentPlayer: boolean;
  isPlayerTurn?: boolean;
  isDeclarationMode?: boolean;
  onConfirmDeclaration?: (declaredRanks: string[]) => void;
  onCancelDeclaration?: () => void;
}

const HandGrid: React.FC<HandGridProps> = memo(({
  cards,
  playerId,
  isCurrentPlayer,
  isPlayerTurn = false,
  isDeclarationMode = false,
  onConfirmDeclaration,
  onCancelDeclaration,
}) => {
  // Use GameContext for all state to ensure proper synchronization
  const {
    gameState,
    myPlayer,
    selectedCard,
    temporaryRevealedCards,
    opponentRevealedCard,
    swapSelections,
    drawnCard,
    eliminationCardSelection,
    handleSelectCard,
    handleCardClick,
    handleEliminateCard,
    handleEliminationCardSelected,
    handleActivatePower,
    handleSkipPower,
    hasDrawnFirstCard,
  } = useGameContext();

  // Check if current player has an active power
  const currentPlayer = gameState?.players.find((p) => p.id === socket.getId());
  const activePower = currentPlayer?.activePower;
  const usingPower = currentPlayer?.usingPower;

  // Check if this hand should show power interaction hints
  const canUsePowerOnThisHand =
    activePower && usingPower &&
    ((["7", "8"].includes(activePower) && isCurrentPlayer) ||
      (["9", "10"].includes(activePower) && !isCurrentPlayer) ||
      ["Q", "K"].includes(activePower));

  // Ensure we always have 4 positions (pad with nulls if needed)
  const paddedCards: (CardType | null)[] = [...cards];
  while (paddedCards.length < 4) {
    paddedCards.push(null);
  }

  // Check if there's a card in the discard pile for elimination
  const hasDiscardCard =
    gameState?.discardPile && gameState.discardPile.length > 0;

  // Get current player data for elimination logic
  const currentPlayerData = gameState?.players.find(
    (p) => p.id === socket.getId()
  );
  const hasAlreadyEliminated = currentPlayerData?.hasEliminatedThisRound || false;


  const isEliminationSelectionActive =
    eliminationCardSelection?.isActive &&
    eliminationCardSelection.eliminatedCardInfo?.eliminatingPlayerId ===
      socket.getId();

  // FIXED: Better card click handling with proper debugging
  const handleCardClickWithValidation = (cardIndex: number) => {
    const card = paddedCards[cardIndex];

    console.log(
      `[DEBUG] Card click - Index: ${cardIndex}, IsCurrentPlayer: ${isCurrentPlayer}, DrawnCard: ${
        drawnCard ? drawnCard.rank : "none"
      }, ActivePower: ${activePower || "none"}`
    );

    // Check if trying to interact with eliminated card
    if (card === null) {
      console.log(
        `Cannot interact with eliminated card`
      );
      return;
    }

    // Handle power usage FIRST (highest priority when power is being used)
    if (activePower && canUsePowerOnThisHand) {
      console.log(
        `[POWER] Using ${activePower} power on card at index ${cardIndex}`
      );
      handleCardClick(playerId, cardIndex);
      return;
    }

    // Handle card replacement with drawn card (second priority)
    if (drawnCard && isCurrentPlayer && !(activePower && usingPower)) {
      console.log(
        `[REPLACE] Attempting to replace hand card ${card.rank} with drawn card ${drawnCard.rank}`
      );
      handleSelectCard(card);
      return;
    }

    // Handle elimination card selection mode (third priority)
    if (isEliminationSelectionActive && isCurrentPlayer && card !== null) {
      console.log(`Selecting card at index ${cardIndex} to give to opponent`);
      handleEliminationCardSelected(cardIndex);
      return;
    }

    // Handle regular card selection for current player
    if (isCurrentPlayer) {
      console.log(`[SELECT] Regular card selection for card ${card.rank}`);
      handleSelectCard(card);
      return;
    }

    // Handle opponent card clicks
    console.log(`[OPPONENT] Clicking opponent card at index ${cardIndex}`);
    handleCardClick(playerId, cardIndex);
  };

  // Show declaration mode if enabled and it's the current player
  if (isDeclarationMode && isCurrentPlayer && onConfirmDeclaration && onCancelDeclaration) {
    return (
      <DeclarationMode
        cards={paddedCards}
        onConfirm={onConfirmDeclaration}
        onCancel={onCancelDeclaration}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto relative">
      {/* DEBUG: Show drawn card state */}
      {process.env.NODE_ENV === "development" &&
        drawnCard &&
        isCurrentPlayer && (
          <div className="absolute -top-8 left-0 right-0 bg-green-600 text-white text-xs px-2 py-1 rounded text-center z-30">
            Drawn: {drawnCard.rank} - Click any card to replace!
          </div>
        )}

      {/* Elimination card selection overlay */}
      {isEliminationSelectionActive && isCurrentPlayer && (
        <div className="absolute inset-0 bg-orange-500 bg-opacity-30 rounded-lg border-2 border-orange-400 border-dashed flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg animate-pulse">
            Select a card to give to{" "}
            {eliminationCardSelection?.eliminatedCardInfo?.cardOwnerName}
          </div>
        </div>
      )}

      {/* Power interaction overlay */}
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

      {/* Card swapping overlay - NEW */}
      {drawnCard && isCurrentPlayer && !activePower && (
        <div className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-lg border-2 border-green-400 border-dashed flex items-center justify-center z-15 pointer-events-none">
          <div className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg animate-pulse">
            Click any card to replace with {drawnCard.rank}
          </div>
        </div>
      )}

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
                className="cursor-not-allowed"
              >
                <div className="w-16 h-24 bg-gray-800 border-2 border-dashed border-gray-600 rounded flex items-center justify-center relative">
                  <span className="text-gray-500 text-xs">Eliminated</span>
                </div>
              </div>
            </div>
          );
        }

        // Determine if this card should be revealed
        // Logic: Start with cards 3&4 visible, hide ALL cards after first draw, only show via powers/temporary reveals
        const shouldReveal =
          (card.isRevealed && !(isCurrentPlayer && index >= 2 && hasDrawnFirstCard)) || // Show revealed cards, but hide initial cards 3&4 after first draw
          (isCurrentPlayer && index >= 2 && !hasDrawnFirstCard) || // Cards 3 & 4 visible only before first draw
          (isCurrentPlayer && temporaryRevealedCards.includes(index)) || // Temporary power reveals
          (!isCurrentPlayer &&
            opponentRevealedCard?.playerId === playerId &&
            opponentRevealedCard?.cardIndex === index); // Opponent card revealed by power

        // Debug power reveal logic
        if (isCurrentPlayer && temporaryRevealedCards.includes(index)) {
          console.log(`[HANDGRID DEBUG] Card ${index} should be revealed by power:`, {
            card: card?.rank,
            temporaryRevealedCards,
            shouldReveal
          });
        }

        // Check if this card matches the top discard card rank for elimination
        const topDiscardCard = gameState?.discardPile && gameState.discardPile.length > 0 
          ? gameState.discardPile[gameState.discardPile.length - 1] 
          : null;
        const cardMatchesDiscard = topDiscardCard && card && card.rank === topDiscardCard.rank;

        // Debug card matching for Cabo elimination
        if (topDiscardCard && card) {
          console.log(`[CABO ELIMINATION] Card ${card.rank} vs Discard ${topDiscardCard.rank} - Risk: ${!cardMatchesDiscard ? 'PENALTY if eliminated' : 'SAFE elimination'}`);
        }

        const showEliminateButton =
          !drawnCard && 
          hasDiscardCard && 
          !hasAlreadyEliminated && 
          !(activePower && usingPower) && 
          !gameState?.eliminationBlocked &&
          card !== null; // Show on ALL cards - Cabo elimination is about memory risk

        // Debug elimination button logic for Cabo
        if (topDiscardCard && card) {
          console.log(`[CABO ELIMINATION DEBUG] Card ${card.rank} (${playerId}):`, {
            hasDiscardCard,
            hasAlreadyEliminated,
            activePower: !!activePower,
            usingPower: !!usingPower,
            eliminationBlocked: gameState?.eliminationBlocked,
            cardMatchesDiscard,
            showEliminateButton
          });
        }

        // Check if this card is selected for swapping
        const isSelectedForSwap = swapSelections.some(
          (sel) => sel.playerId === playerId && sel.cardIndex === index
        );

        // Show power glow effect when card can be used with active power
        const showPowerGlow = canUsePowerOnThisHand && card !== null;

        // Show replace glow effect when there's a drawn card to replace with
        const showReplaceGlow = drawnCard && isCurrentPlayer && !(activePower && usingPower);

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
                ${showPowerGlow ? "animate-pulse" : ""}
                ${showReplaceGlow ? "ring-2 ring-green-400 animate-pulse" : ""}
                ${
                  selectedCard?.cardId === card.id ? "ring-2 ring-blue-400" : ""
                }
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
                  showPowerGlow ||
                  isTemporarilyRevealedOpponentCard ||
                  showReplaceGlow
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

            {/* Replace indicator for drawn card mode */}
            {showReplaceGlow && !isSelectedForSwap && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce">
                ↔
              </div>
            )}

            {/* Power indicator for active powers */}
            {showPowerGlow && !isSelectedForSwap && !showReplaceGlow && (
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

            {/* Eliminate button */}
            {showEliminateButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEliminateCard(card.id);
                }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 hover:bg-red-700 
                          rounded-full flex items-center justify-center text-white text-xs
                          border-2 border-white shadow-lg transition-colors"
                title={`Eliminate this card (Cabo elimination - risk penalty if wrong!)`}
              >
                ❌
              </button>
            )}


          </div>
        );
      })}
    </div>
  );
});

// Set display name for debugging
HandGrid.displayName = "HandGrid";

export default HandGrid;
