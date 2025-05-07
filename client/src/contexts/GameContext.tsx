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
  const [targetPlayerForSwap, setTargetPlayerForSwap] = useState<string | null>(null);
  
  // Compute if it's the current player's turn
  const myPlayer = gameState?.players.find(p => p.name === playerName) || null;
  const currentPlayer = gameState?.players[gameState?.currentPlayerIndex || 0];
  const isPlayerTurn = !!myPlayer && !!currentPlayer && myPlayer.id === currentPlayer.id;

  useEffect(() => {
    if (!socket) return;

    // Handle game state updates from server
    socket.on("game-state-update", (updatedState: GameState) => {
      setGameState(updatedState);
    });

    // Handle card drawn event
    socket.on("card-drawn", (card: Card) => {
      setDrawnCard(card);
    });

    // Handle game ended event
    socket.on("game-ended", (result: any) => {
      // Handle game end
      console.log("Game ended", result);
    });

    return () => {
      socket.off("game-state-update");
      socket.off("card-drawn");
      socket.off("game-ended");
    };
  }, [socket]);

  // Game action handlers
  const handleDrawCard = () => {
    if (!isPlayerTurn || !roomId || !myPlayer) return;
    
    socket.emit("draw-card", { roomId, playerId: myPlayer.id });
  };

  const handleSwapCard = () => {
    if (!isPlayerTurn || !roomId || !myPlayer || !selectedCard || !targetPlayerForSwap) return;
    
    socket.emit("swap-card", { 
      roomId, 
      playerId: myPlayer.id,
      cardId: selectedCard.cardId,
      targetPlayerId: targetPlayerForSwap
    });
    
    // Reset selections
    setSelectedCard(null);
    setTargetPlayerForSwap(null);
  };

  const handleDiscardCard = () => {
    if (!isPlayerTurn || !roomId || !myPlayer || !selectedCard) return;
    
    socket.emit("discard-card", { 
      roomId, 
      playerId: myPlayer.id,
      cardId: selectedCard.cardId
    });
    
    // Reset selection
    setSelectedCard(null);
  };

  const handleDeclare = () => {
    if (!isPlayerTurn || !roomId || !myPlayer) return;
    
    socket.emit("declare", { 
      roomId, 
      playerId: myPlayer.id
    });
  };

  const handleSelectCard = (card: Card) => {
    if (!card.id) return;
    
    if (selectedCard && selectedCard.cardId === card.id) {
      // Deselect if already selected
      setSelectedCard(null);
    } else {
      // Select new card
      setSelectedCard({ cardId: card.id, isSelected: true });
    }
  };

  const handleCardClick = (playerId: string, cardIndex: number) => {
    if (!isPlayerTurn || !roomId || !myPlayer) return;
    
    // King allows looking at opponent's card
    if (drawnCard?.rank === "K" && playerId !== myPlayer.id) {
      socket.emit("view-opponent-card", {
        roomId,
        playerId: myPlayer.id,
        targetPlayerId: playerId,
        cardIndex
      });
    }
    
    // Queen allows looking at your own card
    else if (drawnCard?.rank === "Q" && playerId === myPlayer.id) {
      socket.emit("view-own-card", {
        roomId,
        playerId: myPlayer.id,
        cardIndex
      });
    }
    
    // Select player for swap
    else if (playerId !== myPlayer.id && selectedCard) {
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
        handleCardClick
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