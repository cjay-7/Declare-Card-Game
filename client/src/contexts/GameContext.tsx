// client/src/contexts/GameContext.tsx
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
  targetPlayerForSwap: string | null;
  setTargetPlayerForSwap: (playerId: string | null) => void;
  // Game actions
  handleDrawCard: () => void;
  handleSwapCard: () => void;
  handleDiscardCard: () => void;
  handleDeclare: () => void;
  handleSelectCard: (card: Card) => void;
  handleCardClick: (playerId: string, cardIndex: number) => void;
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
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardSelection | null>(null);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [targetPlayerForSwap, setTargetPlayerForSwap] = useState<string | null>(
    null
  );

  // Compute if it's the current player's turn
  const myPlayer =
    gameState?.players.find((p) => p.id === socket.getId()) || null;
  const currentPlayer = gameState?.players[gameState?.currentPlayerIndex || 0];
  const isPlayerTurn =
    !!myPlayer && !!currentPlayer && myPlayer.id === currentPlayer.id;

  // Set up socket event listeners
  useEffect(() => {
    // Handle game state updates from server/mock
    const handleGameStateUpdate = (updatedState: GameState) => {
      console.log("Received game state update:", updatedState);
      setGameState(updatedState);
    };

    // Handle card drawn event
    const handleCardDrawn = (
      cardData: Card | { playerId: string; card: Card }
    ) => {
      console.log("Card drawn event received:", cardData);

      // Check if this is the new format with playerId
      if ("playerId" in cardData && "card" in cardData) {
        if (cardData.playerId === socket.getId()) {
          console.log("Setting drawn card for this player:", cardData.card);
          setDrawnCard(cardData.card);
        }
      } else {
        // Legacy format - just a card
        console.log("Setting drawn card (legacy format):", cardData);
        setDrawnCard(cardData as Card);
      }
    };

    // Handle game ended event
    const handleGameEnded = (result: any) => {
      console.log("Game ended:", result);

      let winnerName = "Unknown";
      if (gameState?.players) {
        const winner = gameState.players.find((p) => p.id === result.winner);
        if (winner) {
          winnerName = winner.name;
        }
      }

      setTimeout(() => {
        alert(`Game ended! Winner: ${winnerName} with score: ${result.score}`);
      }, 500);
    };

    socket.on("game-state-update", handleGameStateUpdate);
    socket.on("card-drawn", handleCardDrawn);
    socket.on("game-ended", handleGameEnded);

    return () => {
      socket.off("game-state-update", handleGameStateUpdate);
      socket.off("card-drawn", handleCardDrawn);
      socket.off("game-ended", handleGameEnded);
    };
  }, [gameState]);

  // Game action handlers
  const handleDrawCard = () => {
    if (!isPlayerTurn || !roomId || !myPlayer) {
      console.log("Cannot draw card:", {
        isPlayerTurn,
        roomId,
        myPlayerId: myPlayer?.id,
      });
      return;
    }

    console.log("Drawing card...");
    socket.emit("draw-card", { roomId, playerId: myPlayer.id });
  };

  const handleSwapCard = () => {
    if (
      !isPlayerTurn ||
      !roomId ||
      !myPlayer ||
      !selectedCard ||
      !targetPlayerForSwap
    ) {
      console.log("Cannot swap card:", {
        isPlayerTurn,
        roomId,
        myPlayerId: myPlayer?.id,
        selectedCard,
        targetPlayerForSwap,
      });
      return;
    }

    console.log("Swapping card...");
    socket.emit("swap-card", {
      roomId,
      playerId: myPlayer.id,
      cardId: selectedCard.cardId,
      targetPlayerId: targetPlayerForSwap,
    });

    // Reset selections
    setSelectedCard(null);
    setTargetPlayerForSwap(null);
    setDrawnCard(null);
  };

  const handleDiscardCard = () => {
    if (
      !isPlayerTurn ||
      !roomId ||
      !myPlayer ||
      (!selectedCard && !drawnCard)
    ) {
      console.log("Cannot discard card:", {
        isPlayerTurn,
        roomId,
        myPlayerId: myPlayer?.id,
        selectedCard,
        drawnCard,
      });
      return;
    }

    console.log("Discarding card...");
    socket.emit("discard-card", {
      roomId,
      playerId: myPlayer.id,
      // If drawn card is selected, discard it; otherwise discard selected card from hand
      cardId: drawnCard ? drawnCard.id : selectedCard!.cardId,
    });

    // Reset selections
    setSelectedCard(null);
    setDrawnCard(null);
  };

  const handleDeclare = () => {
    if (!isPlayerTurn || !roomId || !myPlayer) {
      console.log("Cannot declare:", {
        isPlayerTurn,
        roomId,
        myPlayerId: myPlayer?.id,
      });
      return;
    }

    console.log("Declaring...");
    socket.emit("declare", {
      roomId,
      playerId: myPlayer.id,
    });
  };

  const handleSelectCard = (card: Card) => {
    if (!card.id) {
      console.log("Card has no ID:", card);
      return;
    }

    if (selectedCard && selectedCard.cardId === card.id) {
      // Deselect if already selected
      console.log("Deselecting card:", card);
      setSelectedCard(null);
    } else {
      // Select new card
      console.log("Selecting card:", card);
      setSelectedCard({ cardId: card.id, isSelected: true });
    }
  };

  const handleCardClick = (playerId: string, cardIndex: number) => {
    if (!isPlayerTurn || !roomId || !myPlayer) {
      console.log("Cannot handle card click:", {
        isPlayerTurn,
        roomId,
        myPlayerId: myPlayer?.id,
      });
      return;
    }

    // King allows looking at opponent's card
    if (drawnCard?.rank === "K" && playerId !== myPlayer.id) {
      console.log("Viewing opponent's card with King...");
      socket.emit("view-opponent-card", {
        roomId,
        playerId: myPlayer.id,
        targetPlayerId: playerId,
        cardIndex,
      });

      // Discard the King after use
      setTimeout(() => {
        if (drawnCard) {
          handleDiscardCard();
        }
      }, 3500);
    }

    // Queen allows looking at your own card
    else if (drawnCard?.rank === "Q" && playerId === myPlayer.id) {
      console.log("Viewing own card with Queen...");
      socket.emit("view-own-card", {
        roomId,
        playerId: myPlayer.id,
        cardIndex,
      });

      // Discard the Queen after use
      setTimeout(() => {
        if (drawnCard) {
          handleDiscardCard();
        }
      }, 1000);
    }

    // Select player for swap
    else if (playerId !== myPlayer.id && selectedCard) {
      console.log("Setting target player for swap:", playerId);
      setTargetPlayerForSwap(playerId);
    }
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
        targetPlayerForSwap,
        setTargetPlayerForSwap,
        handleDrawCard,
        handleSwapCard,
        handleDiscardCard,
        handleDeclare,
        handleSelectCard,
        handleCardClick,
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
