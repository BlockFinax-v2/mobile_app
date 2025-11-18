import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { progressStyles, colors, spacing } from "@/theme";

interface ProgressStep {
  id: string | number;
  label: string;
  status: "completed" | "current" | "pending";
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep?: number;
  orientation?: "horizontal" | "vertical";
  showLabels?: boolean;
  size?: "small" | "medium" | "large";
}

/**
 * Reusable progress indicator component
 * Replaces the progress indicator logic found in TradeFinanceScreen and other places
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  orientation = "horizontal",
  showLabels = true,
  size = "medium",
}) => {
  const circleSize = size === "small" ? 24 : size === "large" ? 40 : 32;
  const lineThickness = size === "small" ? 1 : size === "large" ? 3 : 2;

  const getStepStatus = (
    step: ProgressStep,
    index: number
  ): "completed" | "current" | "pending" => {
    if (currentStep !== undefined) {
      if (index < currentStep) return "completed";
      if (index === currentStep) return "current";
      return "pending";
    }
    return step.status;
  };

  const getStepColor = (status: "completed" | "current" | "pending") => {
    switch (status) {
      case "completed":
        return colors.success;
      case "current":
        return colors.primary;
      case "pending":
      default:
        return colors.border;
    }
  };

  const renderStep = (step: ProgressStep, index: number) => {
    const status = getStepStatus(step, index);
    const stepColor = getStepColor(status);
    const isCompleted = status === "completed";
    const isCurrent = status === "current";

    return (
      <View
        key={step.id}
        style={[
          progressStyles.step,
          orientation === "vertical" && {
            flexDirection: "row",
            alignItems: "center",
          },
        ]}
      >
        <View
          style={[
            progressStyles.circle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              backgroundColor: stepColor,
              borderWidth: isCurrent ? 2 : 0,
              borderColor: isCurrent ? stepColor : "transparent",
            },
          ]}
        >
          {isCompleted ? (
            <MaterialCommunityIcons
              name="check"
              size={size === "small" ? 12 : size === "large" ? 20 : 16}
              color="white"
            />
          ) : (
            <Text
              style={[
                progressStyles.stepNumber,
                {
                  color: isCurrent || isCompleted ? "white" : colors.text,
                  fontSize: size === "small" ? 10 : size === "large" ? 16 : 12,
                },
              ]}
            >
              {index + 1}
            </Text>
          )}
        </View>

        {showLabels && (
          <Text
            style={[
              progressStyles.stepLabel,
              {
                color: isCurrent ? colors.text : colors.textSecondary,
                fontWeight: isCurrent ? "600" : "400",
                fontSize: size === "small" ? 10 : size === "large" ? 14 : 12,
              },
              orientation === "vertical" && {
                marginLeft: spacing.sm,
                marginTop: 0,
              },
            ]}
          >
            {step.label}
          </Text>
        )}
      </View>
    );
  };

  const renderConnector = (index: number) => {
    if (index === steps.length - 1) return null;

    const currentStatus = getStepStatus(steps[index], index);
    const isCompleted = currentStatus === "completed";

    return (
      <View
        style={[
          progressStyles.line,
          {
            backgroundColor: isCompleted ? colors.success : colors.border,
            height: orientation === "horizontal" ? lineThickness : spacing.lg,
            width: orientation === "horizontal" ? undefined : lineThickness,
          },
          orientation === "vertical" && {
            marginLeft: circleSize / 2 - lineThickness / 2,
            marginVertical: spacing.xs,
          },
        ]}
      />
    );
  };

  return (
    <View style={progressStyles.container}>
      <View
        style={[
          progressStyles.steps,
          orientation === "vertical" && {
            flexDirection: "column",
            alignItems: "flex-start",
          },
        ]}
      >
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {renderStep(step, index)}
            {renderConnector(index)}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};
