import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import {
  useCommunication,
  Contact,
  Conversation,
  CallInfo,
} from "@/contexts/CommunicationContext";
import { useWallet } from "@/contexts/WalletContext";
import { MessagesStackParamList } from "@/navigation/types";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState, useEffect } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  Image,
} from "react-native";

type MessagesNavigationProp = StackNavigationProp<
  MessagesStackParamList,
  "MessagesHome"
>;

export const MessagesHomeScreen: React.FC = () => {
  const navigation = useNavigation<MessagesNavigationProp>();
  const { address } = useWallet();
  const {
    conversations,
    contacts,
    callHistory,
    onlineUsers,
    isConnected,
    addContact,
    getContactByAddress,
    getOrCreateConversation,
    initiateCall,
    activeCall,
  } = useCommunication();

  const [activeTab, setActiveTab] = useState<"messages" | "calls">("messages");
  const [showContactModal, setShowContactModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    walletAddress: "",
    notes: "",
  });
  const [newChatAddress, setNewChatAddress] = useState("");

  // Utility functions
  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getLastMessagePreview = (message: any): string => {
    switch (message.type) {
      case "image":
        return "📷 Image";
      case "voice":
        return "🎤 Voice message";
      case "file":
        return `📄 ${message.metadata?.fileName || "File"}`;
      case "payment":
        return `💰 Payment ${message.metadata?.paymentAmount || ""}`;
      default:
        return message.text || "";
    }
  };

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) => {
    const otherParticipant = conv.participants.find((p) => p !== address);
    const contact = otherParticipant
      ? getContactByAddress(otherParticipant)
      : null;
    const displayName = contact?.name || otherParticipant || "";
    const lastMessageText = conv.lastMessage?.text || "";

    return (
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMessageText.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Filter call history based on search query
  const filteredCallHistory = callHistory.filter((call) => {
    const otherParticipant =
      call.fromAddress === address ? call.toAddress : call.fromAddress;
    if (!otherParticipant) return false;
    const contact = getContactByAddress(otherParticipant);
    const displayName = contact?.name || otherParticipant;

    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.walletAddress) {
      Alert.alert("Error", "Please fill in name and wallet address");
      return;
    }

    try {
      await addContact({
        name: newContact.name,
        walletAddress: newContact.walletAddress,
        address: newContact.walletAddress,
        notes: newContact.notes,
      });

      setNewContact({ name: "", walletAddress: "", notes: "" });
      setShowAddContactModal(false);
      Alert.alert("Success", "Contact added successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to add contact. Please try again.");
    }
  };

  const handleStartNewChat = async () => {
    if (!newChatAddress) {
      Alert.alert("Error", "Please enter a wallet address");
      return;
    }

    try {
      const conversationId = await getOrCreateConversation(newChatAddress);
      setShowNewChatModal(false);
      setNewChatAddress("");

      // Navigate to chat screen
      navigation.navigate("Chat", {
        contactAddress: newChatAddress,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to start conversation. Please try again.");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // In a real app, you might want to fetch latest data from server
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderMessageItem = ({ item }: { item: Conversation }) => {
    const otherParticipant = item.participants.find((p) => p !== address);
    const contact = otherParticipant
      ? getContactByAddress(otherParticipant)
      : null;
    const displayName =
      contact?.name ||
      `${otherParticipant?.slice(0, 6)}...${otherParticipant?.slice(-4)}`;
    const isOnline = otherParticipant
      ? onlineUsers[otherParticipant]?.isOnline
      : false;
    const lastMessage = item.lastMessage;
    const timeAgo = lastMessage ? formatTimeAgo(lastMessage.timestamp) : "";

    const handlePress = () => {
      if (otherParticipant) {
        navigation.navigate("Chat", {
          contactAddress: otherParticipant,
        });
      }
    };

    return (
      <TouchableOpacity style={styles.conversationItem} onPress={handlePress}>
        <View style={styles.avatarContainer}>
          {contact?.avatar ? (
            <Image source={{ uri: contact.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.contactName}>{displayName}</Text>
            <Text style={styles.timestamp}>{timeAgo}</Text>
          </View>
          <View style={styles.lastMessageContainer}>
            {lastMessage?.type === "image" && (
              <MaterialCommunityIcons
                name="image"
                size={14}
                color={colors.textSecondary}
                style={{ marginRight: 4 }}
              />
            )}
            {lastMessage?.type === "voice" && (
              <MaterialCommunityIcons
                name="microphone"
                size={14}
                color={colors.textSecondary}
                style={{ marginRight: 4 }}
              />
            )}
            {lastMessage?.type === "file" && (
              <MaterialCommunityIcons
                name="file"
                size={14}
                color={colors.textSecondary}
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={styles.lastMessage} numberOfLines={1}>
              {lastMessage
                ? getLastMessagePreview(lastMessage)
                : "No messages yet"}
            </Text>
          </View>
        </View>

        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderContactItem = ({ item }: { item: Contact }) => {
    const isOnline = onlineUsers[item.walletAddress]?.isOnline;
    const lastSeen = onlineUsers[item.walletAddress]?.lastSeen;

    const handleChatPress = async () => {
      try {
        const conversationId = await getOrCreateConversation(
          item.walletAddress
        );
        navigation.navigate("Chat", {
          contactAddress: item.walletAddress,
        });
        setShowContactModal(false);
      } catch (error) {
        Alert.alert("Error", "Failed to start conversation");
      }
    };

    const handleCallPress = () => {
      Alert.alert("Call Options", `Call ${item.name}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Voice Call",
          onPress: () => initiateCall(item.walletAddress, "voice"),
        },
        {
          text: "Video Call",
          onPress: () => initiateCall(item.walletAddress, "video"),
        },
      ]);
    };

    return (
      <TouchableOpacity style={styles.contactItem}>
        <View style={styles.avatarContainer}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.contactContent}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactAddress} numberOfLines={1}>
            {item.walletAddress}
          </Text>
          <Text style={styles.contactStatus}>
            {isOnline
              ? "Online"
              : lastSeen
              ? `Last seen ${formatTimeAgo(lastSeen)}`
              : "Offline"}
          </Text>
          {item.notes && (
            <Text style={styles.contactNotes} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
        </View>

        <View style={styles.contactActions}>
          <TouchableOpacity style={styles.chatButton} onPress={handleChatPress}>
            <MaterialCommunityIcons
              name="message-text"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.callButton} onPress={handleCallPress}>
            <MaterialCommunityIcons
              name="phone"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCallItem = ({ item }: { item: CallInfo }) => {
    const otherParticipant =
      item.fromAddress === address ? item.toAddress : item.fromAddress;
    if (!otherParticipant) return null;
    const contact = getContactByAddress(otherParticipant);
    const displayName =
      contact?.name ||
      `${otherParticipant.slice(0, 6)}...${otherParticipant.slice(-4)}`;
    const isOutgoing = item.fromAddress === address;
    const timeAgo = formatTimeAgo(item.startTime || new Date());

    const getCallIcon = () => {
      if (item.type === "video") {
        return item.status === "missed" ? "video-off" : "video";
      }
      return item.status === "missed" ? "phone-missed" : "phone";
    };

    const getCallStatusColor = () => {
      switch (item.status) {
        case "missed":
          return colors.error;
        case "rejected":
          return colors.error;
        case "ended":
          return colors.textSecondary;
        default:
          return colors.primary;
      }
    };

    const handleCallBack = () => {
      Alert.alert("Call Back", `Call ${displayName}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Voice Call",
          onPress: () =>
            otherParticipant && initiateCall(otherParticipant, "voice"),
        },
        {
          text: "Video Call",
          onPress: () =>
            otherParticipant && initiateCall(otherParticipant, "video"),
        },
      ]);
    };

    return (
      <TouchableOpacity style={styles.callItem} onPress={handleCallBack}>
        <View style={styles.avatarContainer}>
          {contact?.avatar ? (
            <Image source={{ uri: contact.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.callContent}>
          <Text style={styles.contactName}>{displayName}</Text>
          <View style={styles.callInfo}>
            <MaterialCommunityIcons
              name={isOutgoing ? "call-made" : "call-received"}
              size={14}
              color={getCallStatusColor()}
            />
            <Text style={[styles.callStatus, { color: getCallStatusColor() }]}>
              {isOutgoing ? "Outgoing" : "Incoming"} • {item.status}
            </Text>
            {item.duration && (
              <Text style={styles.callDuration}>
                • {Math.floor(item.duration / 60)}:
                {(item.duration % 60).toString().padStart(2, "0")}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.callActions}>
          <Text style={styles.timestamp}>{timeAgo}</Text>
          <TouchableOpacity
            style={styles.callBackButton}
            onPress={handleCallBack}
          >
            <MaterialCommunityIcons
              name={getCallIcon()}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>BlockFinaX Chat</Text>
              <View
                style={[
                  styles.connectionStatus,
                  { backgroundColor: isConnected ? "#4CAF50" : "#F44336" },
                ]}
              >
                <Text style={styles.connectionText}>
                  {isConnected ? "Online" : "Offline"}
                </Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowContactModal(true)}
              >
                <MaterialCommunityIcons
                  name="account-group"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <MaterialCommunityIcons
                  name="cog"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "messages" && styles.activeTab]}
              onPress={() => setActiveTab("messages")}
            >
              <MaterialCommunityIcons
                name="message-text"
                size={20}
                color={
                  activeTab === "messages"
                    ? colors.primary
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "messages" && styles.activeTabText,
                ]}
              >
                Messages
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "calls" && styles.activeTab]}
              onPress={() => setActiveTab("calls")}
            >
              <MaterialCommunityIcons
                name="phone"
                size={20}
                color={
                  activeTab === "calls" ? colors.primary : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "calls" && styles.activeTabText,
                ]}
              >
                Calls
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === "messages" ? (
            <View style={styles.messagesTab}>
              {filteredConversations.length > 0 ? (
                <FlatList
                  data={filteredConversations}
                  keyExtractor={(item, index) =>
                    `conversation-${item.id}-${index}`
                  }
                  renderItem={renderMessageItem}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      tintColor={colors.primary}
                    />
                  }
                />
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="message-text-outline"
                    size={64}
                    color={colors.textSecondary + "40"}
                  />
                  <Text style={styles.emptyTitle}>
                    {searchQuery
                      ? "No conversations found"
                      : "No conversations yet"}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? "Try a different search term"
                      : "Start a new conversation to begin messaging"}
                  </Text>
                </View>
              )}

              {/* New Chat Button */}
              <TouchableOpacity
                style={styles.newChatButton}
                onPress={() => setShowNewChatModal(true)}
              >
                <MaterialCommunityIcons name="plus" size={24} color="white" />
                <Text style={styles.newChatText}>New Chat</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.callsTab}>
              {filteredCallHistory.length > 0 ? (
                <FlatList
                  data={filteredCallHistory}
                  keyExtractor={(item, index) => `call-${item.id}-${index}`}
                  renderItem={renderCallItem}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      tintColor={colors.primary}
                    />
                  }
                />
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="phone-outline"
                    size={64}
                    color={colors.textSecondary + "40"}
                  />
                  <Text style={styles.emptyTitle}>
                    {searchQuery ? "No calls found" : "No call history"}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? "Try a different search term"
                      : "Start a voice or video call with your contacts"}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Contact Management Modal */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Contact Management</Text>
            <TouchableOpacity onPress={() => setShowContactModal(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.addressBookHeader}>
              <View style={styles.addressBookTitleContainer}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.addressBookTitle}>Address Book</Text>
                <View style={styles.contactCount}>
                  <Text style={styles.contactCountText}>{contacts.length}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.addContactButton}
                onPress={() => setShowAddContactModal(true)}
              >
                <MaterialCommunityIcons name="plus" size={16} color="white" />
                <Text style={styles.addContactText}>Add Contact</Text>
              </TouchableOpacity>
            </View>

            {contacts.length > 0 ? (
              <FlatList
                data={contacts}
                keyExtractor={(item, index) => `contact-${item.id}-${index}`}
                renderItem={renderContactItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contactsList}
              />
            ) : (
              <View style={styles.emptyContactsState}>
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={48}
                  color={colors.textSecondary + "40"}
                />
                <Text style={styles.emptyContactsTitle}>
                  No contacts added yet
                </Text>
                <Text style={styles.emptyContactsSubtitle}>
                  Add contacts to easily identify wallet addresses in your
                  conversations
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Contact Modal */}
      <Modal
        visible={showAddContactModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.overlayModal}>
          <View style={styles.addContactModal}>
            <View style={styles.addContactHeader}>
              <Text style={styles.addContactTitle}>Add New Contact</Text>
              <TouchableOpacity onPress={() => setShowAddContactModal(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.addContactForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Contact Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter contact name"
                  value={newContact.name}
                  onChangeText={(text) =>
                    setNewContact({ ...newContact, name: text })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Wallet Address</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="0x..."
                  value={newContact.walletAddress}
                  onChangeText={(text) =>
                    setNewContact({ ...newContact, walletAddress: text })
                  }
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Add notes about this contact"
                  value={newContact.notes}
                  onChangeText={(text) =>
                    setNewContact({ ...newContact, notes: text })
                  }
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddContactModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddContact}
                >
                  <Text style={styles.addButtonText}>Add Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Chat Modal */}
      <Modal
        visible={showNewChatModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.newChatModalContainer}>
          <View style={styles.newChatModal}>
            <View style={styles.newChatHeader}>
              <Text style={styles.newChatTitle}>Start New Conversation</Text>
              <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.newChatForm}>
              <TextInput
                style={styles.newChatInput}
                placeholder="Enter wallet address (0x...)"
                value={newChatAddress}
                onChangeText={setNewChatAddress}
                autoCapitalize="none"
              />

              <View style={styles.newChatActions}>
                <TouchableOpacity
                  style={styles.startChatButton}
                  onPress={handleStartNewChat}
                >
                  <MaterialCommunityIcons
                    name="account-plus"
                    size={20}
                    color="white"
                  />
                  <Text style={styles.startChatText}>Start Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelChatButton}
                  onPress={() => setShowNewChatModal(false)}
                >
                  <Text style={styles.cancelChatText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: "white",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  connectionStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  tabContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  activeTab: {
    backgroundColor: colors.primary + "20",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  messagesTab: {
    flex: 1,
  },
  callsTab: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarContainer: {
    position: "relative",
    marginRight: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "white",
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  lastMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.sm,
  },
  unreadText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  newChatButton: {
    position: "absolute",
    bottom: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 25,
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  newChatText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  addressBookHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  addressBookTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  addressBookTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  contactCount: {
    backgroundColor: colors.primary + "20",
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  contactCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  addContactButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  addContactText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  contactsList: {
    paddingBottom: spacing.xl,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  contactAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: "monospace",
    marginTop: spacing.xs,
  },
  contactStatus: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
    fontWeight: "500",
  },
  contactNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  contactActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  chatButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary + "20",
  },
  callButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary + "20",
  },
  emptyContactsState: {
    alignItems: "center",
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyContactsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyContactsSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  overlayModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  addContactModal: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  addContactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addContactTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  addContactForm: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    backgroundColor: "white",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  formActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  addButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  newChatModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  newChatModal: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl,
  },
  newChatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  newChatTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  newChatForm: {
    padding: spacing.lg,
  },
  newChatInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: "white",
    marginBottom: spacing.lg,
  },
  newChatActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  startChatButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  startChatText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  cancelChatButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelChatText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  // Call styles
  callItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  callContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  callInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 2,
  },
  callStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  callDuration: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  callActions: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  callBackButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary + "20",
  },
});
