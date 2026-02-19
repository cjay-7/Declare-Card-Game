import React from "react";
import { Dialog, Button, Typography, IconButton, Accordion, Card } from "@material-tailwind/react";

interface GameInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GameInstructionsModal: React.FC<GameInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} size="lg">
      <Dialog.Overlay lockScroll className="bg-black/60 backdrop-blur-sm">
        <Dialog.Content
          className="p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border"
          style={{
            backgroundColor: "var(--surface-container)",
            boxShadow: "var(--elevation-3)",
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "var(--radius-2xl)",
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <Typography as="h2" id="instructions-heading" className="font-bold text-white" style={{ fontSize: "var(--text-2xl)" }}>
              Game Rules
            </Typography>
            <Dialog.DismissTrigger
              as={IconButton}
              variant="ghost"
              size="sm"
              aria-label="Close"
              style={{ color: "var(--on-surface-variant)" }}
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
            </Dialog.DismissTrigger>
          </div>

          <Accordion type="multiple" defaultValue={["objective", "gameplay"]} className="space-y-1">
            {[
              {
                value: "objective",
                title: "Objective",
                content: (
                  <Typography style={{ color: "var(--on-surface)" }}>
                    The goal of Declare is to be the first player to form a valid set
                    or sequence with all 4 cards in your hand, or to have the lowest
                    point total when someone declares.
                  </Typography>
                ),
              },
              {
                value: "setup",
                title: "Setup",
                content: (
                  <ul className="list-disc pl-5 space-y-1" style={{ color: "var(--on-surface)" }}>
                    <li>2-8 players can participate</li>
                    <li>Each player receives 4 cards</li>
                    <li>Players can see only 2 of their 4 cards at the beginning</li>
                    <li>The remaining cards form the draw pile</li>
                  </ul>
                ),
              },
              {
                value: "card-values",
                title: "Card Values",
                content: (
                  <Card variant="ghost" className="p-3" style={{ backgroundColor: "var(--surface-container)", borderRadius: "var(--radius-md)" }}>
                    <Card.Body className="p-0">
                      <ul className="list-disc pl-5 space-y-1" style={{ color: "var(--on-surface)" }}>
                        <li>Ace = 1 point</li>
                        <li>2-10 = face value points</li>
                        <li>Jack = 11 points</li>
                        <li>Queen = 12 points</li>
                        <li>King = 13 points (black suits), 0 points (red suits)</li>
                      </ul>
                    </Card.Body>
                  </Card>
                ),
              },
              {
                value: "gameplay",
                title: "Gameplay",
                content: (
                  <>
                    <Typography className="mb-1" style={{ color: "var(--on-surface)" }}>On your turn, you must perform one of these actions:</Typography>
                    <ul className="list-disc pl-5 space-y-1" style={{ color: "var(--on-surface)" }}>
                      <li><strong>Draw</strong> a card from the deck, then discard a card</li>
                      <li><strong>Swap</strong> a card from your hand with a card from another player's hand (randomly selected)</li>
                      <li><strong>Discard</strong> a card you've drawn this turn</li>
                      <li><strong>Declare</strong> when you think you have a valid hand</li>
                    </ul>
                  </>
                ),
              },
              {
                value: "special-cards",
                title: "Special Cards",
                content: (
                  <ul className="list-disc pl-5 space-y-1" style={{ color: "var(--on-surface)" }}>
                    <li><strong>Jack:</strong> When discarded, skips the next player's turn</li>
                    <li><strong>Queen:</strong> Allows you to look at one of your unknown cards</li>
                    <li><strong>King:</strong> Allows you to peek at another player's card</li>
                  </ul>
                ),
              },
              {
                value: "valid-declarations",
                title: "Valid Declarations",
                content: (
                  <>
                    <Typography className="mb-1" style={{ color: "var(--on-surface)" }}>There are two types of valid declarations:</Typography>
                    <ul className="list-disc pl-5 space-y-1" style={{ color: "var(--on-surface)" }}>
                      <li><strong>Set:</strong> All 4 cards have the same rank (e.g., four 8s)</li>
                      <li><strong>Sequence:</strong> All 4 cards are of the same suit and in consecutive order (e.g., 5-6-7-8 of hearts)</li>
                    </ul>
                  </>
                ),
              },
              {
                value: "scoring",
                title: "Scoring",
                content: (
                  <ul className="list-disc pl-5 space-y-1" style={{ color: "var(--on-surface)" }}>
                    <li>If a player declares correctly, they win the round with 0 points</li>
                    <li>If a declaration is invalid, all cards in that player's hand are revealed</li>
                    <li>When a valid declaration happens, everyone else scores the sum of the values of the cards in their hand</li>
                    <li>The player with the lowest score wins</li>
                  </ul>
                ),
              },
            ].map((section) => (
              <Accordion.Item
                key={section.value}
                value={section.value}
                className="border overflow-hidden"
                style={{
                  backgroundColor: "var(--surface-container-high)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "var(--radius-xl)",
                }}
              >
                <Accordion.Trigger
                  className="w-full flex items-center justify-between p-4 text-left text-white font-semibold hover:bg-white/5"
                  style={{ fontSize: "var(--text-lg)", transition: "background-color var(--transition-fast)" }}
                >
                  {section.title}
                </Accordion.Trigger>
                <Accordion.Content className="px-4 pb-4">
                  {section.content}
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion>

          <div className="mt-6 flex justify-center">
            <Dialog.DismissTrigger
              as={Button}
              variant="gradient"
              color="primary"
              className="px-6 font-bold"
              style={{ fontSize: "var(--text-sm)", borderRadius: "var(--radius-lg)" }}
            >
              Got it!
            </Dialog.DismissTrigger>
          </div>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog>
  );
};

export default GameInstructionsModal;
