import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWallet } from "@/contexts/WalletContext";
import AppConfig from "@/config/AppConfig";
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
import { useNavigation } from "@react-navigation/native";
import uuid from "react-native-uuid";
import WebRTCCallingService, {
  CallData,
  CallEvents,
} from "@/services/WebRTCCallingService";

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
    fileUri?: string;
    voiceUri?: string;
  };
}

export interface Contact {
  id: string;
  name: string;
  walletAddress: string;
  address: string; // Alias for walletAddress for consistency
  notes?: string;
  lastSeen?: Date;
  isOnline?: boolean;
  avatar?: string;
  publicKey?: string;
}

export interface Conversation {
  id: string;
  participants: string[]; // wallet addresses
  messages?: Message[]; // Include messages array
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string;
}

export interface CallInfo {
  id: string;
  participantAddress: string;
  participantName: string;
  type: "voice" | "video";
  status:
    | "active"
    | "connecting"
    | "ringing"
    | "connected"
    | "ended"
    | "rejected"
    | "missed";
  timestamp: number;
  isIncoming: boolean;
  localStream?: any;
  remoteStream?: any;
  fromAddress: string;
  toAddress?: string;
  startTime?: Date;
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

  // WebRTC Streams
  localStream: any | null;
  remoteStream: any | null;
  currentCallData: CallData | null;

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
  startVoiceCall: (toAddress: string) => Promise<void>;
  startVideoCall: (toAddress: string) => Promise<void>;
  currentCall?: CallInfo | null; // Alias for activeCall

  // WebRTC Call Controls
  toggleMute: () => boolean;
  toggleVideo: () => boolean;
  isAudioEnabled: () => boolean;
  isVideoEnabled: () => boolean;

  // Call Screen Navigation
  showIncomingCallScreen: (callData: CallData) => void;
  showActiveCallScreen: () => void;
  hideCallScreens: () => void;

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

// WebSocket server URL - using configuration from AppConfig
const SOCKET_URL = AppConfig.socketUrl;

export const CommunicationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { address, settings } = useWallet();

  // Use navigation only if available (inside NavigationContainer)
  let navigation: any = null;
  try {
    navigation = useNavigation();
  } catch (error) {
    console.warn("Navigation not available in CommunicationProvider");
  }

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

  // WebRTC State
  const [localStream, setLocalStream] = useState<any | null>(null);
  const [remoteStream, setRemoteStream] = useState<any | null>(null);
  const [currentCallData, setCurrentCallData] = useState<CallData | null>(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [showActiveCall, setShowActiveCall] = useState(false);

  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const typingTimeoutRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const webrtcServiceRef = useRef<WebRTCCallingService | null>(null);

  // Initialize WebRTC Service
  useEffect(() => {
    if (!address) return;

    console.log("🔗 Initializing WebRTC service...");
    const webrtcService = new WebRTCCallingService(SOCKET_URL);
    webrtcServiceRef.current = webrtcService;

    // Setup WebRTC event handlers
    const callEvents: CallEvents = {
      onIncomingCall: (callData: CallData) => {
        console.log("📞 Incoming call received:", callData);
        setCurrentCallData(callData);
        showIncomingCallScreen(callData);
      },
      onCallAccepted: (callId: string) => {
        console.log("✅ Call accepted:", callId);
        if (currentCallData) {
          setCurrentCallData((prev) =>
            prev ? { ...prev, status: "connecting" } : null
          );
          showActiveCallScreen();
        }
      },
      onCallDeclined: (callId: string, reason?: string) => {
        console.log("❌ Call declined:", callId, reason);
        handleCallEnded();
      },
      onCallEnded: (callId: string, reason?: string) => {
        console.log("📞 Call ended:", callId, reason);
        handleCallEnded();
      },
      onCallError: (error: string) => {
        console.error("☎️ Call error:", error);
        Alert.alert("Call Error", error);
        handleCallEnded();
      },
      onRemoteStream: (stream: MediaStream) => {
        console.log("📺 Remote stream received");
        setRemoteStream(stream);
        if (currentCallData) {
          setCurrentCallData((prev) =>
            prev ? { ...prev, status: "connected" } : null
          );
        }
      },
      onLocalStream: (stream: MediaStream) => {
        console.log("📹 Local stream received");
        setLocalStream(stream);
      },
    };

    webrtcService.setEventHandlers(callEvents);

    // Authenticate with WebRTC service
    const displayName = settings.displayName || `User ${address.slice(-4)}`;
    webrtcService.authenticate(address, displayName);

    return () => {
      webrtcService.disconnect();
      webrtcServiceRef.current = null;
    };
  }, [address, settings.displayName]);

  // Initialize socket connection
  useEffect(() => {
    if (!address) return;

    console.log("🔗 Initializing socket connection...");
    console.log("📍 Socket URL:", SOCKET_URL);
    console.log("👤 User address:", address);
    console.log("🔧 AppConfig debug:", AppConfig.debug);

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    newSocket.on("connect", () => {
      console.log("✅ Connected to communication server successfully!");
      console.log("🆔 Socket ID:", newSocket.id);
      setIsConnected(true);
      setSocket(newSocket);

      // Authenticate with server
      const displayName = settings.displayName || `User ${address.slice(-4)}`;
      console.log("🔐 Authenticating with server...", {
        address,
        name: displayName,
      });
      newSocket.emit("authenticate", {
        address,
        name: displayName,
      });
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("❌ Disconnected from server:", reason);
      setIsConnected(false);
      if (reason === "io server disconnect") {
        console.log("🔄 Attempting reconnection...");
        newSocket.connect();
      }
    });

    newSocket.on("connect_error", (error) => {
      console.error("🚫 Connection error:", error);
      console.error("🚫 Error details:", {
        message: error.message,
        description: (error as any).description || "No description",
        context: (error as any).context || "No context",
        type: (error as any).type || "Unknown type",
      });
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
        id: callInfo.callId,
        fromAddress: callInfo.fromAddress,
        toAddress: callInfo.toAddress,
        participantAddress: callInfo.fromAddress,
        participantName:
          getContactByAddress(callInfo.fromAddress)?.name ||
          callInfo.fromAddress,
        type: callInfo.type,
        status: "ringing",
        timestamp: callInfo.timestamp,
        isIncoming: true,
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
          participantAddress: data.fromAddress,
          participantName:
            getContactByAddress(data.fromAddress)?.name || data.fromAddress,
          type: activeCall?.type || "voice",
          status: "active",
          timestamp: Date.now(),
          isIncoming: false,
        });
      } else {
        handleCallRejected({
          id: data.callId,
          fromAddress: data.fromAddress,
          toAddress: address,
          participantAddress: data.fromAddress,
          participantName:
            getContactByAddress(data.fromAddress)?.name || data.fromAddress,
          type: activeCall?.type || "voice",
          status: "rejected",
          timestamp: Date.now(),
          isIncoming: false,
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
          const displayName =
            settings.displayName || `User ${address.slice(-4)}`;
          socket.emit("authenticate", {
            address,
            name: displayName,
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

        // Deduplicate conversations
        const conversationMap = new Map<string, Conversation>();
        parsedConversations.forEach((conv) => {
          conversationMap.set(conv.id, conv);
        });

        setConversations(Array.from(conversationMap.values()));

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
        // Use Map to ensure uniqueness
        const conversationMap = new Map<string, Conversation>();

        // Add existing conversations
        prev.forEach((conv) => {
          conversationMap.set(conv.id, conv);
        });

        const existingConversation = conversationMap.get(conversationId);
        if (existingConversation) {
          // Update existing conversation
          conversationMap.set(conversationId, {
            ...existingConversation,
            lastMessage: message,
            unreadCount: existingConversation.unreadCount + 1,
            updatedAt: new Date(),
          });
        } else {
          // Create new conversation
          const newConversation: Conversation = {
            id: conversationId,
            participants: [message.fromAddress, message.toAddress],
            lastMessage: message,
            unreadCount: 1,
            updatedAt: new Date(),
          };
          conversationMap.set(conversationId, newConversation);
        }

        const updated = Array.from(conversationMap.values());
        persistConversations(updated);
        return updated;
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

  // Call screen navigation helpers
  const showIncomingCallScreen = useCallback(
    (callData: CallData) => {
      setShowIncomingCall(true);
      setShowActiveCall(false);
      if (navigation) {
        navigation.navigate("IncomingCallScreen", { callData });
      }
    },
    [navigation]
  );

  const showActiveCallScreen = useCallback(() => {
    setShowIncomingCall(false);
    setShowActiveCall(true);
    if (navigation) {
      navigation.navigate("ActiveCallScreen", {
        callData: currentCallData,
        localStream,
        remoteStream,
      });
    }
  }, [navigation, currentCallData, localStream, remoteStream]);

  const hideCallScreens = useCallback(() => {
    setShowIncomingCall(false);
    setShowActiveCall(false);
  }, []);

  const handleCallEnded = useCallback(() => {
    // Clean up call state
    setCurrentCallData(null);
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    hideCallScreens();

    // Navigate back to main app if navigation is available
    if (navigation) {
      navigation.goBack();
    }
  }, [navigation, hideCallScreens]);

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
      console.log("sendMessage called:", {
        toAddress,
        text,
        type,
        hasSocket: !!socket,
        hasAddress: !!address,
      });

      if (!socket || !address) {
        const error = new Error("Not connected");
        console.error("Send message failed - not connected:", {
          hasSocket: !!socket,
          hasAddress: !!address,
        });
        throw error;
      }

      const message: Message = {
        id: uuid.v4() as string,
        fromAddress: address,
        toAddress: toAddress.toLowerCase(),
        text,
        timestamp: new Date(),
        status: "sending",
        type,
        metadata,
      };

      const conversationId = getConversationId(address, toAddress);
      console.log("Generated conversationId:", conversationId);

      // Add to local messages immediately
      setMessages((prev) => {
        const conversationMessages = prev[conversationId] || [];
        const updatedMessages = [...conversationMessages, message];
        console.log("Adding message to local state:", {
          conversationId,
          messageCount: updatedMessages.length,
          messageId: message.id,
        });
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
          // Use Map to ensure uniqueness
          const conversationMap = new Map<string, Conversation>();

          // Add existing conversations
          prev.forEach((conv) => {
            conversationMap.set(conv.id, conv);
          });

          // Add new conversation (will replace if exists)
          conversationMap.set(conversationId, newConversation);

          const updated = Array.from(conversationMap.values());
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
      const conversationMessages = messages[conversationId] || [];
      console.log("getConversationMessages:", {
        conversationId,
        messageCount: conversationMessages.length,
      });
      return conversationMessages;
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
      const normalizedAddress = contactData.walletAddress.toLowerCase();
      const newContact: Contact = {
        ...contactData,
        id: uuid.v4() as string,
        walletAddress: normalizedAddress,
        address: normalizedAddress, // Set both address properties
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
      if (!webrtcServiceRef.current || !address)
        throw new Error("WebRTC service not available");

      console.log("🔄 Initiating call:", { toAddress, type });

      try {
        await webrtcServiceRef.current.initiateCall(toAddress, type);

        // Create local call info for UI
        const callInfo: CallInfo = {
          id: uuid.v4() as string,
          fromAddress: address,
          toAddress: toAddress.toLowerCase(),
          participantAddress: toAddress.toLowerCase(),
          participantName:
            getContactByAddress(toAddress.toLowerCase())?.name || toAddress,
          type,
          status: "connecting",
          timestamp: Date.now(),
          isIncoming: false,
          startTime: new Date(),
        };

        setActiveCall(callInfo);
        // Don't auto-navigate here, let the calling component handle navigation
      } catch (error) {
        console.error("❌ Failed to initiate call:", error);
        Alert.alert("Call Failed", `Failed to initiate call: ${error}`);
      }
    },
    [address, showActiveCallScreen, getContactByAddress]
  );

  const acceptCall = useCallback(
    async (callId: string) => {
      if (!webrtcServiceRef.current || !currentCallData) return;

      console.log("✅ Accepting call:", callId);

      try {
        await webrtcServiceRef.current.acceptCall(callId);
        setCurrentCallData((prev) =>
          prev ? { ...prev, status: "connecting" } : null
        );
      } catch (error) {
        console.error("❌ Failed to accept call:", error);
        Alert.alert("Call Error", `Failed to accept call: ${error}`);
        handleCallEnded();
      }
    },
    [currentCallData, handleCallEnded]
  );

  const rejectCall = useCallback(
    async (callId: string) => {
      if (!webrtcServiceRef.current) return;

      console.log("❌ Rejecting call:", callId);
      webrtcServiceRef.current.declineCall(callId);
      handleCallEnded();
    },
    [handleCallEnded]
  );

  const endCall = useCallback(
    async (callId?: string) => {
      if (!webrtcServiceRef.current) return;

      console.log("📞 Ending call:", callId);
      webrtcServiceRef.current.endCall();
      handleCallEnded();
    },
    [handleCallEnded]
  );

  // WebRTC Controls
  const toggleMute = useCallback((): boolean => {
    if (!webrtcServiceRef.current) return false;
    return webrtcServiceRef.current.toggleAudio();
  }, []);

  const toggleVideo = useCallback((): boolean => {
    if (!webrtcServiceRef.current) return false;
    return webrtcServiceRef.current.toggleVideo();
  }, []);

  const isAudioEnabled = useCallback((): boolean => {
    if (!webrtcServiceRef.current) return false;
    return webrtcServiceRef.current.isAudioEnabled();
  }, []);

  const isVideoEnabled = useCallback((): boolean => {
    if (!webrtcServiceRef.current) return false;
    return webrtcServiceRef.current.isVideoEnabled();
  }, []);

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
      await sendMessage(toAddress, "", "file", { fileName, fileSize, fileUri });
    },
    [sendMessage]
  );

  const startVoiceCall = useCallback(
    async (toAddress: string) => {
      await initiateCall(toAddress, "voice");
    },
    [initiateCall]
  );

  const startVideoCall = useCallback(
    async (toAddress: string) => {
      await initiateCall(toAddress, "video");
    },
    [initiateCall]
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
    isInCall:
      activeCall?.status === "active" ||
      currentCallData?.status === "connected",

    // WebRTC Streams
    localStream,
    remoteStream,
    currentCallData,

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

    // WebRTC Call Controls
    toggleMute,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,

    // Call Screen Navigation
    showIncomingCallScreen,
    showActiveCallScreen,
    hideCallScreens,

    // Typing
    sendTypingIndicator,
    typingUsers,

    // File sharing
    sendImage,
    sendVoiceMessage,
    sendFile,

    // Additional call methods
    startVoiceCall,
    startVideoCall,
    currentCall: activeCall, // Alias for activeCall
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
