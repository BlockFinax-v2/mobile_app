/**
 * Performance-optimized animation utilities
 * Reduces animation overhead for better button responsiveness
 */

import { Animated, Easing } from 'react-native';

/**
 * Fast, lightweight scale animation for instant feedback
 */
export const createFastScaleAnimation = (initialValue = 1) => {
  const scaleAnim = new Animated.Value(initialValue);

  const animateIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100, // Very fast
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const animateOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100, // Very fast
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return {
    scaleAnim,
    animateIn,
    animateOut,
    style: {
      transform: [{ scale: scaleAnim }],
    },
  };
};

/**
 * Minimal opacity animation for loading states
 */
export const createFastOpacityAnimation = (initialValue = 1) => {
  const opacityAnim = new Animated.Value(initialValue);

  const fadeIn = () => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const fadeOut = () => {
    Animated.timing(opacityAnim, {
      toValue: 0.3,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return {
    opacityAnim,
    fadeIn,
    fadeOut,
    style: {
      opacity: opacityAnim,
    },
  };
};

/**
 * Performance-optimized loading spinner
 * Uses native driver for smooth 60fps animation
 */
export const createSpinAnimation = () => {
  const spinValue = new Animated.Value(0);

  const spin = () => {
    spinValue.setValue(0);
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const spinStyle = {
    transform: [
      {
        rotate: spinValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  return {
    spin,
    spinStyle,
  };
};

/**
 * Debounced animation helper
 * Prevents animation spam that can cause lag
 */
export class AnimationManager {
  private animationTimeouts: Map<string, NodeJS.Timeout> = new Map();

  debounceAnimation(key: string, animation: () => void, delay: number = 50) {
    const existingTimeout = this.animationTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      animation();
      this.animationTimeouts.delete(key);
    }, delay);

    this.animationTimeouts.set(key, timeout);
  }

  cleanup() {
    this.animationTimeouts.forEach(timeout => clearTimeout(timeout));
    this.animationTimeouts.clear();
  }
}

export const globalAnimationManager = new AnimationManager();