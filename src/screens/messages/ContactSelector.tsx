import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Screen } from "@/components/ui/Screen";
import { useCommunication, Contact } from "@/contexts/CommunicationContext";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { MessagesStackParamList } from "@/navigation/types";
import { StackNavigationProp } from "@react-navigation/stack";

type ContactSelectorRouteProp = RouteProp<
  MessagesStackParamList,
  "ContactSelector"
>;
type ContactSelectorNavigationProp = StackNavigationProp<
  MessagesStackParamList,
  "ContactSelector"
>;

export const ContactSelector: React.FC = () => {
  const route = useRoute<ContactSelectorRouteProp>();
  const navigation = useNavigation<ContactSelectorNavigationProp>();
  const { callType } = route.params;
  const { contacts, conversations, initiateCall } = useCommunication();
  const [searchQuery, setSearchQuery] = useState("");

  // Combine contacts from conversations and address book
  const allContacts = useMemo(() => {
    const contactMap = new Map<string, Contact>();

    // Add known contacts first
    contacts.forEach((contact) => {
      contactMap.set(contact.address, contact);
    });

    // Add contacts from conversations
    conversations.forEach((conversation) => {
      // Get the other participant (not current user)
      const otherParticipant = conversation.participants.find(
        (p) => p !== "current_user_address"
      );
      if (otherParticipant && !contactMap.has(otherParticipant)) {
        contactMap.set(otherParticipant, {
          id: conversation.id,
          walletAddress: otherParticipant,
          address: otherParticipant, // Alias for walletAddress
          name: conversation.groupName || `User ${otherParticipant.slice(-4)}`,
          lastSeen: new Date(),
        });
      }
    });

    return Array.from(contactMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [contacts, conversations]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return allContacts;

    return allContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allContacts, searchQuery]);

  const handleContactPress = async (contact: Contact) => {
    Alert.alert(
      `${callType === "voice" ? "Voice" : "Video"} Call`,
      `Call ${contact.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call",
          onPress: async () => {
            // Navigate to ActiveCallScreen first
            navigation.navigate("ActiveCallScreen", {
              callData: {
                callId: `call_${Date.now()}`,
                participantAddress: contact.address,
                participantName: contact.name,
                callType: callType,
                isIncoming: false,
                status: "connecting",
              },
              localStream: null,
              remoteStream: null,
            });

            // Then initiate the actual call
            try {
              await initiateCall(contact.address, callType);
            } catch (error) {
              console.error("Failed to initiate call:", error);
            }
          },
        },
      ]
    );
  };

  const renderContactItem = ({ item: contact }: { item: Contact }) => {
    const initials = contact.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleContactPress(contact)}
        activeOpacity={0.7}
      >
        <View style={styles.contactLeft}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: getAvatarColor(contact.address) },
            ]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactAddress} numberOfLines={1}>
              {formatAddress(contact.address)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => handleContactPress(contact)}
        >
          <MaterialCommunityIcons
            name={callType === "voice" ? "phone" : "video"}
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Contacts List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.address}
        renderItem={renderContactItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="account-outline"
              size={64}
              color={colors.textSecondary + "40"}
            />
            <Text style={styles.emptyTitle}>
              {searchQuery ? "No contacts found" : "No contacts yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Try a different search term"
                : "Start a conversation to add contacts"}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const getAvatarColor = (address: string): string => {
  const colors_list = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
  ];

  const hash = address
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors_list[hash % colors_list.length];
};

const formatAddress = (address: string): string => {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 25,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  clearButton: {
    padding: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
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
  contactLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
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
  contactAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  callButton: {
    padding: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
});
