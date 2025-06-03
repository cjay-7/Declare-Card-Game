// client/src/contexts/GameContext.tsx - Updated with player switch support
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import socket from "../socket";
import { type Card, type CardSelection } from "../utils/cardUtils";
import type { GameState, Player, GameAction } from "../utils/gameLogic";

interface GameContextType {
  // Basic state
  playerName: string;
  setPlayerName: (name: string) => void;
  gameState: GameState | null;
  isPlayerTurn: boolean;
  myPlayer: Player | null;
  selectedCard: CardSelection | null;
  setSelectedCard: (selection: CardSelection | null) => void;
  drawnCard: Card | null;
  setDrawnCard: (card: Card | null) => void;
  roomId: string | null;
  setRoomId: (id: string) => void;

  // Animation states
  cardAnimation: string | null;
  setCardAnimation: (animation: string | null) => void;
  animatingCardId: string | null;

  // Enhanced state
  selectedPower: string | null;
  powerInstructions: string | null;
  lastAction: GameAction | null;
  hasDrawnFirstCard: boolean;
  swapSelections: Array<{ playerId: string; cardIndex: number }>;
  setSwapSelections: (
    selections: Array<{ playerId: string; cardIndex: number }>
  ) => void;

  // Temporary reveal state
  temporaryRevealedCards: number[];
  setTemporaryRevealedCards: (indices: number[]) => void;
  opponentRevealedCard: {
    playerId: string;
    cardIndex: number;
    card: Card;
  } | null;
  setOpponentRevealedCard: (
    data: { playerId: string; cardIndex: number; card: Card } | null
  ) => void;

  // Game actions
  handleDrawCard: () => void;
  handleSwapWithDrawnCard: (handCardId: string) => void;
  handleDiscardDrawnCard: () => void;
  handleEliminateCard: (cardId: string) => void;
  handleDeclare: () => void;
  handleConfirmDeclare: (declaredRanks: string[]) => void;
  handleSelectCard: (card: Card) => void;
  handleCardClick: (playerId: string, cardIndex: number) => void;
  handleViewBottomCards: () => void;

  // UI state
  showDeclareModal: boolean;
  setShowDeclareModal: (show: boolean) => void;

  // Game rules helpers
  canDiscardDrawnCard: boolean;

  // Game instructions
  getInstructionsForCard: (card: Card) => string;

  // Reset game
  resetGame: () => void;

  // Player switching
  currentPlayerId: string;
  refreshPlayerData: () => void;
}

const defaultGameState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  deck: [],
  discardPile: [],
  gameStatus: "waiting",
  matchingDiscardWindow: false,
  matchingDiscardCard: null,
  matchingDiscardTimeout: null,
  roundNumber: 1,
  declarer: null,
  lastAction: null,
  type: "view",
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardSelection | null>(null);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState(
    socket.getCurrentPlayer()
  );

  // Animation states
  const [cardAnimation, setCardAnimation] = useState<string | null>(null);
  const [animatingCardId, setAnimatingCardId] = useState<string | null>(null);

  // Enhanced states
  const [selectedPower, setSelectedPower] = useState<string | null>(null);
  const [powerInstructions, setPowerInstructions] = useState<string | null>(
    null
  );
  const [lastAction, setLastAction] = useState<GameAction | null>(null);
  const [hasDrawnFirstCard, setHasDrawnFirstCard] = useState(false);

  // Swap selection state for Q/K powers
  const [swapSelections, setSwapSelections] = useState<
    Array<{ playerId: string; cardIndex: number }>
  >([]);

  // UI states
  const [showDeclareModal, setShowDeclareModal] = useState(false);

  // Temporary revealed cards (for viewing bottom cards at game start)
  const [temporaryRevealedCards, setTemporaryRevealedCards] = useState<
    number[]
  >([]);

  // Opponent revealed card (for 9/10 powers)
  const [opponentRevealedCard, setOpponentRevealedCard] = useState<{
    playerId: string;
    cardIndex: number;
    card: Card;
  } | null>(null);

  // Listen for player switches
  useEffect(() => {
    const handlePlayerSwitch = (event: CustomEvent) => {
      const { playerId } = event.detail;
      setCurrentPlayerId(playerId);

      // Reset some state when switching players
      setSelectedCard(null);
      setSwapSelections([]);
      setTemporaryRevealedCards([]);
      setOpponentRevealedCard(null);

      console.log(`GameContext: Switched to ${playerId}`);
    };

    window.addEventListener(
      "player-switched",
      handlePlayerSwitch as EventListener
    );

    return () => {
      window.removeEventListener(
        "player-switched",
        handlePlayerSwitch as EventListener
      );
    };
  }, []);

  // Refresh player data
  const refreshPlayerData = () => {
    setCurrentPlayerId(socket.getCurrentPlayer());
  };

  // Compute if it's the current player's turn
  const myPlayer =
    gameState?.players.find((p) => p.id === socket.getId()) || null;
  const currentPlayer = gameState?.players[gameState?.currentPlayerIndex || 0];
  const isPlayerTurn =
    !!myPlayer && !!currentPlayer && myPlayer.id === currentPlayer.id;

  // Game rules helpers
  const canDiscardDrawnCard = !!drawnCard;

  // Helper to get instructions for special cards
  const getInstructionsForCard = (card: Card): string => {
    switch (card.rank) {
      case "7":
      case "8":
        return `${card.rank}: Click on one of your own cards to peek at it.`;
      case "9":
      case "10":
        return `${card.rank}: Click on one of an opponent's cards to peek at it.`;
      case "J":
        return "Jack: Skip the next player's turn (automatic).";
      case "Q":
        return "Queen: Click two cards to swap them (unseen swap).";
      case "K":
        return "King: Click two cards to swap them (seen swap - you'll see both cards first).";
      default:
        return "";
    }
  };

  // Reset hasDrawnFirstCard when game status changes to waiting
  useEffect(() => {
    if (gameState?.gameStatus === "waiting") {
      setHasDrawnFirstCard(false);
      setTemporaryRevealedCards([]);
      setOpponentRevealedCard(null);
    }
  }, [gameState?.gameStatus]);

  // Handle hiding temporary revealed cards after 5 seconds
  useEffect(() => {
    if (temporaryRevealedCards.length > 0) {
      const timer = setTimeout(() => {
        setTemporaryRevealedCards([]);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [temporaryRevealedCards]);

  // Set up socket event listeners
  useEffect(() => {
    // Handle game state updates from server/mock
    const handleGameStateUpdate = (updatedState: GameState) => {
      console.log(
        `[${currentPlayerId}] Received game state update:`,
        updatedState
      );
      setGameState(updatedState);

      // Update last action
      if (updatedState.lastAction) {
        setLastAction(updatedState.lastAction);
      }

      // Update power instructions based on active power
      const currentPlayer = updatedState.players.find(
        (p) => p.id === socket.getId()
      );
      if (currentPlayer?.activePower) {
        setSelectedPower(currentPlayer.activePower);
        setPowerInstructions(getPowerInstructions(currentPlayer.activePower));

        // Reset swap selections when power changes
        if (["Q", "K"].includes(currentPlayer.activePower)) {
          setSwapSelections([]);
        }
      } else {
        setSelectedPower(null);
        setPowerInstructions(null);
        setSwapSelections([]);
      }
    };

    // Handle card drawn event
    const handleCardDrawn = (
      cardData: Card | { playerId: string; card: Card }
    ) => {
      console.log(`[${currentPlayerId}] Card drawn event received:`, cardData);

      // Check if this is the new format with playerId
      if ("playerId" in cardData && "card" in cardData) {
        if (cardData.playerId === socket.getId()) {
          console.log("Setting drawn card for this player:", cardData.card);
          setDrawnCard(cardData.card);
          setHasDrawnFirstCard(true);
          setCardAnimation("draw");
          setAnimatingCardId(cardData.card.id);

          // Only show power preview, don't activate power until discarded
          if (
            ["7", "8", "9", "10", "J", "Q", "K"].includes(cardData.card.rank)
          ) {
            setSelectedPower(cardData.card.rank);
            setPowerInstructions(
              `Drawn ${cardData.card.rank} - power will activate when discarded`
            );
          } else {
            setSelectedPower(null);
            setPowerInstructions(null);
          }
        }
      } else {
        // Legacy format - just a card
        console.log("Setting drawn card (legacy format):", cardData);
        setDrawnCard(cardData as Card);
        setHasDrawnFirstCard(true);
        setCardAnimation("draw");
        setAnimatingCardId((cardData as Card).id);

        // Only show power preview, don't activate power until discarded
        if (
          ["7", "8", "9", "10", "J", "Q", "K"].includes((cardData as Card).rank)
        ) {
          setSelectedPower((cardData as Card).rank);
          setPowerInstructions(
            `Drawn ${
              (cardData as Card).rank
            } - power will activate when discarded`
          );
        } else {
          setSelectedPower(null);
          setPowerInstructions(null);
        }
      }
    };

    // Handle card revealed event
    const handleCardRevealed = (data: any) => {
      setCardAnimation("reveal");
      setAnimatingCardId(data.card.id);
    };

    // Handle game ended event
    const handleGameEnded = (result: any) => {
      console.log(`[${currentPlayerId}] Game ended:`, result);
    };

    // Handle penalty card event
    const handlePenaltyCard = (data: {
      playerId: string;
      penaltyCard: Card;
    }) => {
      if (data.playerId === socket.getId()) {
        console.log(
          `[${currentPlayerId}] Received penalty card:`,
          data.penaltyCard
        );
        // Server will update game state with penalty card
      }
    };

    // Handle power peek result
    const handlePowerPeekResult = (data: {
      card: Card;
      targetPlayer: string;
      targetPlayerId?: string;
      cardIndex: number;
    }) => {
      console.log(
        `[${currentPlayerId}] Power peek result: ${data.card.rank} of ${data.card.suit} from ${data.targetPlayer}`
      );

      // For own cards (7/8), reveal the card in our own hand
      if (data.targetPlayer.includes("(You)") || !data.targetPlayerId) {
        setTemporaryRevealedCards([data.cardIndex]);
      } else {
        // For opponent cards (9/10), we need to track which opponent's card to reveal
        console.log(
          `Revealed opponent card: ${data.card.rank} of ${data.card.suit} at position ${data.cardIndex}`
        );

        // Store this information so HandGrid can use it to show the revealed opponent card
        setOpponentRevealedCard({
          playerId: data.targetPlayerId,
          cardIndex: data.cardIndex,
          card: data.card,
        });
      }

      // Hide after 5 seconds
      setTimeout(() => {
        setTemporaryRevealedCards([]);
        setOpponentRevealedCard(null);
      }, 5000);
    };

    // Handle power swap preview (for K power)
    const handlePowerSwapPreview = (data: {
      card1: Card;
      card2: Card;
      player1Name: string;
      player2Name: string;
    }) => {
      console.log(
        `[${currentPlayerId}] Power swap preview: ${data.card1.rank} (${data.player1Name}) ↔ ${data.card2.rank} (${data.player2Name})`
      );
      // For K power, we could show a confirmation dialog here
      // For now, just log and proceed with the swap automatically
    };

    socket.on("game-state-update", handleGameStateUpdate);
    socket.on("card-drawn", handleCardDrawn);
    socket.on("card-revealed", handleCardRevealed);
    socket.on("game-ended", handleGameEnded);
    socket.on("penalty-card", handlePenaltyCard);
    socket.on("power-peek-result", handlePowerPeekResult);
    socket.on("power-swap-preview", handlePowerSwapPreview);

    return () => {
      socket.off("game-state-update", handleGameStateUpdate);
      socket.off("card-drawn", handleCardDrawn);
      socket.off("card-revealed", handleCardRevealed);
      socket.off("game-ended", handleGameEnded);
      socket.off("penalty-card", handlePenaltyCard);
      socket.off("power-peek-result", handlePowerPeekResult);
      socket.off("power-swap-preview", handlePowerSwapPreview);
    };
  }, [currentPlayerId]); // Add currentPlayerId as dependency

  // Helper function to get power instructions
  const getPowerInstructions = (power: string): string => {
    switch (power) {
      case "7":
      case "8":
        return "Click on one of your own cards to peek at it";
      case "9":
      case "10":
        return "Click on an opponent's card to peek at it";
      case "Q":
        return `Select 2 cards to swap (unseen) - ${swapSelections.length}/2 selected`;
      case "K":
        return `Select 2 cards to swap (seen) - ${swapSelections.length}/2 selected`;
      default:
        return "";
    }
  };

  // Reset animation after it completes
  useEffect(() => {
    if (cardAnimation) {
      const timer = setTimeout(() => {
        setCardAnimation(null);
        setAnimatingCardId(null);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [cardAnimation, animatingCardId]);

  // Game action handlers
  const handleDrawCard = () => {
    if (!isPlayerTurn || !roomId || !myPlayer) {
      console.log(
        `[${currentPlayerId}] Cannot draw card - not your turn or missing data`
      );
      return;
    }

    console.log(`[${currentPlayerId}] Drawing card...`);
    socket.emit("draw-card", { roomId, playerId: myPlayer.id });
  };

  const handleSwapWithDrawnCard = (handCardId: string) => {
    if (!isPlayerTurn || !roomId || !myPlayer || !drawnCard) {
      console.log(
        `[${currentPlayerId}] Cannot swap with drawn card - missing requirements`
      );
      return;
    }

    console.log(
      `[${currentPlayerId}] Swapping drawn card with hand card:`,
      handCardId
    );

    setCardAnimation("swap");
    setAnimatingCardId(handCardId);

    socket.emit("swap-drawn-card", {
      roomId,
      playerId: myPlayer.id,
      drawnCardId: drawnCard.id,
      handCardId: handCardId,
    });

    // Reset selections
    setSelectedCard(null);
    setDrawnCard(null);
    setSelectedPower(null);
    setPowerInstructions(null);
  };

  const handleDiscardDrawnCard = () => {
    if (!isPlayerTurn || !roomId || !myPlayer || !drawnCard) {
      console.log(
        `[${currentPlayerId}] Cannot discard drawn card - missing requirements`
      );
      return;
    }

    console.log(`[${currentPlayerId}] Discarding drawn card...`);

    setCardAnimation("discard");
    setAnimatingCardId(drawnCard.id);

    socket.emit("discard-drawn-card", {
      roomId,
      playerId: myPlayer.id,
      cardId: drawnCard.id,
    });

    // Reset selections - but don't clear power instructions yet
    // They will be updated by the game state when power activates
    setSelectedCard(null);
    setDrawnCard(null);
  };

  const handleEliminateCard = (cardId: string) => {
    // Allow elimination when there's a discard card (matching discard rule)
    const hasDiscardCard =
      gameState?.discardPile && gameState.discardPile.length > 0;

    if (!hasDiscardCard || !roomId || !myPlayer) {
      console.log(
        `[${currentPlayerId}] Cannot eliminate card - no discard card or missing data`
      );
      return;
    }

    // Check if player has already eliminated this round
    if (myPlayer.hasEliminatedThisRound) {
      console.log(
        `[${currentPlayerId}] Cannot eliminate - already eliminated this round`
      );
      return;
    }

    console.log(`[${currentPlayerId}] Eliminating card:`, cardId);

    setCardAnimation("discard");
    setAnimatingCardId(cardId);

    socket.emit("eliminate-card", {
      roomId,
      playerId: myPlayer.id,
      cardId: cardId,
    });

    setSelectedCard(null);
  };

  const handleDeclare = () => {
    if (!isPlayerTurn || !roomId || !myPlayer) {
      console.log(
        `[${currentPlayerId}] Cannot declare - not your turn or missing data`
      );
      return;
    }

    setShowDeclareModal(true);
  };

  const handleConfirmDeclare = (declaredRanks: string[]) => {
    if (!isPlayerTurn || !roomId || !myPlayer) return;

    console.log(
      `[${currentPlayerId}] Confirming declare with ranks:`,
      declaredRanks
    );

    socket.emit("declare", {
      roomId,
      playerId: myPlayer.id,
      declaredRanks,
    });

    // Reset selections
    setSelectedCard(null);
    setDrawnCard(null);
    setSelectedPower(null);
    setPowerInstructions(null);
    setShowDeclareModal(false);
  };

  const handleSelectCard = (card: Card) => {
    if (!card.id) {
      console.log(`[${currentPlayerId}] Card has no ID:`, card);
      return;
    }

    // If there's a drawn card, clicking a hand card should swap them
    if (drawnCard) {
      console.log(
        `[${currentPlayerId}] Swapping drawn card with selected card:`,
        card
      );
      handleSwapWithDrawnCard(card.id);
      return;
    }

    // Otherwise, select/deselect for elimination
    if (selectedCard && selectedCard.cardId === card.id) {
      console.log(`[${currentPlayerId}] Deselecting card:`, card);
      setSelectedCard(null);
    } else {
      console.log(`[${currentPlayerId}] Selecting card:`, card);
      setSelectedCard({ cardId: card.id, isSelected: true });
    }
  };

  const handleCardClick = (playerId: string, cardIndex: number) => {
    if (!roomId || !myPlayer) {
      console.log(
        `[${currentPlayerId}] Cannot handle card click - missing room or player data`
      );
      return;
    }

    // Check if current player has an active power
    const currentPlayer = gameState?.players.find((p) => p.id === myPlayer.id);
    const activePower = currentPlayer?.activePower;

    if (activePower) {
      // Handle power usage
      if (["7", "8"].includes(activePower) && playerId === myPlayer.id) {
        // Use power on own card
        console.log(
          `[${currentPlayerId}] Using ${activePower} power on own card`
        );
        socket.emit("use-power-on-own-card", {
          roomId,
          playerId: myPlayer.id,
          cardIndex,
        });
      } else if (
        ["9", "10"].includes(activePower) &&
        playerId !== myPlayer.id
      ) {
        // Use power on opponent card
        console.log(
          `[${currentPlayerId}] Using ${activePower} power on opponent card`
        );
        socket.emit("use-power-on-opponent-card", {
          roomId,
          playerId: myPlayer.id,
          targetPlayerId: playerId,
          cardIndex,
        });
      } else if (["Q", "K"].includes(activePower)) {
        // Handle swap power selection
        const newSelection = { playerId, cardIndex };

        // Check if this card is already selected
        const existingIndex = swapSelections.findIndex(
          (sel) => sel.playerId === playerId && sel.cardIndex === cardIndex
        );

        if (existingIndex >= 0) {
          // Deselect if already selected
          const newSelections = swapSelections.filter(
            (_, index) => index !== existingIndex
          );
          setSwapSelections(newSelections);
          console.log(
            `[${currentPlayerId}] Deselected card for ${activePower} power`
          );
        } else if (swapSelections.length < 2) {
          // Add to selections if we have room
          const newSelections = [...swapSelections, newSelection];
          setSwapSelections(newSelections);
          console.log(
            `[${currentPlayerId}] Selected card ${newSelections.length}/2 for ${activePower} power`
          );

          // If we have 2 selections, execute the swap
          if (newSelections.length === 2) {
            console.log(
              `[${currentPlayerId}] Executing ${activePower} power swap`
            );
            socket.emit("use-power-swap", {
              roomId,
              playerId: myPlayer.id,
              card1PlayerId: newSelections[0].playerId,
              card1Index: newSelections[0].cardIndex,
              card2PlayerId: newSelections[1].playerId,
              card2Index: newSelections[1].cardIndex,
            });

            // Reset selections
            setSwapSelections([]);
          }
        }

        // Update power instructions
        setPowerInstructions(getPowerInstructions(activePower));
      }
      return;
    }

    // No active power - just regular card click (no special behavior)
    console.log(`[${currentPlayerId}] Regular card click - no active power`);
  };

  // Function to view the bottom two cards at the start of the game
  const handleViewBottomCards = () => {
    if (!myPlayer || hasDrawnFirstCard) {
      console.log(
        `[${currentPlayerId}] Cannot view bottom cards - already drawn first card`
      );
      return;
    }

    // Get the indices of the bottom two cards (indices 2 and 3)
    const bottomCardIndices = [2, 3];

    // Temporarily reveal these cards
    setTemporaryRevealedCards(bottomCardIndices);

    console.log(
      `[${currentPlayerId}] Viewing bottom cards:`,
      bottomCardIndices
    );
  };

  // Reset game state
  const resetGame = () => {
    setSelectedCard(null);
    setDrawnCard(null);
    setCardAnimation(null);
    setAnimatingCardId(null);
    setSelectedPower(null);
    setPowerInstructions(null);
    setHasDrawnFirstCard(false);
    setTemporaryRevealedCards([]);
    setOpponentRevealedCard(null);
    setSwapSelections([]);
    setShowDeclareModal(false);
  };

  return (
    <GameContext.Provider
      value={{
        playerName,
        setPlayerName,
        gameState,
        isPlayerTurn,
        myPlayer,
        selectedCard,
        setSelectedCard,
        drawnCard,
        setDrawnCard,
        roomId,
        setRoomId,
        cardAnimation,
        setCardAnimation,
        animatingCardId,
        selectedPower,
        powerInstructions,
        lastAction,
        hasDrawnFirstCard,
        temporaryRevealedCards,
        setTemporaryRevealedCards,
        opponentRevealedCard,
        setOpponentRevealedCard,
        swapSelections,
        setSwapSelections,
        handleDrawCard,
        handleSwapWithDrawnCard,
        handleDiscardDrawnCard,
        handleEliminateCard,
        handleDeclare,
        handleConfirmDeclare,
        handleSelectCard,
        handleCardClick,
        handleViewBottomCards,
        showDeclareModal,
        setShowDeclareModal,
        canDiscardDrawnCard,
        getInstructionsForCard,
        resetGame,
        currentPlayerId,
        refreshPlayerData,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context)
    throw new Error("useGameContext must be used within GameProvider");
  return context;
};
