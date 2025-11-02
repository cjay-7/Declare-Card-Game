// client/src/hooks/useGameActions.ts
import { useCallback } from "react";
import { useGameContext } from "../contexts/GameContext";
import socket from "../socket";
import type { Card } from "../utils/cardUtils";

/**
 * Custom hook for managing game actions
 * 
 * This hook provides a clean interface for all game actions,
 * separating the action logic from the UI components.
 * 
 * @returns {Object} Game action functions
 */
export const useGameActions = () => {
  const { gameState, myPlayer, roomId, setSelectedCard, drawnCard, setDrawnCard, setSwapSelections } = useGameContext();

  /**
   * Handles drawing a card from the deck
   */
  const drawCard = useCallback(() => {
    if (!myPlayer || !roomId) {
      console.warn("Cannot draw card: missing player or room data");
      return;
    }

    console.log(`[${myPlayer.id}] Drawing card...`);
    socket.emit("draw-card", { roomId, playerId: myPlayer.id });
  }, [myPlayer, roomId]);

  /**
   * Handles swapping a hand card with the drawn card
   * 
   * @param {string} handCardId - The ID of the hand card to swap
   */
  const swapWithDrawnCard = useCallback((handCardId: string) => {
    if (!myPlayer || !roomId) {
      console.warn("Cannot swap card: missing player or room data");
      return;
    }

    console.log(`[${myPlayer.id}] Swapping hand card ${handCardId} with drawn card`);
    socket.emit("replace-with-drawn", {
      roomId,
      playerId: myPlayer.id,
      handCardId,
    });

    // Clear selections after swap
    setSelectedCard(null);
    setDrawnCard(null);
  }, [myPlayer, roomId, setSelectedCard, setDrawnCard]);

  /**
   * Handles discarding the drawn card
   */
  const discardDrawnCard = useCallback(() => {
    if (!myPlayer || !roomId) {
      console.warn("Cannot discard card: missing player or room data");
      return;
    }

    console.log(`[${myPlayer.id}] Discarding drawn card`);
    socket.emit("discard-drawn-card", {
      roomId,
      playerId: myPlayer.id,
    });

    // Clear drawn card
    setDrawnCard(null);
  }, [myPlayer, roomId, setDrawnCard]);

  /**
   * Handles eliminating a card
   * 
   * @param {string} cardId - The ID of the card to eliminate
   */
  const eliminateCard = useCallback((cardId: string) => {
    if (!myPlayer || !roomId) {
      console.warn("Cannot eliminate card: missing player or room data");
      return;
    }

    console.log(`[${myPlayer.id}] Eliminating card ${cardId}`);
    socket.emit("eliminate-card", {
      roomId,
      playerId: myPlayer.id,
      cardId,
    });

    setSelectedCard(null);
  }, [myPlayer, roomId, setSelectedCard]);

  /**
   * Handles declaring a hand
   * 
   * @param {string[]} declaredRanks - The ranks being declared
   */
  const declareHand = useCallback((declaredRanks: string[]) => {
    if (!myPlayer || !roomId) {
      console.warn("Cannot declare: missing player or room data");
      return;
    }

    console.log(`[${myPlayer.id}] Declaring hand with ranks:`, declaredRanks);
    socket.emit("declare", {
      roomId,
      playerId: myPlayer.id,
      declaredRanks,
    });

    // Clear selections after declaration
    setSelectedCard(null);
    setDrawnCard(null);
  }, [myPlayer, roomId, setSelectedCard, setDrawnCard]);

  /**
   * Handles selecting a card
   * 
   * @param {Card} card - The card being selected
   */
  const selectCard = useCallback((card: Card) => {
    console.log(`[${myPlayer?.id || 'unknown'}] Selecting card:`, card);

    // If there's a drawn card, clicking a hand card should replace it
    if (drawnCard) {
      swapWithDrawnCard(card.id);
      return;
    }

    // Otherwise, select/deselect for elimination
    setSelectedCard((prev: { cardId: string; isSelected: boolean } | null) => {
      if (prev?.cardId === card.id) {
        return null; // Deselect if already selected
      }
      return { cardId: card.id, isSelected: true };
    });
  }, [drawnCard, swapWithDrawnCard, setSelectedCard, myPlayer?.id]);

  /**
   * Handles card click events
   * 
   * @param {string} playerId - The ID of the player whose card was clicked
   * @param {number} cardIndex - The index of the clicked card
   */
  const handleCardClick = useCallback((playerId: string, cardIndex: number) => {
    console.log(`[${myPlayer?.id || 'unknown'}] Card clicked - player: ${playerId}, index: ${cardIndex}`);

    if (!roomId || !myPlayer) {
      console.warn("Cannot handle card click: missing room or player data");
      return;
    }

    // Get the actual card being clicked
    const targetPlayer = gameState?.players.find((p) => p.id === playerId);
    const clickedCard = targetPlayer?.hand[cardIndex];

    if (!clickedCard) {
      console.warn("No card found at clicked position");
      return;
    }

    // Handle power usage if active
    const currentPlayer = gameState?.players.find((p) => p.id === myPlayer.id);
    const activePower = currentPlayer?.activePower;
    const usingPower = currentPlayer?.usingPower;

    if (activePower && usingPower) {
      handlePowerUsage(activePower, playerId, cardIndex);
      return;
    }

    // Handle regular card interactions
    if (playerId === myPlayer.id) {
      selectCard(clickedCard);
    } else {
      // Handle opponent card clicks
      socket.emit("card-click", {
        roomId,
        playerId: myPlayer.id,
        targetPlayerId: playerId,
        cardIndex,
      });
    }
  }, [gameState, myPlayer, roomId, selectCard]);

  /**
   * Handles power usage
   * 
   * @param {string} powerType - The type of power being used
   * @param {string} playerId - The ID of the player whose card is targeted
   * @param {number} cardIndex - The index of the targeted card
   */
  const handlePowerUsage = useCallback((powerType: string, playerId: string, cardIndex: number) => {
    if (!myPlayer || !roomId) {
      console.warn("Cannot use power: missing player or room data");
      return;
    }

    console.log(`[${myPlayer.id}] Using ${powerType} power on ${playerId}'s card at index ${cardIndex}`);

    switch (powerType) {
      case "7":
      case "8":
        // Peek at own card
        if (playerId === myPlayer.id) {
          socket.emit("use-power-on-own-card", {
            roomId,
            playerId: myPlayer.id,
            cardIndex,
          });
        }
        break;

      case "9":
      case "10":
        // Peek at opponent card
        if (playerId !== myPlayer.id) {
          socket.emit("use-power-on-opponent-card", {
            roomId,
            playerId: myPlayer.id,
            targetPlayerId: playerId,
            cardIndex,
          });
        }
        break;

      case "Q":
      case "K":
        // Handle swap selection
        const newSelection = { playerId, cardIndex };
        setSwapSelections((prev: Array<{ playerId: string; cardIndex: number }>) => {
          const existingIndex = prev.findIndex(
            (sel: { playerId: string; cardIndex: number }) => sel.playerId === playerId && sel.cardIndex === cardIndex
          );

          if (existingIndex !== -1) {
            // Deselect if already selected
            return prev.filter((_: { playerId: string; cardIndex: number }, index: number) => index !== existingIndex);
          } else if (prev.length < 2) {
            // Add new selection
            const newSelections = [...prev, newSelection];
            
            // If we have 2 cards selected, execute the swap
            if (newSelections.length === 2) {
              socket.emit("use-power-swap", {
                roomId,
                playerId: myPlayer.id,
                card1PlayerId: newSelections[0].playerId,
                card1Index: newSelections[0].cardIndex,
                card2PlayerId: newSelections[1].playerId,
                card2Index: newSelections[1].cardIndex,
              });
              return [];
            }
            
            return newSelections;
          }
          
          return prev;
        });
        break;
    }
  }, [myPlayer, roomId, setSwapSelections]);

  return {
    drawCard,
    swapWithDrawnCard,
    discardDrawnCard,
    eliminateCard,
    declareHand,
    selectCard,
    handleCardClick,
  };
};

export default useGameActions;
