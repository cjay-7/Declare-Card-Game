import React from "react";

type Player = {
  id: string;
  name: string;
  isHost: boolean;
};

type Props = {
  players: Player[];
};

const PlayersList: React.FC<Props> = ({ players }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-2">Players</h2>
      <ul className="space-y-2">
        {players.map((player) => (
          <li
            key={player.id}
            className="flex items-center justify-between bg-gray-100 p-2 rounded"
          >
            <span>{player.name}</span>
            {player.isHost && (
              <span className="text-sm text-warning-strong font-medium ml-2">
                👑 Host
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlayersList;
