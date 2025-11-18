import React from "react";
import { View, Text } from "react-native";
import { statusStyles, textStyles, getStatusColor } from "@/theme";

export type StatusType =
  | "success"
  | "pending"
  | "error"
  | "active"
  | "completed"
  | "rejected"
  | "verified"
  | "draft"
  | "inactive";

interface StatusBadgeProps {
  status: string;
  size?: "small" | "medium" | "large";
  variant?: "badge" | "dot" | "text";
  customColor?: string;
}

/**
 * Reusable status badge component
 * Replaces all the individual status badge implementations across screens
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "medium",
  variant = "badge",
  customColor,
}) => {
  const statusColor = customColor || getStatusColor(status);
  const backgroundColor = statusColor + "20";

  if (variant === "dot") {
    return (
      <View
        style={[
          statusStyles.dot,
          { backgroundColor: statusColor },
          size === "small" && { width: 8, height: 8, borderRadius: 4 },
          size === "large" && { width: 16, height: 16, borderRadius: 8 },
        ]}
      />
    );
  }

  if (variant === "text") {
    return (
      <Text
        style={[
          textStyles.detailValue,
          { color: statusColor },
          size === "small" && { fontSize: 10 },
          size === "large" && { fontSize: 16 },
        ]}
      >
        {status}
      </Text>
    );
  }

  return (
    <View
      style={[
        statusStyles.badge,
        { backgroundColor },
        size === "small" && {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 12,
        },
        size === "large" && {
          paddingHorizontal: 20,
          paddingVertical: 8,
          borderRadius: 20,
        },
      ]}
    >
      <Text
        style={[
          statusStyles.successText,
          { color: statusColor },
          size === "small" && { fontSize: 10 },
          size === "large" && { fontSize: 14 },
        ]}
      >
        {status}
      </Text>
    </View>
  );
};
