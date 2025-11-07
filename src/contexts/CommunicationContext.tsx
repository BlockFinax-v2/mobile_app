import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWallet } from "@/contexts/WalletContext";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";
import { Alert, AppState } from "react-native";
import { v4 as uuidv4 } from "react-native-uuid";

// Types
export interface Message {
  id: string;
  fromAddress: string;
  toAddress: string;
  text: string;
  timestamp: Date;
  status: "sending" | "sent" | "delivered" | "read";
  type: "text" | "image" | "file" | "voice" | "payment";
  metadata?: {
    fileName?: string;
    fileSize?: number;
    imageUri?: string;
    voiceDuration?: number;
    paymentAmount?: string;
    paymentToken?: string;
  };
}

export interface Contact {
  id: string;
  name: string;
  walletAddress: string;
  notes?: string;
  lastSeen?: Date;
  isOnline?: boolean;
  avatar?: string;
  publicKey?: string;
}

export interface Conversation {
  id: string;
  participants: string[]; // wallet addresses
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string;
}

export interface CallInfo {
  id: string;
  fromAddress: string;
  toAddress: string;
  type: "voice" | "video";
  status: "connecting" | "ringing" | "active" | "ended" | "rejected" | "missed";
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

export interface OnlineUser {
  walletAddress: string;
  lastSeen: Date;
  isOnline: boolean;
  deviceInfo?: {
    platform: string;
    version: string;
  };
}

// Communication Context Interface
interface CommunicationContextType {
  // Connection
  isConnected: boolean;
  socket: Socket | null;

  // Messaging
  messages: Record<string, Message[]>; // conversationId -> messages[]
  conversations: Conversation[];
  contacts: Contact[];

  // Online status
  onlineUsers: Record<string, OnlineUser>;

  // Calls
  activeCall: CallInfo | null;
  callHistory: CallInfo[];
  isInCall: boolean;

  // Actions
  sendMessage: (
    toAddress: string,
    text: string,
    type?: Message["type"],
    metadata?: Message["metadata"]
  ) => Promise<void>;
  markMessageAsRead: (
    conversationId: string,
    messageId: string
  ) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;

  // Contacts
  addContact: (contact: Omit<Contact, "id">) => Promise<void>;
  updateContact: (
    contactId: string,
    updates: Partial<Contact>
  ) => Promise<void>;
  removeContact: (contactId: string) => Promise<void>;
  getContactByAddress: (address: string) => Contact | undefined;

  // Conversations
  getOrCreateConversation: (participantAddress: string) => Promise<string>;
  getConversationMessages: (conversationId: string) => Message[];
  deleteConversation: (conversationId: string) => Promise<void>;

  // Calls
  initiateCall: (toAddress: string, type: "voice" | "video") => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  rejectCall: (callId: string) => Promise<void>;
  endCall: (callId: string) => Promise<void>;

  // Typing indicators
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => void;
  typingUsers: Record<string, string[]>; // conversationId -> typing user addresses[]

  // File sharing
  sendImage: (toAddress: string, imageUri: string) => Promise<void>;
  sendVoiceMessage: (
    toAddress: string,
    audioUri: string,
    duration: number
  ) => Promise<void>;
  sendFile: (
    toAddress: string,
    fileUri: string,
    fileName: string,
    fileSize: number
  ) => Promise<void>;
}

const CommunicationContext = createContext<
  CommunicationContextType | undefined
>(undefined);

// WebSocket server URL - replace with your actual server
const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3001";

export const CommunicationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { address } = useWallet();

  // State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, OnlineUser>>(
    {}
  );
  const [activeCall, setActiveCall] = useState<CallInfo | null>(null);
  const [callHistory, setCallHistory] = useState<CallInfo[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Initialize socket connection
  useEffect(() => {
    if (!address) return;

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    newSocket.on("connect", () => {
      console.log("Connected to communication server");
      setIsConnected(true);
      setSocket(newSocket);

      // Authenticate with server
      newSocket.emit("authenticate", {
        address,
        name: `User ${address.slice(-4)}`,
      });
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected from communication server:", reason);
      setIsConnected(false);
      if (reason === "io server disconnect") {
        newSocket.connect();
      }
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setIsConnected(false);
    });

    // Authentication events
    newSocket.on("authenticated", (data: { success: boolean }) => {
      console.log("Authenticated successfully:", data);
    });

    newSocket.on("users_online", (users: any[]) => {
      const onlineUsersMap: Record<string, OnlineUser> = {};
      users.forEach((user) => {
        onlineUsersMap[user.address] = {
          walletAddress: user.address,
          isOnline: user.isOnline,
          lastSeen: new Date(user.lastSeen),
        };
      });
      setOnlineUsers(onlineUsersMap);
    });

    // Message events
    newSocket.on("message_received", (message: any) => {
      const formattedMessage: Message = {
        id: message.id,
        fromAddress: message.fromAddress,
        toAddress: message.toAddress,
        text: message.text,
        timestamp: new Date(message.timestamp),
        status: message.status || "delivered",
        type: message.type || "text",
        metadata: message.metadata,
      };
      handleMessageReceived(formattedMessage);
    });

    newSocket.on("message_sent", (message: any) => {
      handleMessageStatusUpdate(message.id, "sent");
    });

    // Typing events
    newSocket.on(
      "user_typing",
      ({
        conversationId,
        userAddress,
        isTyping,
      }: {
        conversationId: string;
        userAddress: string;
        isTyping: boolean;
      }) => {
        if (isTyping) {
          handleTypingStart(conversationId, userAddress);
        } else {
          handleTypingStop(conversationId, userAddress);
        }
      }
    );

    // Call events
    newSocket.on("incoming_call", (callInfo: any) => {
      const formattedCall: CallInfo = {
        id: callInfo.id,
        fromAddress: callInfo.fromAddress,
        toAddress: callInfo.toAddress,
        type: callInfo.callType,
        status: "ringing",
        startTime: new Date(callInfo.timestamp),
      };
      handleIncomingCall(formattedCall);
    });

    newSocket.on("call_initiated", (callInfo: any) => {
      console.log("Call initiated:", callInfo);
    });

    newSocket.on("call_response_received", (data: any) => {
      if (data.response === "accept") {
        handleCallAccepted({
          id: data.callId,
          fromAddress: data.fromAddress,
          toAddress: address,
          type: activeCall?.type || "voice",
          status: "active",
        });
      } else {
        handleCallRejected({
          id: data.callId,
          fromAddress: data.fromAddress,
          toAddress: address,
          type: activeCall?.type || "voice",
          status: "rejected",
        });
      }
    });

    // WebRTC signaling
    newSocket.on("webrtc_signal", (data: any) => {
      console.log("WebRTC signal received:", data);
      // Handle WebRTC signaling here
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [address]);

  // Load persisted data
  useEffect(() => {
    loadPersistedData();
  }, []);

  // Handle app state changes for online status
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (socket && address) {
        if (nextAppState === "active") {
          socket.emit("authenticate", {
            address,
            name: `User ${address.slice(-4)}`,
          });
        } else if (
          nextAppState === "background" ||
          nextAppState === "inactive"
        ) {
          // Socket will handle disconnect automatically
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [socket, address]);

  // Persist data functions
  const persistMessages = useCallback(
    async (conversationId: string, messages: Message[]) => {
      try {
        await AsyncStorage.setItem(
          `messages:${conversationId}`,
          JSON.stringify(messages)
        );
      } catch (error) {
        console.error("Failed to persist messages:", error);
      }
    },
    []
  );

  const persistContacts = useCallback(async (contacts: Contact[]) => {
    try {
      await AsyncStorage.setItem("contacts", JSON.stringify(contacts));
    } catch (error) {
      console.error("Failed to persist contacts:", error);
    }
  }, []);

  const persistConversations = useCallback(
    async (conversations: Conversation[]) => {
      try {
        await AsyncStorage.setItem(
          "conversations",
          JSON.stringify(conversations)
        );
      } catch (error) {
        console.error("Failed to persist conversations:", error);
      }
    },
    []
  );

  const loadPersistedData = useCallback(async () => {
    try {
      // Load contacts
      const storedContacts = await AsyncStorage.getItem("contacts");
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      }

      // Load conversations
      const storedConversations = await AsyncStorage.getItem("conversations");
      if (storedConversations) {
        const parsedConversations: Conversation[] =
          JSON.parse(storedConversations);
        setConversations(parsedConversations);

        // Load messages for each conversation
        const messagesMap: Record<string, Message[]> = {};
        for (const conversation of parsedConversations) {
          const storedMessages = await AsyncStorage.getItem(
            `messages:${conversation.id}`
          );
          if (storedMessages) {
            messagesMap[conversation.id] = JSON.parse(storedMessages);
          }
        }
        setMessages(messagesMap);
      }

      // Load call history
      const storedCallHistory = await AsyncStorage.getItem("callHistory");
      if (storedCallHistory) {
        setCallHistory(JSON.parse(storedCallHistory));
      }
    } catch (error) {
      console.error("Failed to load persisted data:", error);
    }
  }, []);

  // Message handlers
  const handleMessageReceived = useCallback(
    (message: Message) => {
      const conversationId = getConversationId(
        message.fromAddress,
        message.toAddress
      );

      setMessages((prev) => {
        const conversationMessages = prev[conversationId] || [];
        const updatedMessages = [...conversationMessages, message];
        persistMessages(conversationId, updatedMessages);
        return {
          ...prev,
          [conversationId]: updatedMessages,
        };
      });

      // Update conversation
      setConversations((prev) => {
        const existingConversation = prev.find((c) => c.id === conversationId);
        if (existingConversation) {
          const updated = prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessage: message,
                  unreadCount: c.unreadCount + 1,
                  updatedAt: new Date(),
                }
              : c
          );
          persistConversations(updated);
          return updated;
        } else {
          const newConversation: Conversation = {
            id: conversationId,
            participants: [message.fromAddress, message.toAddress],
            lastMessage: message,
            unreadCount: 1,
            updatedAt: new Date(),
          };
          const updated = [newConversation, ...prev];
          persistConversations(updated);
          return updated;
        }
      });

      // Send delivery confirmation
      if (socket) {
        socket.emit("message:delivered", { messageId: message.id });
      }
    },
    [socket, persistMessages, persistConversations]
  );

  const handleMessageStatusUpdate = useCallback(
    (messageId: string, status: Message["status"]) => {
      setMessages((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((conversationId) => {
          updated[conversationId] = updated[conversationId].map((message) =>
            message.id === messageId ? { ...message, status } : message
          );
        });
        return updated;
      });
    },
    []
  );

  // Typing handlers
  const handleTypingStart = useCallback(
    (conversationId: string, userAddress: string) => {
      setTypingUsers((prev) => {
        const conversationTyping = prev[conversationId] || [];
        if (!conversationTyping.includes(userAddress)) {
          return {
            ...prev,
            [conversationId]: [...conversationTyping, userAddress],
          };
        }
        return prev;
      });

      // Clear existing timeout
      if (typingTimeoutRef.current[`${conversationId}:${userAddress}`]) {
        clearTimeout(
          typingTimeoutRef.current[`${conversationId}:${userAddress}`]
        );
      }

      // Set timeout to auto-stop typing
      typingTimeoutRef.current[`${conversationId}:${userAddress}`] = setTimeout(
        () => {
          handleTypingStop(conversationId, userAddress);
        },
        3000
      );
    },
    []
  );

  const handleTypingStop = useCallback(
    (conversationId: string, userAddress: string) => {
      setTypingUsers((prev) => {
        const conversationTyping = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: conversationTyping.filter(
            (addr) => addr !== userAddress
          ),
        };
      });

      // Clear timeout
      if (typingTimeoutRef.current[`${conversationId}:${userAddress}`]) {
        clearTimeout(
          typingTimeoutRef.current[`${conversationId}:${userAddress}`]
        );
        delete typingTimeoutRef.current[`${conversationId}:${userAddress}`];
      }
    },
    []
  );

  // Call handlers
  const handleIncomingCall = useCallback((callInfo: CallInfo) => {
    setActiveCall(callInfo);

    Alert.alert(
      "Incoming Call",
      `${
        getContactByAddress(callInfo.fromAddress)?.name || callInfo.fromAddress
      } is calling you`,
      [
        {
          text: "Reject",
          style: "cancel",
          onPress: () => rejectCall(callInfo.id),
        },
        {
          text: "Accept",
          onPress: () => acceptCall(callInfo.id),
        },
      ]
    );
  }, []);

  const handleCallAccepted = useCallback((callInfo: CallInfo) => {
    setActiveCall(callInfo);
  }, []);

  const handleCallRejected = useCallback((callInfo: CallInfo) => {
    setActiveCall(null);
    setCallHistory((prev) => {
      const updated = [callInfo, ...prev];
      AsyncStorage.setItem("callHistory", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleCallEnded = useCallback((callInfo: CallInfo) => {
    setActiveCall(null);
    setCallHistory((prev) => {
      const updated = [callInfo, ...prev];
      AsyncStorage.setItem("callHistory", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Utility functions
  const getConversationId = (address1: string, address2: string): string => {
    return [address1, address2].sort().join(":");
  };

  const getContactByAddress = useCallback(
    (walletAddress: string): Contact | undefined => {
      return contacts.find(
        (contact) =>
          contact.walletAddress.toLowerCase() === walletAddress.toLowerCase()
      );
    },
    [contacts]
  );

  // Public functions
  const sendMessage = useCallback(
    async (
      toAddress: string,
      text: string,
      type: Message["type"] = "text",
      metadata?: Message["metadata"]
    ) => {
      if (!socket || !address) throw new Error("Not connected");

      const message: Message = {
        id: uuidv4() as string,
        fromAddress: address,
        toAddress: toAddress.toLowerCase(),
        text,
        timestamp: new Date(),
        status: "sending",
        type,
        metadata,
      };

      const conversationId = getConversationId(address, toAddress);

      // Add to local messages immediately
      setMessages((prev) => {
        const conversationMessages = prev[conversationId] || [];
        const updatedMessages = [...conversationMessages, message];
        persistMessages(conversationId, updatedMessages);
        return {
          ...prev,
          [conversationId]: updatedMessages,
        };
      });

      // Update conversation
      await getOrCreateConversation(toAddress);

      // Send to server
      socket.emit("send_message", {
        toAddress: message.toAddress,
        message: message.text,
        type: message.type,
        metadata: message.metadata,
      });

      // Update message status to sent
      setTimeout(() => {
        handleMessageStatusUpdate(message.id, "sent");
      }, 100);
    },
    [socket, address, persistMessages]
  );

  const getOrCreateConversation = useCallback(
    async (participantAddress: string): Promise<string> => {
      if (!address) throw new Error("User not authenticated");

      const conversationId = getConversationId(address, participantAddress);
      const existingConversation = conversations.find(
        (c) => c.id === conversationId
      );

      if (!existingConversation) {
        const newConversation: Conversation = {
          id: conversationId,
          participants: [address, participantAddress.toLowerCase()],
          unreadCount: 0,
          updatedAt: new Date(),
        };

        setConversations((prev) => {
          const updated = [newConversation, ...prev];
          persistConversations(updated);
          return updated;
        });
      }

      return conversationId;
    },
    [address, conversations, persistConversations]
  );

  const getConversationMessages = useCallback(
    (conversationId: string): Message[] => {
      return messages[conversationId] || [];
    },
    [messages]
  );

  const markConversationAsRead = useCallback(
    async (conversationId: string) => {
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        );
        persistConversations(updated);
        return updated;
      });

      // Mark all messages as read
      const conversationMessages = messages[conversationId] || [];
      conversationMessages.forEach((message) => {
        if (message.fromAddress !== address && message.status !== "read") {
          // Server doesn't have read receipts yet, just update locally
          handleMessageStatusUpdate(message.id, "read");
        }
      });
    },
    [messages, address, socket, persistConversations]
  );

  const addContact = useCallback(
    async (contactData: Omit<Contact, "id">) => {
      const newContact: Contact = {
        ...contactData,
        id: uuidv4() as string,
        walletAddress: contactData.walletAddress.toLowerCase(),
      };

      setContacts((prev) => {
        const updated = [...prev, newContact];
        persistContacts(updated);
        return updated;
      });
    },
    [persistContacts]
  );

  const sendTypingIndicator = useCallback(
    (conversationId: string, isTyping: boolean) => {
      if (!socket) return;

      socket.emit("typing", { conversationId, isTyping });
    },
    [socket]
  );

  const initiateCall = useCallback(
    async (toAddress: string, type: "voice" | "video") => {
      if (!socket || !address) throw new Error("Not connected");

      const callInfo: CallInfo = {
        id: uuidv4() as string,
        fromAddress: address,
        toAddress: toAddress.toLowerCase(),
        type,
        status: "connecting",
        startTime: new Date(),
      };

      setActiveCall(callInfo);
      socket.emit("start_call", { toAddress, callType: type });
    },
    [socket, address]
  );

  const acceptCall = useCallback(
    async (callId: string) => {
      if (!socket || !activeCall) return;
      socket.emit("call_response", {
        callId,
        response: "accept",
        toAddress: activeCall.fromAddress,
      });
      setActiveCall((prev) => (prev ? { ...prev, status: "active" } : null));
    },
    [socket, activeCall]
  );

  const rejectCall = useCallback(
    async (callId: string) => {
      if (!socket || !activeCall) return;
      socket.emit("call_response", {
        callId,
        response: "decline",
        toAddress: activeCall.fromAddress,
      });
      setActiveCall(null);
    },
    [socket, activeCall]
  );

  const endCall = useCallback(
    async (callId: string) => {
      if (!socket) return;
      socket.emit("call_response", {
        callId,
        response: "end",
        toAddress: activeCall?.toAddress || activeCall?.fromAddress,
      });
      setActiveCall(null);
    },
    [socket, activeCall]
  );

  // Placeholder implementations for other functions
  const markMessageAsRead = useCallback(
    async (conversationId: string, messageId: string) => {
      // Implementation for marking specific message as read
    },
    []
  );

  const updateContact = useCallback(
    async (contactId: string, updates: Partial<Contact>) => {
      setContacts((prev) => {
        const updated = prev.map((contact) =>
          contact.id === contactId ? { ...contact, ...updates } : contact
        );
        persistContacts(updated);
        return updated;
      });
    },
    [persistContacts]
  );

  const removeContact = useCallback(
    async (contactId: string) => {
      setContacts((prev) => {
        const updated = prev.filter((contact) => contact.id !== contactId);
        persistContacts(updated);
        return updated;
      });
    },
    [persistContacts]
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      setConversations((prev) => {
        const updated = prev.filter((c) => c.id !== conversationId);
        persistConversations(updated);
        return updated;
      });

      setMessages((prev) => {
        const updated = { ...prev };
        delete updated[conversationId];
        AsyncStorage.removeItem(`messages:${conversationId}`);
        return updated;
      });
    },
    [persistConversations]
  );

  const sendImage = useCallback(
    async (toAddress: string, imageUri: string) => {
      // Implementation for sending images
      await sendMessage(toAddress, "", "image", { imageUri });
    },
    [sendMessage]
  );

  const sendVoiceMessage = useCallback(
    async (toAddress: string, audioUri: string, duration: number) => {
      // Implementation for sending voice messages
      await sendMessage(toAddress, "", "voice", { voiceDuration: duration });
    },
    [sendMessage]
  );

  const sendFile = useCallback(
    async (
      toAddress: string,
      fileUri: string,
      fileName: string,
      fileSize: number
    ) => {
      // Implementation for sending files
      await sendMessage(toAddress, "", "file", { fileName, fileSize });
    },
    [sendMessage]
  );

  const contextValue: CommunicationContextType = {
    // Connection
    isConnected,
    socket,

    // Messaging
    messages,
    conversations: conversations.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
    contacts,

    // Online status
    onlineUsers,

    // Calls
    activeCall,
    callHistory,
    isInCall: activeCall?.status === "active",

    // Actions
    sendMessage,
    markMessageAsRead,
    markConversationAsRead,

    // Contacts
    addContact,
    updateContact,
    removeContact,
    getContactByAddress,

    // Conversations
    getOrCreateConversation,
    getConversationMessages,
    deleteConversation,

    // Calls
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,

    // Typing
    sendTypingIndicator,
    typingUsers,

    // File sharing
    sendImage,
    sendVoiceMessage,
    sendFile,
  };

  return (
    <CommunicationContext.Provider value={contextValue}>
      {children}
    </CommunicationContext.Provider>
  );
};

export const useCommunication = (): CommunicationContextType => {
  const context = useContext(CommunicationContext);
  if (context === undefined) {
    throw new Error(
      "useCommunication must be used within a CommunicationProvider"
    );
  }
  return context;
};
