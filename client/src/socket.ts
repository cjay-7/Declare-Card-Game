// client/src/socket.ts
import MockSocket from "./utils/MockSocket";

// Use mock socket instead of real socket.io connection for testing
const socket = MockSocket.getInstance();

// Assign a fixed ID for the current user to make testing easier
socket.setId("user-main");

export default socket;
