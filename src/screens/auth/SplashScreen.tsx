import { Text } from "@/components/ui/Text";
import { gradients, palette } from "@/theme/colors";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface SplashScreenProps {
  onReady?: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onReady,
  duration = 2500,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onReady) {
        const timeout = setTimeout(onReady, duration);
        return () => clearTimeout(timeout);
      }
      return undefined;
    });
  }, [duration, onReady, opacityAnim, scaleAnim]);

  const dotScales = React.useMemo(
    () => [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)],
    []
  );

  useEffect(() => {
    const animations = dotScales.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(dot, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      )
    );

    animations.forEach((anim) => anim.start());
    return () => animations.forEach((anim) => anim.stop());
  }, [dotScales]);

  return (
    <LinearGradient colors={gradients.splash} style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        ]}
      >
        <View style={styles.logoCircle}>
          <Text variant="title" color={palette.white}>
            BF
          </Text>
        </View>
        <Text
          variant="display"
          color={palette.white}
          style={styles.brandName}
          accessibilityRole="header"
        >
          BlockFinaX
        </Text>
        <View style={styles.dotsRow}>
          {dotScales.map((dot, index) => (
            <Animated.View
              key={`dot-${index}`}
              style={[
                styles.dot,
                {
                  transform: [
                    {
                      scale: dot.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                  opacity: dot,
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    gap: 16,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.primaryBlue,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: palette.white,
  },
  brandName: {
    letterSpacing: 2,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.white,
  },
});
