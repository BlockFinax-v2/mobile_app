import { palette } from "@/theme/colors";
import { typography } from "@/theme/typography";
import React from "react";
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
} from "react-native";

type Variant = "display" | "title" | "subtitle" | "body" | "small";

interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
}

export const Text: React.FC<TextProps> = ({
  variant = "body",
  color = palette.neutralDark,
  style,
  ...rest
}) => {
  return <RNText style={[styles[variant], { color }, style]} {...rest} />;
};

const styles = StyleSheet.create({
  display: typography.display,
  title: typography.title,
  subtitle: typography.subtitle,
  body: typography.body,
  small: typography.small,
});
