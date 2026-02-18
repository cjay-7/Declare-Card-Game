import React from "react";

interface GameInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GameInstructionsModal: React.FC<GameInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="instructions-heading"
    >
      <div
        className="rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
        style={{ backgroundColor: "var(--surface-container)", boxShadow: "var(--elevation-3)" }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="instructions-heading" className="text-2xl font-bold text-white">Game Rules</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4" style={{ color: "var(--on-surface)" }}>
          <section>
            <h3 className="text-xl font-semibold mb-2">Objective</h3>
            <p>
              The goal of Declare is to be the first player to form a valid set
              or sequence with all 4 cards in your hand, or to have the lowest
              point total when someone declares.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">Setup</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>2-8 players can participate</li>
              <li>Each player receives 4 cards</li>
              <li>Players can see only 2 of their 4 cards at the beginning</li>
              <li>The remaining cards form the draw pile</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">Card Values</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ace = 1 point</li>
              <li>2-10 = face value points</li>
              <li>Jack = 11 points</li>
              <li>Queen = 12 points</li>
              <li>King = 13 points (black suits), 0 points (red suits)</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">Gameplay</h3>
            <p>On your turn, you must perform one of these actions:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Draw</strong> a card from the deck, then discard a card
              </li>
              <li>
                <strong>Swap</strong> a card from your hand with a card from
                another player's hand (randomly selected)
              </li>
              <li>
                <strong>Discard</strong> a card you've drawn this turn
              </li>
              <li>
                <strong>Declare</strong> when you think you have a valid hand
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">Special Cards</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Jack:</strong> When discarded, skips the next player's
                turn
              </li>
              <li>
                <strong>Queen:</strong> Allows you to look at one of your
                unknown cards
              </li>
              <li>
                <strong>King:</strong> Allows you to peek at another player's
                card
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">Valid Declarations</h3>
            <p>There are two types of valid declarations:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Set:</strong> All 4 cards have the same rank (e.g., four
                8s)
              </li>
              <li>
                <strong>Sequence:</strong> All 4 cards are of the same suit and
                in consecutive order (e.g., 5-6-7-8 of hearts)
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">Scoring</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                If a player declares correctly, they win the round with 0 points
              </li>
              <li>
                If a declaration is invalid, all cards in that player's hand are
                revealed
              </li>
              <li>
                When a valid declaration happens, everyone else scores the sum
                of the values of the cards in their hand
              </li>
              <li>The player with the lowest score wins</li>
            </ul>
          </section>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ color: "var(--on-primary)", background: "linear-gradient(135deg, #f59e0b, #b45309)" }}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameInstructionsModal;
