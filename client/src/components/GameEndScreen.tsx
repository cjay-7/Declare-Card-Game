import React, { useEffect, useState } from "react";
import { useGameContext } from "../contexts/GameContext";
import Card from "./Card";
import type { Card as CardType } from "../utils/cardUtils";

interface GameEndScreenProps {
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

interface PlayerScoreDetails {
  id: string;
  name: string;
  hand: (CardType | null)[];
  roundScore: number; // Score for this round (hand value)
  roundPoints: number; // Points gained/lost this round (negative for losers, positive for winner)
  cumulativeScore: number; // Total score across all rounds
  cardValues: number[];
  totalFromCards: number;
  penalty: number;
  rank: number;
  isWinner: boolean;
  isDeclarer: boolean;
}

const GameEndScreen: React.FC<GameEndScreenProps> = ({ onPlayAgain, onReturnToLobby }) => {
  const { gameState, myPlayer } = useGameContext();
  const [scoreDetails, setScoreDetails] = useState<PlayerScoreDetails[]>([]);
  const [declareInfo, setDeclareInfo] = useState<{
    declarer: string | null;
    isValid: boolean;
    declaredRanks?: string[];
    actualRanks?: string[];
  }>({ declarer: null, isValid: false });
  const [winnersFromServer, setWinnersFromServer] = useState<string[]>([]);

  // Listen for winners from game-ended event
  useEffect(() => {
    const handleGameEndedWinners = (event: CustomEvent) => {
      console.log("GameEndScreen: Received winners from server:", event.detail.winners);
      setWinnersFromServer(event.detail.winners || []);
    };
    
    window.addEventListener("game-ended-winners", handleGameEndedWinners as EventListener);
    
    return () => {
      window.removeEventListener("game-ended-winners", handleGameEndedWinners as EventListener);
    };
  }, []);

  useEffect(() => {
    if (gameState?.gameStatus === "ended" && gameState.players.length > 0) {
      // Use scoring data from server (gameState.players should have roundScore, roundPoints, cumulativeScore, isWinner)
      // If not available, calculate from hand
      const detailedScores: PlayerScoreDetails[] = gameState.players.map(
        (player: any) => {
          // Calculate card values for display (excluding eliminated cards)
          const cardValues = player.hand.map((card: CardType | null) => {
            if (!card) return 0; // Eliminated cards = 0 points

            // Special King scoring rules
            if (card.rank === "K") {
              return card.suit === "hearts" || card.suit === "diamonds"
                ? 0
                : 13;
            }

            return card.value || 0;
          });

          const totalFromCards = cardValues.reduce((sum: number, val: number) => sum + val, 0);

          // Check if this player was the declarer and if they got a penalty
          const isDeclarer = gameState.declarer === player.id;
          
          // Use server-provided scores if available, otherwise calculate
          const roundScore = player.roundScore !== undefined ? player.roundScore : totalFromCards;
          const roundPoints = player.roundPoints !== undefined ? player.roundPoints : 0;
          const cumulativeScore = player.cumulativeScore !== undefined ? player.cumulativeScore : 0;
          // isWinner will be set from server winners, not from player.isWinner (which might not be set correctly)
          const isWinner = false; // Will be set from winnersFromServer below
          
          // Calculate penalty (difference between roundScore and totalFromCards, if declarer)
          const penalty = isDeclarer && roundScore > totalFromCards
            ? roundScore - totalFromCards
            : 0;

          return {
            id: player.id,
            name: player.name,
            hand: player.hand,
            roundScore,
            roundPoints,
            cumulativeScore,
            cardValues,
            totalFromCards,
            penalty,
            rank: 0, // Will be set below
            isWinner,
            isDeclarer,
          };
        }
      );

      // Use winners from server - this is the source of truth
      // Server determines winners based on round score (lowest wins), not cumulative
      // Fallback to player.isWinner from gameState if winnersFromServer not available yet
      const serverWinners = winnersFromServer.length > 0 
        ? winnersFromServer 
        : detailedScores.filter(p => {
            // Fallback: use player.isWinner from gameState if available
            const playerInState = gameState.players.find((gp: any) => gp.id === p.id);
            return playerInState?.isWinner === true;
          }).map(p => p.id);
      
      console.log("GameEndScreen: Server winners from event:", winnersFromServer);
      console.log("GameEndScreen: Server winners (with fallback):", serverWinners);
      console.log("GameEndScreen: Players:", detailedScores.map(p => ({ 
        id: p.id, 
        name: p.name, 
        roundScore: p.roundScore, 
        cumulativeScore: p.cumulativeScore,
        isWinnerFromState: gameState.players.find((gp: any) => gp.id === p.id)?.isWinner
      })));
      
      // Sort by cumulative score (highest wins) for ranking display
      const sortedPlayers = [...detailedScores].sort(
        (a, b) => b.cumulativeScore - a.cumulativeScore
      );
      
      // Assign ranks and determine winners based on server data
      sortedPlayers.forEach((player, index) => {
        player.rank = index + 1;
        // Use server's winner determination (based on round score, not cumulative)
        player.isWinner = serverWinners.includes(player.id);
        console.log(`   ${player.name}: isWinner=${player.isWinner}, roundScore=${player.roundScore}, cumulativeScore=${player.cumulativeScore}`);
      });

      // Determine declare validation status
      const declarer = gameState.declarer
        ? sortedPlayers.find((p) => p.id === gameState.declarer)
        : null;
      const declareIsValid = declarer
        ? declarer.isWinner && declarer.penalty === 0
        : false;

      setScoreDetails(sortedPlayers);
      setDeclareInfo({
        declarer: gameState.declarer,
        isValid: declareIsValid,
      });
    }
  }, [gameState]);

  if (!gameState || gameState.gameStatus !== "ended") {
    return null;
  }

  const declarer = scoreDetails.find((p) => p.isDeclarer);
  const winners = scoreDetails.filter((p) => p.isWinner);

  return (
    <>
      <style>
        {`
          /* Comprehensive Card styling overrides for GameEndScreen */
          .game-end-card-container > div,
          .game-end-card-container * {
            
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
          }
          
          /* Override specific Tailwind classes */
          .game-end-card-container .bg-white {
            
          }
          
          /* Text color overrides */
          .game-end-card-container .text-gray-800,
          .game-end-card-container .text-gray-400 {
            color: white !important;
          }
          
          .game-end-card-container .text-red-500 {
            color: #ef4444 !important;
          }
          
          /* Ensure all text is visible */
          .game-end-card-container div {
            color: white !important;
          }
          
          /* Specific targeting for rank and suit text */
          .game-end-card-container span,
          .game-end-card-container .text-xs,
          .game-end-card-container .text-6em {
            color: inherit !important;
          }
          
          /* Red suits stay red, black suits become white */
          .game-end-card-container .text-red-500 {
            color: #f87171 !important;
          }
          
          .game-end-card-container .text-gray-800 {
            color: #f3f4f6 !important;
          }
          
          /* Card container specific styles */
          .game-end-card-container {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            padding: 4px;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          /* Scrollbar styles */
          .scroll-container {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
          }
          .scroll-container::-webkit-scrollbar {
            width: 8px;
          }
          .scroll-container::-webkit-scrollbar-track {
            background: transparent;
          }
          .scroll-container::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
          }
        `}
      </style>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.98)",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          style={{
            backgroundColor: "#1f2937",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "1200px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1
              style={{
                fontSize: "3rem",
                fontWeight: "bold",
                color: "white",
                margin: "0 0 16px 0",
              }}
            >
              🎮 Game Over 🎮
            </h1>
          </div>

          {/* Declare Results Section */}
          {declarer && (
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  backgroundColor: declareInfo.isValid ? "#166534" : "#991b1b",
                  borderRadius: "8px",
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <h3
                  style={{
                    color: "white",
                    fontSize: "1.25rem",
                    fontWeight: "bold",
                    margin: "0 0 8px 0",
                  }}
                >
                  📢 Declaration Result
                </h3>
                <p style={{ color: "white", fontSize: "1rem", margin: 0 }}>
                  <strong>{declarer.name}</strong> declared and{" "}
                  <strong
                    style={{
                      color: declareInfo.isValid ? "#86efac" : "#fca5a5",
                    }}
                  >
                    {declareInfo.isValid ? "WON! 🎉" : "LOST! 💔"}
                  </strong>
                </p>
                {declarer.penalty > 0 && (
                  <p
                    style={{
                      color: "#fca5a5",
                      fontSize: "0.875rem",
                      margin: "4px 0 0 0",
                    }}
                  >
                    Invalid declaration penalty: +{declarer.penalty} points
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Winners Section */}
          <div style={{ marginBottom: "24px" }}>
            <h3
              style={{
                color: "white",
                fontSize: "1.5rem",
                fontWeight: "bold",
                marginBottom: "16px",
              }}
            >
              🏆 {winners.length > 1 ? "Winners" : "Winner"}
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {winners.map((winner) => (
                <div
                  key={winner.id}
                  style={{
                    backgroundColor: "#ca8a04",
                    borderRadius: "8px",
                    padding: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    border:
                      winner.id === myPlayer?.id ? "2px solid white" : "none",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      backgroundColor: "#92400e",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: "bold",
                    }}
                  >
                    {winner.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        margin: 0,
                        fontSize: "1rem",
                      }}
                    >
                      {winner.name}
                    </p>
                    <p
                      style={{
                        color: "#fef3c7",
                        fontSize: "0.875rem",
                        margin: 0,
                      }}
                    >
                      Cumulative Score: {winner.cumulativeScore}
                      {winner.roundPoints !== 0 && (
                        <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                          {" "}({winner.roundPoints > 0 ? "+" : ""}{winner.roundPoints} this round)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Results Table */}
          <div
            className="scroll-container"
            style={{
              flex: 1,
              overflowY: "auto",
              marginBottom: "24px",
            }}
          >
            <h3
              style={{
                color: "white",
                fontSize: "1.25rem",
                fontWeight: "bold",
                marginBottom: "16px",
              }}
            >
              📊 Detailed Results
            </h3>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  backgroundColor: "#374151",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#4b5563" }}>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      Rank
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      Player
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      Hand
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      Card Values
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      Penalty
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      Round Score
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      Round Points
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      Cumulative Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scoreDetails.map((player) => (
                    <tr
                      key={player.id}
                      style={{
                        backgroundColor:
                          player.id === myPlayer?.id
                            ? "rgba(59, 130, 246, 0.3)"
                            : player.isWinner
                            ? "rgba(34, 197, 94, 0.2)"
                            : "transparent",
                        borderBottom: "1px solid #4b5563",
                      }}
                    >
                      {/* Rank */}
                      <td style={{ padding: "12px", color: "white" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: "bold",
                              color: player.rank === 1 ? "#fbbf24" : "white",
                            }}
                          >
                            {player.rank === 1
                              ? "🥇"
                              : player.rank === 2
                              ? "🥈"
                              : player.rank === 3
                              ? "🥉"
                              : player.rank}
                          </span>
                          {player.isDeclarer && (
                            <span style={{ fontSize: "1rem" }}>📢</span>
                          )}
                        </div>
                      </td>

                      {/* Player */}
                      <td style={{ padding: "12px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "24px",
                              height: "24px",
                              backgroundColor: "#6b7280",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.75rem",
                              color: "white",
                              fontWeight: "bold",
                            }}
                          >
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ color: "white", fontWeight: "500" }}>
                            {player.name}
                          </span>
                          {player.id === myPlayer?.id && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "#93c5fd",
                              }}
                            >
                              (You)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Hand */}
                      <td style={{ padding: "12px" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "4px",
                            flexWrap: "wrap",
                          }}
                        >
                          {player.hand.map((card, cardIndex) => (
                            <div
                              key={cardIndex}
                              className="game-end-card-container"
                              style={{
                                transform: "scale(0.6)",
                                transformOrigin: "top left",
                              }}
                            >
                              {card ? (
                                <Card
                                  suit={card.suit}
                                  rank={card.rank}
                                  isRevealed={true}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "64px",
                                    height: "96px",
                                    backgroundColor: "#374151",
                                    borderRadius: "6px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "2px dashed #6b7280",
                                    color: "#9ca3af",
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                  }}
                                >
                                  ❌
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Card Values */}
                      <td style={{ padding: "12px", color: "white" }}>
                        <div>
                          <div
                            style={{
                              fontSize: "0.875rem",
                              marginBottom: "4px",
                            }}
                          >
                            [{player.cardValues.join(", ")}]
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#d1d5db",
                            }}
                          >
                            Total: {player.totalFromCards}
                          </div>
                        </div>
                      </td>

                      {/* Penalty */}
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            color: player.penalty > 0 ? "#f87171" : "#86efac",
                            fontWeight: "bold",
                          }}
                        >
                          {player.penalty > 0 ? `+${player.penalty}` : "0"}
                        </span>
                      </td>

                      {/* Round Score */}
                      <td style={{ padding: "12px" }}>
                        <span style={{ color: "white", fontSize: "0.875rem" }}>
                          {player.roundScore}
                        </span>
                      </td>
                      {/* Round Points */}
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            color: player.roundPoints >= 0 ? "#10b981" : "#ef4444",
                            fontSize: "0.875rem",
                            fontWeight: "bold",
                          }}
                        >
                          {player.roundPoints > 0 ? "+" : ""}{player.roundPoints}
                        </span>
                      </td>
                      {/* Cumulative Score */}
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            color: "white",
                            fontSize: "1.125rem",
                            fontWeight: "bold",
                          }}
                        >
                          {player.cumulativeScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            <button
              onClick={onPlayAgain}
              style={{
                backgroundColor: "#16a34a",
                color: "white",
                padding: "12px 32px",
                borderRadius: "8px",
                border: "none",
                fontSize: "1.125rem",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#15803d";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#16a34a";
              }}
            >
              🔄 Play Again
            </button>
            <button
              onClick={onReturnToLobby}
              style={{
                backgroundColor: "#6b7280",
                color: "white",
                padding: "12px 32px",
                borderRadius: "8px",
                border: "none",
                fontSize: "1.125rem",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#4b5563";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#6b7280";
              }}
            >
              🏠 Return to Lobby
            </button>
          </div>

          {/* Game Rules Reminder */}
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              backgroundColor: "#374151",
              borderRadius: "8px",
            }}
          >
            <h4
              style={{
                color: "white",
                fontSize: "1rem",
                fontWeight: "bold",
                margin: "0 0 8px 0",
              }}
            >
              📋 Scoring Rules:
            </h4>
            <ul
              style={{
                color: "#d1d5db",
                fontSize: "0.875rem",
                margin: 0,
                paddingLeft: "20px",
              }}
            >
              <li>Eliminated cards = 0 points</li>
              <li>K♥/K♦ = 0 points, K♠/K♣ = 13 points</li>
              <li>Invalid declaration = +20 penalty points</li>
              <li>Round: Lowest hand score wins the round</li>
              <li>Points: Losers get negative points (their round score), Winner gets sum of all losers' scores</li>
              <li>Cumulative: Highest cumulative score wins overall</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default GameEndScreen;
