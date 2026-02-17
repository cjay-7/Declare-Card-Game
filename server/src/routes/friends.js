import { Router } from "express";
import { requireAuth } from "../authMiddleware.js";
import {
  getUserByDisplayName,
  getUserByFriendCode,
  sendFriendRequest,
  respondFriendRequest,
  getFriends,
  getPendingRequests,
  createNotification,
  getNotifications,
  markNotificationsRead,
} from "../db.js";

const router = Router();

// All routes require auth
router.use(requireAuth);

// POST /api/friends/add — send friend request by friend code
router.post("/add", async (req, res) => {
  const { friendCode, displayName } = req.body;
  if (!friendCode && !displayName) return res.status(400).json({ error: "friendCode or displayName required" });

  // Prefer friend code lookup, fall back to display name
  const target = friendCode
    ? await getUserByFriendCode(friendCode.trim())
    : await getUserByDisplayName(displayName);
  if (!target) return res.status(404).json({ error: "No user found with that friend code" });
  if (target.id === req.user.id) return res.status(400).json({ error: "Cannot add yourself" });

  const friendship = await sendFriendRequest(req.user.id, target.id);
  if (!friendship) return res.status(409).json({ error: "Request already sent" });

  // Create notification for target
  await createNotification(target.id, "friend_request", req.user.id, {
    displayName: req.user.displayName,
  });

  // Push real-time notification if target is online
  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers");
  const targetSockets = onlineUsers?.get(target.id);
  if (targetSockets) {
    for (const socketId of targetSockets) {
      io.to(socketId).emit("friend-request-received", {
        id: friendship.id,
        fromId: req.user.id,
        fromDisplayName: req.user.displayName,
      });
    }
  }

  res.json({ ok: true });
});

// POST /api/friends/respond — accept or decline a request
router.post("/respond", async (req, res) => {
  const { id, status } = req.body;
  if (!id || !["accepted", "declined"].includes(status)) {
    return res.status(400).json({ error: "id and status (accepted|declined) required" });
  }

  const friendship = await respondFriendRequest(id, status, req.user.id);
  if (!friendship) return res.status(404).json({ error: "Request not found" });

  res.json({ ok: true, status });
});

// GET /api/friends — list accepted friends with online status
router.get("/", async (req, res) => {
  const friends = await getFriends(req.user.id);
  const onlineUsers = req.app.get("onlineUsers");
  const result = friends.map((f) => ({
    ...f,
    isOnline: onlineUsers?.has(f.friend_id) && onlineUsers.get(f.friend_id).size > 0,
  }));
  res.json(result);
});

// GET /api/friends/requests — list pending incoming requests
router.get("/requests", async (req, res) => {
  const requests = await getPendingRequests(req.user.id);
  res.json(requests);
});

// GET /api/notifications — get unread notifications
router.get("/notifications", async (req, res) => {
  const notifications = await getNotifications(req.user.id);
  res.json(notifications);
});

// POST /api/notifications/read — mark all notifications read
router.post("/notifications/read", async (req, res) => {
  await markNotificationsRead(req.user.id);
  res.json({ ok: true });
});

export default router;
