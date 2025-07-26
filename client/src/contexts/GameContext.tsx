/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// client/src/contexts/GameContext.tsx - Updated with King power card revelation
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

interface KingPowerReveal {
  powerUserId: string;
  powerUserName: string;
  card1: {
    card: Card;
    playerId: string;
    playerName: string;
    cardIndex: number;
  };
  card2: {
    card: Card;
    playerId: string;
    playerName: string;
    cardIndex: number;
  };
  message: string;
  swapData?: {
    card1PlayerId: string;
    card1Index: number;
    card2PlayerId: string;
    card2Index: number;
  };
  showConfirmation?: boolean;
}

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
  handleActivatePower: (powerType: string) => void;
  handleSkipPower: (powerType: string) => void;
  handleConfirmKingPowerSwap: () => void;
  handleCancelKingPowerSwap: () => void;

  eliminationCardSelection: {
    isActive: boolean;
    eliminatedCardInfo: {
      eliminatingPlayerId: string;
      cardOwnerId: string;
      cardOwnerName: string;
      cardIndex: number;
      eliminatedCard: Card;
    } | null;
  } | null;

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

  // King power reveal state
  kingPowerReveal: KingPowerReveal | null;
  setKingPowerReveal: (reveal: KingPowerReveal | null) => void;

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

  handleEliminationCardSelected: (cardIndex: number) => void;
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

  // King power reveal state
  const [kingPowerReveal, setKingPowerReveal] =
    useState<KingPowerReveal | null>(null);

  const [eliminationCardSelection, setEliminationCardSelection] = useState<{
    isActive: boolean;
    eliminatedCardInfo: {
      eliminatingPlayerId: string;
      cardOwnerId: string;
      cardOwnerName: string;
      cardIndex: number;
      eliminatedCard: Card;
    } | null;
  } | null>(null);

  const [hasShownTransferNotification, setHasShownTransferNotification] =
    useState(false);

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
      setKingPowerReveal(null);

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
    setEliminationCardSelection(null);
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
        return "King: Click two cards to swap them (seen swap - both cards will be revealed first).";
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
      setKingPowerReveal(null);
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

  // Handle hiding King power reveals after some time (but not confirmation dialogs)
  useEffect(() => {
    if (kingPowerReveal && !kingPowerReveal.showConfirmation) {
      const timer = setTimeout(() => {
        setKingPowerReveal(null);
      }, 3000); // Hide after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [kingPowerReveal]);

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

      // Clear elimination selection if game state changes
      if (eliminationCardSelection?.isActive) {
        setEliminationCardSelection(null);
      }

      // Update power instructions based on current player's power state
      const currentPlayer = updatedState.players.find(
        (p) => p.id === socket.getId()
      );

      if (currentPlayer?.activePower) {
        if (currentPlayer.usingPower) {
          // Player is actively using the power - show usage instructions
          setSelectedPower(currentPlayer.activePower);
          setPowerInstructions(
            getPowerUsageInstructions(currentPlayer.activePower)
          );
        } else {
          // Player has power available but hasn't chosen to use it yet - show choice prompt
          setSelectedPower(currentPlayer.activePower);
          setPowerInstructions(
            getPowerChoiceInstructions(currentPlayer.activePower)
          );
        }

        // Reset swap selections when power state changes
        if (["Q", "K"].includes(currentPlayer.activePower)) {
          setSwapSelections([]);
        }
      } else {
        // No power available
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
            if (cardData.card.rank === "J") {
              setPowerInstructions(
                `Drawn Jack - will automatically skip next player when discarded`
              );
            } else {
              setPowerInstructions(
                `Drawn ${cardData.card.rank} - you can choose to use its power or skip after discarding`
              );
            }
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
          if ((cardData as Card).rank === "J") {
            setPowerInstructions(
              `Drawn Jack - will automatically skip next player when discarded`
            );
          } else {
            setPowerInstructions(
              `Drawn ${
                (cardData as Card).rank
              } - you can choose to use its power or skip after discarding`
            );
          }
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

    // NEW: Handle King power reveal event
    const handleKingPowerReveal = (data: KingPowerReveal) => {
      console.log(`[${currentPlayerId}] King power reveal:`, data);

      // Set the King power reveal state to show both cards
      setKingPowerReveal(data);

      // Also set temporary revealed cards if this affects the current player
      const myPlayerId = socket.getId();
      const revealedIndices: number[] = [];

      if (data.card1.playerId === myPlayerId) {
        revealedIndices.push(data.card1.cardIndex);
      }
      if (data.card2.playerId === myPlayerId) {
        revealedIndices.push(data.card2.cardIndex);
      }

      if (revealedIndices.length > 0) {
        setTemporaryRevealedCards(revealedIndices);
      }

      // For opponent cards, set the opponent revealed card state
      if (data.card1.playerId !== myPlayerId) {
        setOpponentRevealedCard({
          playerId: data.card1.playerId,
          cardIndex: data.card1.cardIndex,
          card: data.card1.card,
        });
      }
      if (
        data.card2.playerId !== myPlayerId &&
        data.card1.playerId !== data.card2.playerId
      ) {
        // If both cards are from different opponents, we'll show the first one
        // In a full implementation, you might want to handle multiple opponent reveals
        setOpponentRevealedCard({
          playerId: data.card2.playerId,
          cardIndex: data.card2.cardIndex,
          card: data.card2.card,
        });
      }
    };

    // NEW: Handle King power preview event (for confirmation)
    const handleKingPowerPreview = (data: {
      powerUserId: string;
      powerUserName: string;
      card1: {
        card: Card;
        playerId: string;
        playerName: string;
        cardIndex: number;
      };
      card2: {
        card: Card;
        playerId: string;
        playerName: string;
        cardIndex: number;
      };
      message: string;
      swapData: {
        card1PlayerId: string;
        card1Index: number;
        card2PlayerId: string;
        card2Index: number;
      };
    }) => {
      console.log(`[${currentPlayerId}] King power preview:`, data);
      
      // Store the king power preview data for the confirmation UI
      // Cards will be shown in the dialog, not revealed on the game board
      setKingPowerReveal({
        powerUserId: data.powerUserId,
        powerUserName: data.powerUserName,
        card1: data.card1,
        card2: data.card2,
        message: data.message,
        swapData: data.swapData,
        showConfirmation: true, // Flag to show confirmation dialog
      });
    };

    // NEW: Handle King power swap completed event
    const handlePowerSwapCompleted = (data: {
      powerUserId: string;
      powerUserName: string;
      power: string;
      swapDetails: {
        player1Name: string;
        player2Name: string;
        card1Rank: string;
        card2Rank: string;
      };
    }) => {
      console.log(`[${currentPlayerId}] Power swap completed:`, data);

      // Clear the King power reveal state
      setKingPowerReveal(null);
      setTemporaryRevealedCards([]);
      setOpponentRevealedCard(null);
    };

    socket.on("game-state-update", handleGameStateUpdate);
    socket.on("card-drawn", handleCardDrawn);
    socket.on("card-revealed", handleCardRevealed);
    socket.on("game-ended", handleGameEnded);
    socket.on("penalty-card", handlePenaltyCard);
    socket.on("power-peek-result", handlePowerPeekResult);
    socket.on("power-swap-preview", handlePowerSwapPreview);
    socket.on("king-power-reveal", handleKingPowerReveal);
    socket.on("king-power-preview", handleKingPowerPreview);
    socket.on("power-swap-completed", handlePowerSwapCompleted);
    // Add this handler in the socket event listeners section of GameContext.tsx

    // Handle elimination card transfer with deduplication
    let lastTransferTimestamp = 0;
    const handleEliminationCardTransfer = (data: any) => {
      // Deduplicate based on timestamp
      const currentTime = Date.now();
      if (currentTime - lastTransferTimestamp < 100) {
        console.log(
          `[${currentPlayerId}] Ignoring duplicate elimination transfer event`
        );
        return;
      }
      lastTransferTimestamp = currentTime;

      console.log(`[${currentPlayerId}] Elimination card transfer:`, data);

      // Show notification only once
      if (!hasShownTransferNotification) {
        setLastAction({
          type: "elimination-transfer",
          playerId: data.eliminatingPlayerId || currentPlayerId,
          message: `${data.eliminatingPlayerName} eliminated ${data.eliminatedCard.rank} from ${data.cardOwnerName}'s hand and gave them a ${data.givenCard.rank}!`,
          timestamp: Date.now(),
        });
        setHasShownTransferNotification(true);

        // Reset flag after a delay
        setTimeout(() => setHasShownTransferNotification(false), 1000);
      }
    };

    socket.on("elimination-card-transfer", handleEliminationCardTransfer);

    const handleEliminationCardSelectionRequired = (data: {
      eliminatingPlayerId: string;
      cardOwnerId: string;
      cardOwnerName: string;
      cardIndex: number;
      eliminatedCard: Card;
    }) => {
      console.log(
        `[${currentPlayerId}] Elimination card selection required:`,
        data
      );

      // Only show selection UI for the eliminating player
      if (socket.getId() === data.eliminatingPlayerId) {
        setEliminationCardSelection({
          isActive: true,
          eliminatedCardInfo: data,
        });
      }
    };

    socket.on(
      "elimination-card-selection-required",
      handleEliminationCardSelectionRequired
    );

    return () => {
      socket.off("game-state-update", handleGameStateUpdate);
      socket.off("card-drawn", handleCardDrawn);
      socket.off("card-revealed", handleCardRevealed);
      socket.off("game-ended", handleGameEnded);
      socket.off("penalty-card", handlePenaltyCard);
      socket.off("power-peek-result", handlePowerPeekResult);
      socket.off("power-swap-preview", handlePowerSwapPreview);
      socket.off("king-power-reveal", handleKingPowerReveal);
      socket.off("king-power-preview", handleKingPowerPreview);
      socket.off("power-swap-completed", handlePowerSwapCompleted);
      socket.off(
        "elimination-card-selection-required",
        handleEliminationCardSelectionRequired
      );
    };
  }, [currentPlayerId]); // Add currentPlayerId as dependency

  // Helper function to get power choice instructions (when power is available but not being used)
  const getPowerChoiceInstructions = (power: string): string => {
    switch (power) {
      case "7":
      case "8":
        return `${power} power available: You can peek at one of your own cards. Choose to use it or skip.`;
      case "9":
      case "10":
        return `${power} power available: You can peek at one opponent's card. Choose to use it or skip.`;
      case "Q":
        return "Queen power available: You can swap any two cards without seeing them first. Choose to use it or skip.";
      case "K":
        return "King power available: You can swap any two cards (both will be revealed first). Choose to use it or skip.";
      default:
        return "";
    }
  };

  // Helper function to get power usage instructions (when player is actively using power)
  const getPowerUsageInstructions = (power: string): string => {
    switch (power) {
      case "7":
      case "8":
        return `${power} power active: Click on one of your own cards to peek at it.`;
      case "9":
      case "10":
        return `${power} power active: Click on one opponent's card to peek at it.`;
      case "Q":
        return `Queen power active: Click on two cards to swap them (unseen swap). ${swapSelections.length}/2 selected.`;
      case "K":
        return `King power active: Click on two cards to swap them (both cards will be revealed first). ${swapSelections.length}/2 selected.`;
      default:
        return "";
    }
  };

  // Legacy function for backward compatibility
  const getPowerInstructions = (power: string): string => {
    return getPowerUsageInstructions(power);
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

  // Power activation handlers
  const handleActivatePower = (powerType: string) => {
    console.log(`[${currentPlayerId}] Activating ${powerType} power`);
    socket.emit("activate-power", {
      roomId: "QUICK", // You might want to make this dynamic
      playerId: socket.getId(),
      powerType: powerType,
    });
  };

  const handleSkipPower = (powerType: string) => {
    console.log(`[${currentPlayerId}] Skipping ${powerType} power`);
    socket.emit("skip-power", {
      roomId: "QUICK", // You might want to make this dynamic
      playerId: socket.getId(),
      powerType: powerType,
    });
  };

  const handleConfirmKingPowerSwap = () => {
    if (!kingPowerReveal?.swapData) return;
    
    console.log(`[${currentPlayerId}] Confirming King power swap`);
    socket.emit("confirm-king-power-swap", {
      roomId: "QUICK", // You might want to make this dynamic
      playerId: socket.getId(),
      swapData: kingPowerReveal.swapData,
    });
    
    // Clear the king power reveal state
    setKingPowerReveal(null);
  };

  const handleCancelKingPowerSwap = () => {
    console.log(`[${currentPlayerId}] Cancelling King power swap`);
    socket.emit("cancel-king-power-swap", {
      roomId: "QUICK", // You might want to make this dynamic
      playerId: socket.getId(),
    });
    
    // Clear the king power reveal state
    setKingPowerReveal(null);
  };

  // Game action handlers (keeping all existing handlers the same)
  const handleDrawCard = () => {
    if (!isPlayerTurn || !roomId || !myPlayer) {
      console.log(
        `[${currentPlayerId}] Cannot draw card - not your turn or missing data`
      );
      return;
    }

    // Check if player has an active power that needs to be resolved first
    const currentPlayer = gameState?.players.find((p) => p.id === myPlayer.id);
    if (currentPlayer?.activePower) {
      console.log(
        `[${currentPlayerId}] Cannot draw card - must resolve ${currentPlayer.activePower} power first`
      );
      return;
    }

    console.log(`[${currentPlayerId}] Drawing card...`);
    socket.emit("draw-card", { roomId, playerId: myPlayer.id });
  };

  const handleSwapWithDrawnCard = (handCardId: string) => {
    console.log(
      `[${currentPlayerId}] handleSwapWithDrawnCard called with handCardId: ${handCardId}`
    );
    console.log(
      `[${currentPlayerId}] Current state - isPlayerTurn: ${isPlayerTurn}, roomId: ${roomId}, myPlayer: ${myPlayer?.name}, drawnCard: ${drawnCard?.rank}`
    );

    if (!isPlayerTurn || !roomId || !myPlayer || !drawnCard) {
      console.log(
        `[${currentPlayerId}] ❌ Cannot replace with drawn card - missing requirements:`,
        {
          isPlayerTurn,
          hasRoomId: !!roomId,
          hasMyPlayer: !!myPlayer,
          hasDrawnCard: !!drawnCard,
        }
      );
      return;
    }

    console.log(
      `[${currentPlayerId}] ✅ Replacing hand card (${handCardId}) with drawn card ${drawnCard.rank} (${drawnCard.id})`
    );

    setCardAnimation("replace");
    setAnimatingCardId(handCardId);

    socket.emit("replace-with-drawn", {
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

    console.log(`[${currentPlayerId}] ✅ Swap command sent, states cleared`);
  };

  const handleDiscardDrawnCard = () => {
    if (!isPlayerTurn || !roomId || !myPlayer || !drawnCard) {
      console.log(
        `[${currentPlayerId}] Cannot discard drawn card - missing requirements`
      );
      return;
    }

    console.log(`[${currentPlayerId}] Discarding drawn card...`);

    // Store the card ID before clearing state to prevent double emissions
    const cardToDiscard = drawnCard;
    
    setCardAnimation("discard");
    setAnimatingCardId(cardToDiscard.id);
    
    // Clear drawn card immediately to prevent double calls
    setDrawnCard(null);

    socket.emit("discard-drawn-card", {
      roomId,
      playerId: myPlayer.id,
      cardId: cardToDiscard.id,
    });

    // Reset selections - but don't clear power instructions yet
    // They will be updated by the game state when power activates
    setSelectedCard(null);
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

    // Check if eliminations are currently blocked
    if (gameState?.eliminationBlocked) {
      console.log(
        `[${currentPlayerId}] Cannot eliminate - eliminations are blocked after first elimination`
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
  const handleEliminationCardSelected = (cardIndex: number) => {
    if (!eliminationCardSelection?.eliminatedCardInfo) return;

    const {
      eliminatingPlayerId,
      cardOwnerId,
      cardOwnerName,
      cardIndex: targetIndex,
      eliminatedCard,
    } = eliminationCardSelection.eliminatedCardInfo;

    // CRITICAL FIX: Get the actual card from the non-padded hand array
    const eliminatingPlayer = gameState?.players.find(
      (p) => p.id === eliminatingPlayerId
    );
    if (!eliminatingPlayer) {
      console.error("Eliminating player not found");
      return;
    }

    // Find the actual card at the selected index, skipping null positions
    let actualCardIndex = -1;
    let nonNullCount = 0;

    for (let i = 0; i < eliminatingPlayer.hand.length; i++) {
      if (eliminatingPlayer.hand[i] !== null) {
        if (nonNullCount === cardIndex) {
          actualCardIndex = i;
          break;
        }
        nonNullCount++;
      }
    }

    if (actualCardIndex === -1) {
      console.error(`No valid card found at UI index ${cardIndex}`);
      return;
    }

    console.log(
      `[${currentPlayerId}] Selected card at UI index ${cardIndex} (actual index ${actualCardIndex}) to give to ${cardOwnerName}`
    );

    socket.emit("complete-elimination-card-give", {
      roomId,
      eliminatingPlayerId,
      cardOwnerId,
      cardOwnerName,
      selectedCardIndex: actualCardIndex, // Use the actual array index, not UI index
      targetCardIndex: targetIndex,
      eliminatedCard,
    });

    // Clear the selection state
    setEliminationCardSelection(null);
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
    console.log(`[${currentPlayerId}] handleSelectCard called with:`, card);

    if (!card.id) {
      console.log(`[${currentPlayerId}] Card has no ID:`, card);
      return;
    }

    // PRIORITY 1: If there's a drawn card, clicking a hand card should replace it
    if (drawnCard) {
      console.log(
        `[${currentPlayerId}] REPLACING: hand card ${card.rank} with drawn card ${drawnCard.rank} (ID: ${card.id})`
      );
      handleSwapWithDrawnCard(card.id);
      return;
    }

    console.log(
      `[${currentPlayerId}] No drawn card, handling as regular selection`
    );

    // PRIORITY 2: Otherwise, select/deselect for elimination
    if (selectedCard && selectedCard.cardId === card.id) {
      console.log(`[${currentPlayerId}] Deselecting card:`, card);
      setSelectedCard(null);
    } else {
      console.log(`[${currentPlayerId}] Selecting card:`, card);
      setSelectedCard({ cardId: card.id, isSelected: true });
    }
  };

  const handleCardClick = (playerId: string, cardIndex: number) => {
    console.log(
      `[${currentPlayerId}] handleCardClick called - playerId: ${playerId}, cardIndex: ${cardIndex}`
    );

    if (!roomId || !myPlayer) {
      console.log(
        `[${currentPlayerId}] Cannot handle card click - missing room or player data`
      );
      return;
    }

    // Get the actual card being clicked
    const targetPlayer = gameState?.players.find((p) => p.id === playerId);
    const clickedCard = targetPlayer?.hand[cardIndex];

    console.log(`[${currentPlayerId}] Clicked card:`, clickedCard);
    console.log(`[${currentPlayerId}] Current drawn card:`, drawnCard);

    // PRIORITY 1: If this is the current player's card and there's a drawn card, handle replacement
    if (playerId === myPlayer.id && drawnCard && clickedCard) {
      console.log(
        `[${currentPlayerId}] DIRECT REPLACE: Replacing clicked ${clickedCard.rank} with drawn ${drawnCard.rank}`
      );
      handleSwapWithDrawnCard(clickedCard.id);
      return;
    }

    // Check if current player has an active power and is using it
    const currentPlayer = gameState?.players.find((p) => p.id === myPlayer.id);
    const activePower = currentPlayer?.activePower;
    const usingPower = currentPlayer?.usingPower;

    console.log(`[${currentPlayerId}] Active power:`, activePower, 'Using power:', usingPower);

    if (activePower && usingPower) {
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
        // Handle Q/K swap selection
        const newSelection = { playerId, cardIndex };
        const existingIndex = swapSelections.findIndex(
          (sel) => sel.playerId === playerId && sel.cardIndex === cardIndex
        );

        if (existingIndex !== -1) {
          // Deselect if already selected
          const newSelections = swapSelections.filter(
            (_, index) => index !== existingIndex
          );
          setSwapSelections(newSelections);
          console.log(
            `[${currentPlayerId}] Deselected card for ${activePower} power`
          );
        } else if (swapSelections.length < 2) {
          // Add new selection
          const newSelections = [...swapSelections, newSelection];
          setSwapSelections(newSelections);
          console.log(
            `[${currentPlayerId}] Selected card ${
              swapSelections.length + 1
            }/2 for ${activePower} power`
          );

          // If we have 2 cards selected, execute the swap
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
            setSwapSelections([]);
          }
        }
      }
    } else {
      console.log(`[${currentPlayerId}] Regular card click - no active power`);

      // For own cards without active power, delegate to handleSelectCard
      if (playerId === myPlayer.id && clickedCard) {
        console.log(`[${currentPlayerId}] Delegating to handleSelectCard`);
        handleSelectCard(clickedCard);
      }
    }
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
    setKingPowerReveal(null);
    setSwapSelections([]);
    setShowDeclareModal(false);
    setEliminationCardSelection(null);
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
        kingPowerReveal,
        setKingPowerReveal,
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
        eliminationCardSelection,
        handleEliminationCardSelected,
        handleActivatePower,
        handleSkipPower,
        handleConfirmKingPowerSwap,
        handleCancelKingPowerSwap,
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
