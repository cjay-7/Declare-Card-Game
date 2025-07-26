import React, { useEffect, useState } from "react";
import { useGameContext } from "../contexts/GameContext";
import Card from "./Card";
import type { Card as CardType } from "../utils/cardUtils";

interface GameEndScreenProps {
  onPlayAgain: () => void;
}

interface PlayerScoreDetails {
  id: string;
  name: string;
  hand: (CardType | null)[];
  score: number;
  cardValues: number[];
  totalFromCards: number;
  penalty: number;
  finalScore: number;
  rank: number;
  isWinner: boolean;
  isDeclarer: boolean;
}

const GameEndScreen: React.FC<GameEndScreenProps> = ({ onPlayAgain }) => {
  const { gameState, myPlayer } = useGameContext();
  const [scoreDetails, setScoreDetails] = useState<PlayerScoreDetails[]>([]);
  const [declareInfo, setDeclareInfo] = useState<{
    declarer: string | null;
    isValid: boolean;
    declaredRanks?: string[];
    actualRanks?: string[];
  }>({ declarer: null, isValid: false });

  useEffect(() => {
    if (gameState?.gameStatus === "ended" && gameState.players.length > 0) {
      // Calculate detailed scores for each player
      const detailedScores: PlayerScoreDetails[] = gameState.players.map(
        (player) => {
          // Calculate card values (excluding eliminated cards)
          const cardValues = player.hand.map((card) => {
            if (!card) return 0; // Eliminated cards = 0 points

            // Special King scoring rules
            if (card.rank === "K") {
              return card.suit === "hearts" || card.suit === "diamonds"
                ? 0
                : 13;
            }

            return card.value || 0;
          });

          const totalFromCards = cardValues.reduce((sum, val) => sum + val, 0);

          // Check if this player was the declarer and if they got a penalty
          const isDeclarer = gameState.declarer === player.id;
          const penalty =
            isDeclarer && player.score > totalFromCards
              ? player.score - totalFromCards
              : 0;

          return {
            id: player.id,
            name: player.name,
            hand: player.hand,
            score: player.score,
            cardValues,
            totalFromCards,
            penalty,
            finalScore: player.score,
            rank: 0, // Will be set below
            isWinner: false, // Will be set below
            isDeclarer,
          };
        }
      );

      // Sort by final score (lowest wins) and assign ranks
      const sortedPlayers = [...detailedScores].sort(
        (a, b) => a.finalScore - b.finalScore
      );
      sortedPlayers.forEach((player, index) => {
        player.rank = index + 1;
        player.isWinner =
          index === 0 || player.finalScore === sortedPlayers[0].finalScore;
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
                      Final Score: {winner.finalScore}
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
                        textAlign: "left",
                        color: "white",
                        fontWeight: "bold",
                      }}
                    >
                      Final Score
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

                      {/* Final Score */}
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            color: "white",
                            fontSize: "1.125rem",
                            fontWeight: "bold",
                          }}
                        >
                          {player.finalScore}
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
              <li>Lowest total score wins</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default GameEndScreen;
