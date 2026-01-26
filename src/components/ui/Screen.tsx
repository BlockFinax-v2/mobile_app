import { palette } from "@/theme/colors";
import React from "react";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  RefreshControlProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps {
  children: React.ReactNode;
  backgroundColor?: string;
  padded?: boolean;
  preset?: "fixed" | "scroll";
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  backgroundColor = palette.surface,
  padded = true,
  preset = "fixed",
  refreshControl,
}) => {
  const contentContainerStyle = padded ? styles.padded : undefined;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      {preset === "scroll" ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={contentContainerStyle}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.container, padded && styles.padded]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.select({
      android: StatusBar.currentHeight ?? 0,
      default: 0,
    }),
  },
  container: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});
