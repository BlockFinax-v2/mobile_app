/**
 * Skeleton Loader Components
 * Provides beautiful loading placeholders while data is being fetched
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Skeleton
            width="60%"
            height={20}
            style={{ marginBottom: spacing.sm }}
          />
          <Skeleton width="40%" height={16} />
        </View>
      </View>
      <View style={styles.cardContent}>
        <Skeleton
          width="100%"
          height={60}
          style={{ marginBottom: spacing.md }}
        />
        <Skeleton
          width="100%"
          height={60}
          style={{ marginBottom: spacing.md }}
        />
        <Skeleton width="100%" height={40} />
      </View>
    </View>
  );
};

export const SkeletonStatsGrid: React.FC = () => {
  return (
    <View style={styles.statsGrid}>
      <View style={styles.statBox}>
        <Skeleton
          width="60%"
          height={14}
          style={{ marginBottom: spacing.sm }}
        />
        <Skeleton width="80%" height={24} />
      </View>
      <View style={styles.statBox}>
        <Skeleton
          width="60%"
          height={14}
          style={{ marginBottom: spacing.sm }}
        />
        <Skeleton width="80%" height={24} />
      </View>
      <View style={styles.statBox}>
        <Skeleton
          width="60%"
          height={14}
          style={{ marginBottom: spacing.sm }}
        />
        <Skeleton width="80%" height={24} />
      </View>
    </View>
  );
};

export const SkeletonProposalCard: React.FC = () => {
  return (
    <View style={styles.proposalCard}>
      <View style={styles.proposalHeader}>
        <Skeleton width={80} height={24} borderRadius={12} />
        <Skeleton width={60} height={24} borderRadius={12} />
      </View>
      <Skeleton width="90%" height={20} style={{ marginBottom: spacing.sm }} />
      <Skeleton width="100%" height={16} style={{ marginBottom: spacing.xs }} />
      <Skeleton width="95%" height={16} style={{ marginBottom: spacing.lg }} />
      <Skeleton
        width="100%"
        height={8}
        borderRadius={4}
        style={{ marginBottom: spacing.md }}
      />
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Skeleton width="48%" height={40} borderRadius={8} />
        <Skeleton width="48%" height={40} borderRadius={8} />
      </View>
    </View>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonProposalCard key={index} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.border,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  cardContent: {
    paddingTop: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  proposalCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  proposalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
});
