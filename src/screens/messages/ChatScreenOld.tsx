import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useCommunication, Message as CommunicationMessage } from "@/contexts/CommunicationContext";
import { useWallet } from "@/contexts/WalletContext";
import { MessagesStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";

type ChatScreenRouteProp = RouteProp<MessagesStackParamList, 'Chat'>;
type ChatNavigationProp = StackNavigationProp<MessagesStackParamList, 'Chat'>;

export const ChatScreen: React.FC = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatNavigationProp>();
  const { address } = useWallet();
  const {
    sendMessage,
    sendImage,
    sendVoiceMessage,
    getConversationMessages,
    getContactByAddress,
    onlineUsers,
    typingUsers,
    sendTypingIndicator,
    markConversationAsRead,
    initiateCall,
  } = useCommunication();

  const conversationId = route.params?.id;
  const participantAddress = route.params?.participantAddress;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Get contact info
  const contact = participantAddress ? getContactByAddress(participantAddress) : null;
  const displayName = contact?.name || (participantAddress ? `${participantAddress.slice(0, 6)}...${participantAddress.slice(-4)}` : 'Unknown');
  const isOnline = participantAddress ? onlineUsers[participantAddress]?.isOnline : false;
  const isTyping = conversationId ? (typingUsers[conversationId] || []).some(addr => addr !== address) : false;

  // Load messages when component mounts or conversation changes
  useEffect(() => {
    if (conversationId) {
      const conversationMessages = getConversationMessages(conversationId);
      setMessages(conversationMessages);
      
      // Mark conversation as read
      markConversationAsRead(conversationId);
    }
  }, [conversationId, getConversationMessages, markConversationAsRead]);

  // Set up navigation header
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerContactName}>{displayName}</Text>
          <Text style={styles.headerStatus}>
            {isOnline ? 'Online' : 'Last seen recently'}
          </Text>
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerActionButton} 
            onPress={() => handleCall('voice')}
          >
            <MaterialCommunityIcons name="phone" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerActionButton} 
            onPress={() => handleCall('video')}
          >
            <MaterialCommunityIcons name="video" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, displayName, isOnline]);

  // Handle typing indicators
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

  const handleSendMessage = async () => {
    if (!message.trim() || !participantAddress) return;

    try {
      await sendMessage(participantAddress, message.trim());
      setMessage("");
      
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const handleCall = (type: 'voice' | 'video') => {
    if (!participantAddress) return;
    
    Alert.alert(
      `${type === 'voice' ? 'Voice' : 'Video'} Call`,
      `Call ${displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Call", 
          onPress: () => initiateCall(participantAddress, type)
        }
      ]
    );
  };

  const handleImagePicker = () => {
    Alert.alert(
      "Select Image",
      "Choose how you want to select an image",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Camera", onPress: () => pickImage('camera') },
        { text: "Gallery", onPress: () => pickImage('gallery') }
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    if (!participantAddress) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to send images.');
        return;
      }

      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        setIsUploading(true);
        await sendImage(participantAddress, result.assets[0].uri);
        setIsUploading(false);
      }
    } catch (error) {
      setIsUploading(false);
      Alert.alert("Error", "Failed to send image. Please try again.");
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant microphone permissions to send voice messages.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recording || !participantAddress) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        const status = await recording.getStatusAsync();
        const duration = status.isLoaded ? Math.floor((status.durationMillis || 0) / 1000) : 0;
        await sendVoiceMessage(participantAddress, uri, duration);
      }
      
      setRecording(null);
    } catch (error) {
      Alert.alert("Error", "Failed to send voice message. Please try again.");
      setRecording(null);
    }
  };

  const renderMessage = ({ item }: { item: CommunicationMessage }) => {
    const fromSelf = item.fromAddress === address;
    const timestamp = new Date(item.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const renderMessageContent = () => {
      switch (item.type) {
        case 'image':
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
                <Text style={[styles.messageText, { color: fromSelf ? "white" : colors.text }]}>
                  {item.text}
                </Text>
              )}
            </View>
          );
        
        case 'voice':
          return (
            <View style={styles.voiceMessageContainer}>
              <MaterialCommunityIcons 
                name="play" 
                size={20} 
                color={fromSelf ? "white" : colors.primary} 
              />
              <Text style={[styles.voiceDuration, { color: fromSelf ? "white" : colors.text }]}>
                {item.metadata?.voiceDuration ? `${item.metadata.voiceDuration}s` : 'Voice message'}
              </Text>
            </View>
          );
        
        case 'file':
          return (
            <View style={styles.fileMessageContainer}>
              <MaterialCommunityIcons 
                name="file" 
                size={20} 
                color={fromSelf ? "white" : colors.primary} 
              />
              <View>
                <Text style={[styles.fileName, { color: fromSelf ? "white" : colors.text }]}>
                  {item.metadata?.fileName || 'File'}
                </Text>
                {item.metadata?.fileSize && (
                  <Text style={[styles.fileSize, { color: fromSelf ? "rgba(255,255,255,0.7)" : colors.textSecondary }]}>
                    {formatFileSize(item.metadata.fileSize)}
                  </Text>
                )}
              </View>
            </View>
          );
        
        case 'payment':
          return (
            <View style={styles.paymentMessageContainer}>
              <MaterialCommunityIcons 
                name="currency-usd" 
                size={20} 
                color={fromSelf ? "white" : colors.primary} 
              />
              <View>
                <Text style={[styles.paymentAmount, { color: fromSelf ? "white" : colors.text }]}>
                  {item.metadata?.paymentAmount} {item.metadata?.paymentToken}
                </Text>
                <Text style={[styles.paymentLabel, { color: fromSelf ? "rgba(255,255,255,0.7)" : colors.textSecondary }]}>
                  Payment {fromSelf ? 'sent' : 'received'}
                </Text>
              </View>
            </View>
          );
        
        default:
          return (
            <Text style={[styles.messageText, { color: fromSelf ? "white" : colors.text }]}>
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
                name={
                  item.status === "sending"
                    ? "clock-outline"
                    : item.status === "sent"
                    ? "check"
                    : item.status === "delivered"
                    ? "check-all"
                    : "check-all"
                }
                size={14}
                color={
                  item.status === "read" ? "#4CAF50" : "rgba(255,255,255,0.7)"
                }
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            <View style={[styles.typingDot, { animationDelay: "0ms" }]} />
            <View style={[styles.typingDot, { animationDelay: "150ms" }]} />
            <View style={[styles.typingDot, { animationDelay: "300ms" }]} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.avatarContainer}>
              <View
                style={[styles.avatar, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.avatarText}>{contactName.charAt(0)}</Text>
              </View>
              {isOnline && <View style={styles.onlineIndicator} />}
            </View>

            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{contactName}</Text>
              <Text style={styles.contactStatus}>
                {isOnline ? "Online" : "Last seen recently"}
              </Text>
              <Text style={styles.walletAddress} numberOfLines={1}>
                {walletAddress}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton}>
              <MaterialCommunityIcons
                name="phone"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton}>
              <MaterialCommunityIcons
                name="video"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton}>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderTypingIndicator}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachButton}>
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
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                <MaterialCommunityIcons name="send" size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.voiceButton}>
                <MaterialCommunityIcons
                  name="microphone"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "white",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  contactStatus: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 2,
  },
  walletAddress: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  headerActionButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background,
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
    alignItems: "flex-end",
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 20,
    marginRight: spacing.sm,
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
  paymentMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  paymentLabel: {
    fontSize: 12,
  },
  // Typing indicator styles
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
});
