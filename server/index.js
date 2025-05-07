// server/index.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

// Initialize Express app and HTTP server
const app = express();
const server = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite's default port
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// // Handle socket connections
// io.on("connection", (socket) => {
//   console.log("New client connected:", socket.id);

//   // Welcome message
//   socket.emit("gameUpdate", {
//     type: "welcome",
//     message: "Connected to game server",
//   });

//   // Handle disconnection
//   socket.on("disconnect", () => {
//     console.log("Client disconnected:", socket.id);
//   });
// });

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-room", ({ roomId, playerName }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: [] };
    }

    const isHost = rooms[roomId].players.length === 0;

    const player = {
      id: socket.id,
      name: playerName,
      isHost,
    };

    rooms[roomId].players.push(player);
    socket.join(roomId);

    console.log(
      `[${rooms[roomId].players.length}] ${playerName} joined room: ${roomId}`
    );

    io.to(roomId).emit("update-players", rooms[roomId].players);
  });

  io.to(roomId).emit("update-players", rooms[roomId].players);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
  socket.on("start-game", ({ roomId }) => {
    const players = rooms[roomId]?.players;
    if (!players) return;

    const player = players.find((p) => p.id === socket.id);
    if (!player?.isHost) return; // Only host can start the game

    console.log(`Game started in room: ${roomId}`);

    io.to(roomId).emit("start-game");
  });
});

// Add a route for the root path
app.get("/", (req, res) => {
  res.send("Game server is running");
});

// Start the server
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
