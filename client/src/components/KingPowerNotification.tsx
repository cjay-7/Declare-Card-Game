// client/src/components/KingPowerNotification.tsx
import React, { useEffect, useState } from "react";
import { useGameContext } from "../contexts/GameContext";
import Card from "./Card";

const KingPowerNotification: React.FC = () => {
  const {
    kingPowerReveal,
    handleConfirmKingPowerSwap,
    handleCancelKingPowerSwap,
  } = useGameContext();
  const [timeLeft, setTimeLeft] = useState(6000);

  // Auto-close timer effect
  useEffect(() => {
    if (!kingPowerReveal?.showConfirmation) return;

    setTimeLeft(6000); // Reset timer when dialog opens

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-cancel when time runs out
          handleCancelKingPowerSwap();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [kingPowerReveal?.showConfirmation, handleCancelKingPowerSwap]);

  if (!kingPowerReveal) return null;

  return (
    <>
      <style>
        {`
          .king-power-card-container > div {
            background-color: rgba(255, 255, 255, 0.1) !important;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
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
          backgroundColor: "rgba(0, 0, 0, 0.95)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div
          style={{
            backgroundColor: "#aaaaaa",
            color: "white",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "800px",
            width: "100%",
            border: "4px solid #808080",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <span style={{ fontSize: "3rem", marginRight: "12px" }}>👑</span>
              <h2
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "white",
                  margin: 0,
                }}
              >
                King Power Active!
              </h2>
              <span style={{ fontSize: "3rem", marginLeft: "12px" }}>👑</span>
            </div>
            <p style={{ color: "white", fontSize: "1.25rem", margin: "8px 0" }}>
              <span style={{ fontWeight: "bold" }}>
                {kingPowerReveal.powerUserName}
              </span>{" "}
              {kingPowerReveal.showConfirmation
                ? "can see both cards and must decide whether to swap"
                : "is revealing cards before the swap"}
            </p>
          </div>

          {/* Cards Being Revealed */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "32px",
              marginBottom: "24px",
              position: "relative",
            }}
          >
            {/* Card 1 */}
            <div style={{ textAlign: "center" }}>
              <h3
                style={{
                  color: "white",
                  fontWeight: "bold",
                  marginBottom: "12px",
                  fontSize: "1.125rem",
                }}
              >
                {kingPowerReveal.card1.playerName}'s Card
              </h3>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    transform: "scale(1.25)",
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    borderRadius: "8px",
                    padding: "8px",
                    border: "2px solid #13130f",
                  }}
                  className="king-power-card-container"
                >
                  <Card
                    suit={kingPowerReveal.card1.card.suit}
                    rank={kingPowerReveal.card1.card.rank}
                    isRevealed={true}
                    isHighlighted={true}
                    animate="reveal"
                  />
                </div>
              </div>
              <div style={{ color: "#13130f", fontSize: "0.875rem" }}>
                Position {kingPowerReveal.card1.cardIndex + 1}
              </div>
              <div style={{ color: "white", fontWeight: "600" }}>
                {kingPowerReveal.card1.card.rank} of{" "}
                {kingPowerReveal.card1.card.suit}
              </div>
              <div style={{ color: "#13130f", fontSize: "0.875rem" }}>
                Value: {kingPowerReveal.card1.card.value} points
              </div>
            </div>

            {/* Swap Arrow */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "3rem",
                color: "white",
              }}
            >
              ↔️
            </div>

            {/* Card 2 */}
            <div style={{ textAlign: "center" }}>
              <h3
                style={{
                  color: "white",
                  fontWeight: "bold",
                  marginBottom: "12px",
                  fontSize: "1.125rem",
                }}
              >
                {kingPowerReveal.card2.playerName}'s Card
              </h3>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    transform: "scale(1.25)",
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    borderRadius: "8px",
                    padding: "8px",
                    border: "2px solid #13130f",
                  }}
                  className="king-power-card-container"
                >
                  <Card
                    suit={kingPowerReveal.card2.card.suit}
                    rank={kingPowerReveal.card2.card.rank}
                    isRevealed={true}
                    isHighlighted={true}
                    animate="reveal"
                  />
                </div>
              </div>
              <div style={{ color: "#13130f", fontSize: "0.875rem" }}>
                Position {kingPowerReveal.card2.cardIndex + 1}
              </div>
              <div style={{ color: "white", fontWeight: "600" }}>
                {kingPowerReveal.card2.card.rank} of{" "}
                {kingPowerReveal.card2.card.suit}
              </div>
              <div style={{ color: "#13130f", fontSize: "0.875rem" }}>
                Value: {kingPowerReveal.card2.card.value} points
              </div>
            </div>
          </div>

          {/* Message */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                backgroundColor: "gray",
                borderRadius: "8px",
                padding: "16px",
                border: "2px solid #13130f",
                marginBottom: "16px",
              }}
            >
              {kingPowerReveal.showConfirmation ? (
                <>
                  <p
                    style={{
                      color: "white",
                      fontSize: "1.125rem",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    {kingPowerReveal.message}
                  </p>
                  <div
                    style={{
                      color: "#13130f",
                      fontSize: "0.875rem",
                      marginBottom: "16px",
                    }}
                  >
                    Auto-cancels in {timeLeft} seconds
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      onClick={handleConfirmKingPowerSwap}
                      style={{
                        backgroundColor: "#16a34a",
                        color: "white",
                        padding: "8px 24px",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "1rem",
                      }}
                    >
                      ✅ Confirm Swap
                    </button>
                    <button
                      onClick={handleCancelKingPowerSwap}
                      style={{
                        backgroundColor: "#dc2626",
                        color: "white",
                        padding: "8px 24px",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "1rem",
                      }}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p
                    style={{
                      color: "white",
                      fontSize: "1.125rem",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    🔄 Swapping in progress...
                  </p>
                  <p style={{ color: "#13130f", fontSize: "0.875rem" }}>
                    Both cards are revealed as required by the King power. The
                    swap will complete automatically.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Power Description */}
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <div style={{ color: "#13130f", fontSize: "0.75rem" }}>
              <strong>King Power:</strong> Allows seen swap - both cards are
              revealed before swapping
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default KingPowerNotification;
