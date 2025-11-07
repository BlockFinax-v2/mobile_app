# WebSocket Server for BlockFinax Messaging

## Setup Instructions

1. Create a new directory for the server:

```bash
mkdir blockfinax-server
cd blockfinax-server
```

2. Initialize npm and install dependencies:

```bash
npm init -y
npm install socket.io express cors
```

3. Create the server file (server.js):

```javascript
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store connected users
const connectedUsers = new Map();
const userSockets = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle user authentication/connection
  socket.on("authenticate", (data) => {
    const { address, name } = data;

    // Store user info
    connectedUsers.set(address, {
      address,
      name,
      socketId: socket.id,
      isOnline: true,
      lastSeen: new Date(),
    });

    // Map socket to address for easy lookup
    userSockets.set(socket.id, address);

    console.log(`User ${name} (${address}) authenticated`);

    // Broadcast online users
    io.emit("users_online", Array.from(connectedUsers.values()));

    // Send confirmation to user
    socket.emit("authenticated", { success: true });
  });

  // Handle messages
  socket.on("send_message", (data) => {
    const { toAddress, message, type = "text", metadata = {} } = data;
    const fromAddress = userSockets.get(socket.id);

    if (!fromAddress) {
      socket.emit("error", { message: "Not authenticated" });
      return;
    }

    const messageData = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromAddress,
      toAddress,
      text: message,
      type,
      metadata,
      timestamp: new Date().toISOString(),
      status: "sent",
    };

    console.log(`Message from ${fromAddress} to ${toAddress}:`, message);

    // Send to recipient if online
    const recipient = connectedUsers.get(toAddress);
    if (recipient) {
      const recipientSocket = io.sockets.sockets.get(recipient.socketId);
      if (recipientSocket) {
        recipientSocket.emit("message_received", messageData);
        messageData.status = "delivered";
      }
    }

    // Send confirmation back to sender
    socket.emit("message_sent", messageData);
  });

  // Handle typing indicators
  socket.on("typing", (data) => {
    const { conversationId, isTyping } = data;
    const fromAddress = userSockets.get(socket.id);

    if (!fromAddress) return;

    // Broadcast typing status to other participants in conversation
    socket.broadcast.emit("user_typing", {
      conversationId,
      userAddress: fromAddress,
      isTyping,
    });
  });

  // Handle call initiation
  socket.on("start_call", (data) => {
    const { toAddress, callType } = data;
    const fromAddress = userSockets.get(socket.id);

    if (!fromAddress) {
      socket.emit("error", { message: "Not authenticated" });
      return;
    }

    const recipient = connectedUsers.get(toAddress);
    if (recipient) {
      const recipientSocket = io.sockets.sockets.get(recipient.socketId);
      if (recipientSocket) {
        const callData = {
          id: `call_${Date.now()}`,
          fromAddress,
          toAddress,
          callType,
          status: "ringing",
          timestamp: new Date().toISOString(),
        };

        recipientSocket.emit("incoming_call", callData);
        socket.emit("call_initiated", callData);
      }
    }
  });

  // Handle call responses
  socket.on("call_response", (data) => {
    const { callId, response, toAddress } = data; // response: 'accept' or 'decline'
    const fromAddress = userSockets.get(socket.id);

    if (!fromAddress) return;

    const recipient = connectedUsers.get(toAddress);
    if (recipient) {
      const recipientSocket = io.sockets.sockets.get(recipient.socketId);
      if (recipientSocket) {
        recipientSocket.emit("call_response_received", {
          callId,
          response,
          fromAddress,
        });
      }
    }
  });

  // Handle WebRTC signaling
  socket.on("webrtc_signal", (data) => {
    const { toAddress, signal } = data;
    const fromAddress = userSockets.get(socket.id);

    const recipient = connectedUsers.get(toAddress);
    if (recipient) {
      const recipientSocket = io.sockets.sockets.get(recipient.socketId);
      if (recipientSocket) {
        recipientSocket.emit("webrtc_signal", {
          fromAddress,
          signal,
        });
      }
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const address = userSockets.get(socket.id);

    if (address) {
      const user = connectedUsers.get(address);
      if (user) {
        user.isOnline = false;
        user.lastSeen = new Date();
      }

      userSockets.delete(socket.id);

      console.log(`User ${address} disconnected`);

      // Broadcast updated online users
      io.emit(
        "users_online",
        Array.from(connectedUsers.values()).filter((u) => u.isOnline)
      );
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`BlockFinax WebSocket server running on port ${PORT}`);
});
```

4. Start the server:

```bash
node server.js
```

## Testing

The server will run on `http://localhost:3001` and handle:

- User authentication with wallet addresses
- Real-time messaging
- Typing indicators
- Call initiation and WebRTC signaling
- Online status tracking

## Production Deployment

For production, consider:

- Add proper authentication and security
- Use Redis for scaling across multiple server instances
- Add message persistence with a database
- Implement rate limiting
- Add proper error handling and logging
- Use HTTPS and secure WebSocket connections
