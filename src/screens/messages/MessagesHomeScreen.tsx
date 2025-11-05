import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Contact {
  id: string;
  name: string;
  walletAddress: string;
  notes?: string;
}

interface Conversation {
  id: string;
  contact: Contact;
  lastMessage: string;
  timestamp: string;
  unread: number;
  isOnline?: boolean;
}

const mockContacts: Contact[] = [
  {
    id: "c1",
    name: "Ahmed Khan",
    walletAddress: "0x742d35Cc6645C0532b4abE4b4CdeF83eB7a7e5D7",
    notes: "Regular trade partner - Electronics supplier",
  },
  {
    id: "c2",
    name: "Lagos Commodities Ltd",
    walletAddress: "0x8ba1f109551bD432803012645Hac136c9.jpg",
    notes: "Agricultural commodities trading",
  },
  {
    id: "c3",
    name: "Arbitration Desk",
    walletAddress: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    notes: "Dispute resolution service",
  },
];

const conversations: Conversation[] = [
  {
    id: "conv-1",
    contact: mockContacts[0],
    lastMessage: "Invoice has been paid successfully",
    timestamp: "2h",
    unread: 2,
    isOnline: true,
  },
  {
    id: "conv-2",
    contact: mockContacts[1],
    lastMessage: "Awaiting shipment confirmation from your end",
    timestamp: "6h",
    unread: 0,
    isOnline: false,
  },
  {
    id: "conv-3",
    contact: mockContacts[2],
    lastMessage: "Please provide delivery receipts for review",
    timestamp: "1d",
    unread: 1,
    isOnline: true,
  },
];

export const MessagesHomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"messages" | "calls">("messages");
  const [showContactModal, setShowContactModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [newContact, setNewContact] = useState({
    name: "",
    walletAddress: "",
    notes: "",
  });
  const [newChatAddress, setNewChatAddress] = useState("");

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddContact = () => {
    if (!newContact.name || !newContact.walletAddress) {
      Alert.alert("Error", "Please fill in name and wallet address");
      return;
    }

    const contact: Contact = {
      id: `c${contacts.length + 1}`,
      name: newContact.name,
      walletAddress: newContact.walletAddress,
      notes: newContact.notes,
    };

    setContacts([...contacts, contact]);
    setNewContact({ name: "", walletAddress: "", notes: "" });
    setShowAddContactModal(false);
    Alert.alert("Success", "Contact added successfully");
  };

  const handleStartNewChat = () => {
    if (!newChatAddress) {
      Alert.alert("Error", "Please enter a wallet address");
      return;
    }

    // Navigate to chat screen with the address
    setShowNewChatModal(false);
    setNewChatAddress("");
    Alert.alert("Success", "Starting new conversation");
  };

  const renderMessageItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity style={styles.conversationItem}>
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {item.contact.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.contactName}>{item.contact.name}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>

      {item.unread > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity style={styles.contactItem}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactContent}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactAddress} numberOfLines={1}>
          {item.walletAddress}
        </Text>
        {item.notes && (
          <Text style={styles.contactNotes} numberOfLines={1}>
            {item.notes}
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.chatButton}>
        <MaterialCommunityIcons
          name="message-text"
          size={20}
          color={colors.primary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>BlockFinaX Chat</Text>
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
                  keyExtractor={(item) => item.id}
                  renderItem={renderMessageItem}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                />
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="message-text-outline"
                    size={64}
                    color={colors.textSecondary + "40"}
                  />
                  <Text style={styles.emptyTitle}>No conversations yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Start a new conversation to begin messaging
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
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="phone-outline"
                  size={64}
                  color={colors.textSecondary + "40"}
                />
                <Text style={styles.emptyTitle}>No call history</Text>
                <Text style={styles.emptySubtitle}>
                  Start a voice or video call with your contacts
                </Text>
              </View>
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
                keyExtractor={(item) => item.id}
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
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
  lastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
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
  contactNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  chatButton: {
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
});
