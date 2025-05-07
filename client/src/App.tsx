import { useState } from "react";
import Lobby from "./components/Lobby";
import { GameBoard } from "./components/GameBoard";
import { GameProvider } from "./contexts/GameContext";

function App() {
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [roomInfo, setRoomInfo] = useState({ roomId: "", playerName: "" });

  const handleJoinRoom = (roomId: string, playerName: string) => {
    setRoomInfo({ roomId, playerName });
    setJoinedRoom(true);
  };

  return (
    <GameProvider>
      {!joinedRoom ? (
        <Lobby onJoinRoom={handleJoinRoom} />
      ) : (
        <GameBoard
          initialRoomId={roomInfo.roomId}
          initialPlayerName={roomInfo.playerName}
        />
      )}
    </GameProvider>
  );
}

export default App;
