import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import {
  RouteProp,
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import { useCommunication } from "../../contexts/CommunicationContext";
import type { Message } from "../../contexts/CommunicationContext";
import { useWallet } from "../../contexts/WalletContext";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { MessagesStackParamList } from "../../navigation/types";

type ChatScreenNavigationProp = StackNavigationProp<
  MessagesStackParamList,
  "Chat"
>;
type ChatScreenRouteProp = RouteProp<MessagesStackParamList, "Chat">;

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const route = useRoute<ChatScreenRouteProp>();
  const { contactAddress } = route.params;

  const { address } = useWallet();
  const {
    conversations,
    contacts,
    onlineUsers,
    sendMessage,
    sendTypingIndicator,
    typingUsers,
    startVoiceCall,
    startVideoCall,
    getConversationMessages,
  } = useCommunication();

  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

  // Animation for typing indicator
  const typingAnimation = useRef(new Animated.Value(0)).current;

  // Get conversation and messages
  const conversationId = [address, contactAddress].sort().join(":");
  const conversation = conversations.find((c) => c.id === conversationId);
  const messages = getConversationMessages(conversationId);

  // Debug logging
  console.log("ChatScreen render:", {
    conversationId,
    hasConversation: !!conversation,
    messageCount: messages.length,
    address,
    contactAddress,
  });

  // Get contact info
  const contact = contacts.find((c) => c.address === contactAddress);
  const displayName = contact?.name || `User ${contactAddress?.slice(-4) || ''}`;
  const isOnline = contactAddress ? onlineUsers[contactAddress]?.isOnline || false : false;
  const isTyping = contactAddress
    ? typingUsers[conversationId]?.includes(contactAddress) || false
    : false;

  // Set navigation options
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerContactName}>{displayName}</Text>
          <Text style={styles.headerStatus}>
            {isOnline ? "Online" : "Last seen recently"}
          </Text>
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => handleCall("voice")}
          >
            <MaterialCommunityIcons
              name="phone"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => handleCall("video")}
          >
            <MaterialCommunityIcons
              name="video"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, displayName, isOnline]);

  useEffect(() => {
    if (conversationId && message.trim()) {
      sendTypingIndicator(conversationId, true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(conversationId, false);
      }, 1000);
    } else if (conversationId) {
      sendTypingIndicator(conversationId, false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, conversationId, sendTypingIndicator]);

  // Typing animation
  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      typingAnimation.setValue(0);
    }
  }, [isTyping]);

  // Scroll to bottom when new messages arrive
  useFocusEffect(
    useCallback(() => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, [messages.length])
  );

  const handleSendMessage = async () => {
    if (!message.trim() || !contactAddress) {
      console.log("handleSendMessage: empty message or no contact address", {
        message: message.trim(),
        contactAddress,
      });
      return;
    }

    console.log("handleSendMessage: attempting to send", {
      message: message.trim(),
      contactAddress,
    });

    try {
      await sendMessage(contactAddress, message.trim());
      console.log("handleSendMessage: message sent successfully");
      setMessage("");

      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error("handleSendMessage: error sending message", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const handleCall = async (type: "voice" | "video") => {
    try {
      console.log("🔄 Starting call from ChatScreen...", {
        type,
        contactAddress,
      });

      if (!contactAddress) {
        Alert.alert("Error", "Contact address is not available");
        return;
      }

      if (type === "voice") {
        await startVoiceCall(contactAddress);
      } else {
        await startVideoCall(contactAddress);
      }

      console.log("✅ Call initiated, navigating to ActiveCallScreen");

      // Navigate to ActiveCallScreen
      navigation.navigate("ActiveCallScreen", {
        callData: {
          callId: "temp-" + Date.now(),
          participantAddress: contactAddress,
          participantName: displayName,
          callType: type,
          isIncoming: false,
          status: "connecting",
        },
        localStream: null,
        remoteStream: null,
      });

      console.log("🎯 Navigation called successfully from ChatScreen");
    } catch (error) {
      console.error("❌ Failed to initiate call from ChatScreen:", error);
      Alert.alert("Call Failed", `Failed to start call: ${error}`);
    }
  };

  const handleAttachment = () => {
    Alert.alert("Send Attachment", "Choose an option", [
      { text: "Camera", onPress: handleCamera },
      { text: "Gallery", onPress: handleGallery },
      { text: "Document", onPress: handleDocument },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Camera permission is required to take photos."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      await sendImageMessage(result.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Gallery permission is required to select photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      await sendImageMessage(result.assets[0].uri);
    }
  };

  const handleDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        await sendFileMessage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select document.");
    }
  };

  const sendImageMessage = async (imageUri: string) => {
    try {
      if (!contactAddress) return;
      // Here you would typically upload the image to your server and get a URL
      // For now, we'll send it with the local URI
      await sendMessage(contactAddress, "", "image", { imageUri });
    } catch (error) {
      Alert.alert("Error", "Failed to send image. Please try again.");
    }
  };

  const sendFileMessage = async (file: DocumentPicker.DocumentPickerAsset) => {
    try {
      if (!contactAddress) return;
      // Here you would typically upload the file to your server
      await sendMessage(contactAddress, file.name, "file", {
        fileName: file.name,
        fileSize: file.size,
        fileUri: file.uri,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to send file. Please try again.");
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Microphone permission is required to record voice messages."
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      const status = await recording.getStatusAsync();

      if (!contactAddress) return;

      if (uri && status.durationMillis) {
        const duration = Math.round((status.durationMillis || 0) / 1000);
        await sendMessage(contactAddress, "Voice message", "voice", {
          voiceUri: uri,
          voiceDuration: duration,
        });
      }

      setRecording(null);
    } catch (error) {
      Alert.alert("Error", "Failed to send voice message. Please try again.");
      setRecording(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const fromSelf = item.fromAddress === address;
    const timestamp = new Date(item.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const renderMessageContent = () => {
      switch (item.type) {
        case "image":
          return (
            <View style={styles.imageMessageContainer}>
              {item.metadata?.imageUri && (
                <Image
                  source={{ uri: item.metadata.imageUri }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              )}
              {item.text && (
                <Text
                  style={[
                    styles.messageText,
                    { color: fromSelf ? "white" : colors.text },
                  ]}
                >
                  {item.text}
                </Text>
              )}
            </View>
          );

        case "voice":
          return (
            <View style={styles.voiceMessageContainer}>
              <MaterialCommunityIcons
                name="play"
                size={20}
                color={fromSelf ? "white" : colors.primary}
              />
              <Text
                style={[
                  styles.voiceDuration,
                  { color: fromSelf ? "white" : colors.text },
                ]}
              >
                {item.metadata?.voiceDuration
                  ? `${item.metadata.voiceDuration}s`
                  : "Voice message"}
              </Text>
            </View>
          );

        case "file":
          return (
            <View style={styles.fileMessageContainer}>
              <MaterialCommunityIcons
                name="file"
                size={20}
                color={fromSelf ? "white" : colors.primary}
              />
              <View>
                <Text
                  style={[
                    styles.fileName,
                    { color: fromSelf ? "white" : colors.text },
                  ]}
                >
                  {item.metadata?.fileName || "File"}
                </Text>
                {item.metadata?.fileSize && (
                  <Text
                    style={[
                      styles.fileSize,
                      {
                        color: fromSelf
                          ? "rgba(255,255,255,0.7)"
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {formatFileSize(item.metadata.fileSize)}
                  </Text>
                )}
              </View>
            </View>
          );

        default:
          return (
            <Text
              style={[
                styles.messageText,
                { color: fromSelf ? "white" : colors.text },
              ]}
            >
              {item.text}
            </Text>
          );
      }
    };

    return (
      <View
        style={[
          styles.messageContainer,
          fromSelf ? styles.selfMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            fromSelf ? styles.selfBubble : styles.otherBubble,
          ]}
        >
          {renderMessageContent()}
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.timestamp,
                {
                  color: fromSelf
                    ? "rgba(255,255,255,0.7)"
                    : colors.textSecondary,
                },
              ]}
            >
              {timestamp}
            </Text>
            {fromSelf && (
              <MaterialCommunityIcons
                name="check"
                size={14}
                color="rgba(255,255,255,0.7)"
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={[styles.messageContainer, styles.otherMessageContainer]}>
        <View
          style={[
            styles.messageBubble,
            styles.otherBubble,
            styles.typingBubble,
          ]}
        >
          <View style={styles.typingIndicator}>
            <Text
              style={[
                styles.messageText,
                { color: colors.text, marginBottom: 0 },
              ]}
            >
              {displayName} is typing
            </Text>
            <Animated.View
              style={[
                styles.typingDot,
                {
                  opacity: typingAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 1],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.container}>
          {/* Messages */}
        <FlatList
          style={{flex:1}}
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => `message-${item.id}-${index}`}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={renderTypingIndicator}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={handleAttachment}
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>

              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Type a message..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity style={styles.emojiButton}>
                  <MaterialCommunityIcons
                    name="emoticon-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {message.trim() ? (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendMessage}
                >
                  <MaterialCommunityIcons name="send" size={20} color="white" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.voiceButton,
                    {
                      backgroundColor: isRecording
                        ? colors.error
                        : colors.background,
                    },
                  ]}
                  onPressIn={startRecording}
                  onPressOut={stopRecording}
                >
                  <MaterialCommunityIcons
                    name="microphone"
                    size={20}
                    color={isRecording ? "white" : colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerContactName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  headerStatus: {
    fontSize: 12,
    color: colors.primary,
    paddingLeft: 10
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  headerActionButton: {
    padding: spacing.sm,
    borderRadius: 8,
  },
  messagesContainer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageContainer: {
    marginBottom: spacing.md,
  },
  selfMessageContainer: {
    alignItems: "flex-end",
  },
  otherMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selfBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
  timestamp: {
    fontSize: 11,
  },
  typingBubble: {
    paddingVertical: spacing.md,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
    opacity: 0.4,
  },
  inputContainer: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  textInputContainer: {
    flex: 1,
    flexDirection: "row",
    // alignItems: "flex-end",
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    // minHeight: 40,
    // maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 20,
    marginRight: spacing.sm,
     paddingVertical: 0,
  },
  emojiButton: {
    padding: spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  // Message type specific styles
  imageMessageContainer: {
    alignItems: "flex-start",
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  voiceMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  voiceDuration: {
    fontSize: 14,
    fontWeight: "500",
  },
  fileMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
  },
  fileSize: {
    fontSize: 12,
  },
});
