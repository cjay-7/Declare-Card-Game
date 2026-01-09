# Turn Management System - Explanation & Analysis

## Overview

The turn system uses a **simple circular rotation**: Player 1 → Player 2 → ... → Player N → Player 1. Turns are independent of eliminations and power cards (except Jack when discarded directly after picking from deck).

## Core Algorithm

### 1. **Turn State Storage**
```javascript
room.currentPlayerIndex = 0;  // Index of current player (0-based)
```

### 2. **Getting Current Player**
```javascript
const getCurrentPlayer = (room) => {
  return room.players[room.currentPlayerIndex || 0];
};
```

### 3. **Moving to Next Player** (`moveToNextPlayer`)

The algorithm:
1. **Increments index**: `nextPlayerIndex = (currentPlayerIndex + 1) % players.length`
2. **Skips players with `skippedTurn = true`** (e.g., after Jack card)
3. **Skips players with `hasEliminatedThisRound = true`** (they can't draw)
4. **Loops until finding valid player** (max attempts: `players.length * 2`)

```javascript
const moveToNextPlayer = (room) => {
  let nextPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  
  while (attempts < maxAttempts) {
    const nextPlayer = room.players[nextPlayerIndex];
    
    // Skip if player has skippedTurn flag
    if (nextPlayer?.skippedTurn) {
      nextPlayer.skippedTurn = false;  // Reset flag
      nextPlayerIndex = (nextPlayerIndex + 1) % room.players.length;
      continue;
    }
    
    // Skip if player eliminated this round (can't draw)
    if (nextPlayer?.hasEliminatedThisRound) {
      nextPlayer.hasEliminatedThisRound = false;  // Reset for next round
      nextPlayerIndex = (nextPlayerIndex + 1) % room.players.length;
      continue;
    }
    
    // Found valid player
    break;
  }
  
  room.currentPlayerIndex = nextPlayerIndex;
};
```

## Turn Progression Rules

### Core Rule:
**Simple rotation**: Player 1 → Player 2 → ... → Player N → Player 1

### When Turn Advances Automatically:
1. ✅ **After drawing and discarding a regular card** (A-6)
2. ✅ **After drawing and replacing with a regular card** (A-6)
3. ✅ **After discarding a regular card from hand** (A-6)
4. ✅ **After discarding a Jack** (also sets `skippedTurn` on next player)
5. ✅ **After skipping a power card** (7, 8, 9, 10, Q, K)
6. ✅ **After using a power card** (7, 8, 9, 10, Q, K)

### When Turn Pauses (No Advance):
1. ⏸️ **After discarding a power card** (7, 8, 9, 10, Q, K) - waits for player to use/skip power
2. ⏸️ **After replacing with a power card** - waits for player to use/skip power
3. ⏸️ **After discarding drawn power card** - waits for player to use/skip power

### Important: Eliminations Do NOT Affect Turns
- Eliminations are **completely independent** of turn progression
- Players can eliminate at any time (when window is open)
- Eliminations do NOT advance or skip turns
- Turn continues normally regardless of eliminations

## Turn Validation

**Draw/Declare actions** check if it's the player's turn:
```javascript
const currentPlayer = getCurrentPlayer(room);
if (!currentPlayer || currentPlayer.id !== playerId) {
  socket.emit("error", { message: "Not your turn" });
  return;
}
```

**Elimination actions** do NOT check turn - they can happen at any time when the elimination window is open.

## Elimination System (Independent of Turns)

### Elimination Window Rules:
1. **Window Opens**: When a card is discarded (any card)
2. **Window Closes**: When the next player draws a card (starts their turn)
3. **During Window**: Any player can eliminate 1 card matching the discarded card's rank
4. **Only 1 elimination per window**: Once someone eliminates, `eliminationUsedThisRound = true` blocks others

### Elimination Flow:
```javascript
// When card is discarded:
room.eliminationUsedThisRound = false;  // Window opens

// When player eliminates:
room.eliminationUsedThisRound = true;   // Window closes (no more eliminations)

// When next player draws:
room.eliminationUsedThisRound = false;  // Reset for next discard
// Reset all player flags
```

### Penalty Rules:
- **Illegal elimination** (card doesn't match rank) → Player gets penalty card
- **Eliminating opponent's card** → Must give one of your cards to that player
- **Eliminating own card** → No card exchange needed

## Potential Bugs & Issues

### 🐛 **Bug #1: Race Condition with Power Cards**

**Problem**: When a power card is discarded, the turn pauses. But if the player's `activePower` is set and they don't use/skip it, the turn might get stuck.

**Location**: Lines 411-426, 522-537, 607-621

**Current Behavior**:
- Power card discarded → `activePower` set → `return` (no turn advance)
- If player never calls `activate-power` or `skip-power`, turn stays paused

**Fix Needed**: Add timeout or ensure power is always cleared.

---

### 🐛 **Bug #2: Turn Index Out of Bounds**

**Problem**: If `currentPlayerIndex` becomes invalid (e.g., player leaves mid-game), `getCurrentPlayer` might return `null` or wrong player.

**Location**: Line 55-57

**Current Code**:
```javascript
const getCurrentPlayer = (room) => {
  if (!room || !room.players || room.players.length === 0) return null;
  return room.players[room.currentPlayerIndex || 0];
};
```

**Issue**: If `currentPlayerIndex` is >= `players.length`, it returns `undefined`. Should validate bounds.

---

### 🐛 **Bug #3: Power Card State Not Cleared on Turn Change**

**Problem**: If a player has `activePower` set but their turn ends (e.g., they disconnect), the power state might persist.

**Location**: Power card handlers don't clear `activePower` when turn changes externally.

---

## Recommended Fixes

### Fix #1: Add Bounds Checking
```javascript
const getCurrentPlayer = (room) => {
  if (!room || !room.players || room.players.length === 0) return null;
  const index = room.currentPlayerIndex || 0;
  if (index < 0 || index >= room.players.length) {
    console.error(`Invalid currentPlayerIndex: ${index}, resetting to 0`);
    room.currentPlayerIndex = 0;
    return room.players[0] || null;
  }
  return room.players[index];
};
```

### Fix #2: Add Power Card Timeout
```javascript
// When power card is set, start a timeout
if (player.activePower) {
  setTimeout(() => {
    if (player.activePower === powerRank) {
      console.warn(`Power ${powerRank} timeout - auto-skipping`);
      player.activePower = null;
      player.usingPower = false;
      moveToNextPlayer(room);
      io.to(roomId).emit("game-state-update", prepareGameStateForEmit(room));
    }
  }, 30000); // 30 second timeout
}
```

### Fix #3: Clear Power State on Turn Change
```javascript
const moveToNextPlayer = (room) => {
  // Clear active powers for the current player
  const currentPlayer = getCurrentPlayer(room);
  if (currentPlayer) {
    currentPlayer.activePower = null;
    currentPlayer.usingPower = false;
  }
  
  // ... rest of function
};
```

### Fix #4: Add Debug Logging
```javascript
const moveToNextPlayer = (room) => {
  const oldIndex = room.currentPlayerIndex;
  const oldPlayer = room.players[oldIndex]?.name;
  
  // ... existing logic ...
  
  const newIndex = room.currentPlayerIndex;
  const newPlayer = room.players[newIndex]?.name;
  
  console.log(`🔄 Turn: ${oldPlayer} (${oldIndex}) → ${newPlayer} (${newIndex})`);
};
```

## Testing Scenarios

To verify turn system works correctly, test:

1. ✅ Normal turn rotation (Player 1 → Player 2 → Player 1)
2. ✅ Jack card skips next player (when discarded directly after picking)
3. ✅ Power card pauses turn, then resumes after use/skip
4. ✅ Elimination during any player's turn does NOT affect turn progression
5. ✅ Elimination window opens when card is discarded
6. ✅ Elimination window closes when next player draws
7. ✅ Only 1 elimination per discard window
8. ✅ Player who eliminates can still take their normal turn
9. ✅ Player disconnects mid-turn
10. ✅ Power card timeout/cleanup

## Summary

**Turn System**: Simple circular rotation - Player 1 → Player 2 → ... → Player N → Player 1
- Only Jack card (when discarded directly after picking) can skip a turn
- Eliminations are completely independent and do NOT affect turn progression
- Power cards pause the turn until player uses/skips them

**Elimination System**: Independent window-based system
- Window opens when card is discarded
- Window closes when next player draws
- Any player can eliminate during the window (if not already used)
- Eliminations don't affect whose turn it is
