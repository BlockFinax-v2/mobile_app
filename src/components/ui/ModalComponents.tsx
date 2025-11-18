import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { modalStyles, colors, spacing } from "@/theme";

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  leftAction?: {
    icon: string;
    onPress: () => void;
  };
}

/**
 * Reusable modal header component
 */
export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  onClose,
  showCloseButton = true,
  leftAction,
}) => {
  return (
    <View style={modalStyles.header}>
      {leftAction && (
        <TouchableOpacity onPress={leftAction.onPress}>
          <MaterialCommunityIcons
            name={leftAction.icon as any}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      )}

      <View
        style={{ flex: 1, alignItems: leftAction ? "center" : "flex-start" }}
      >
        <Text style={modalStyles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[modalStyles.subtitle, { marginBottom: 0, fontSize: 14 }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {showCloseButton && onClose && (
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

interface ModalContentProps {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: any;
}

/**
 * Reusable modal content component
 */
export const ModalContent: React.FC<ModalContentProps> = ({
  children,
  scrollable = true,
  contentContainerStyle,
}) => {
  if (scrollable) {
    return (
      <ScrollView
        style={modalStyles.content}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[modalStyles.content, contentContainerStyle]}>{children}</View>
  );
};

interface ModalFooterProps {
  children: React.ReactNode;
  variant?: "default" | "split";
}

/**
 * Reusable modal footer component
 */
export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  variant = "default",
}) => {
  return (
    <View
      style={[
        modalStyles.footer,
        variant === "split" && {
          flexDirection: "row",
          justifyContent: "space-between",
          gap: spacing.md,
        },
      ]}
    >
      {children}
    </View>
  );
};

interface ModalActionsProps {
  primaryAction?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    variant?: "primary" | "success" | "error";
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
  layout?: "horizontal" | "vertical";
}

/**
 * Standard modal actions (Cancel/Submit buttons)
 */
export const ModalActions: React.FC<ModalActionsProps> = ({
  primaryAction,
  secondaryAction,
  layout = "horizontal",
}) => {
  const { Button } = require("@/components/ui/Button");

  return (
    <View
      style={[
        {
          flexDirection: layout === "horizontal" ? "row" : "column",
          gap: spacing.md,
        },
        layout === "horizontal" && { justifyContent: "space-between" },
      ]}
    >
      {secondaryAction && (
        <TouchableOpacity
          onPress={secondaryAction.onPress}
          disabled={secondaryAction.disabled}
          style={[
            {
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
            },
            layout === "horizontal" && { flex: 1 },
          ]}
        >
          <Text style={{ color: colors.text, fontWeight: "500" }}>
            {secondaryAction.label}
          </Text>
        </TouchableOpacity>
      )}

      {primaryAction && (
        <Button
          label={primaryAction.label}
          onPress={primaryAction.onPress}
          loading={primaryAction.loading}
          disabled={primaryAction.disabled}
          variant={primaryAction.variant || "primary"}
          style={layout === "horizontal" && { flex: 1 }}
        />
      )}
    </View>
  );
};
