import React, {
  createContext,
  useState,
  useContext,
  type ReactNode,
} from "react";

interface GameContextType {
  playerName: string;
  setPlayerName: (name: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [playerName, setPlayerName] = useState("");

  return (
    <GameContext.Provider value={{ playerName, setPlayerName }}>
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
