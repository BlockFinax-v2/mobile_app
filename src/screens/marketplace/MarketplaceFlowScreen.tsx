import React, { useState } from "react";
import { ContractUploadStep } from "./steps/ContractUploadStep";
import { InvoiceHandlingStep } from "./steps/InvoiceHandlingStep";
import { StakingStep } from "./steps/StakingStep";
import { PaymentStep } from "./steps/PaymentStep";
import { ReceiptStep } from "./steps/ReceiptStep";
import { ConfirmationStep } from "./steps/ConfirmationStep";
import { WalletStackParamList } from "@/navigation/types";
import {
  RouteProp as NavigationRouteProp,
  useRoute,
} from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

type MarketplaceFlowParams = {
  action: "buy" | "sell";
  step: number;
};

type NavigationProp = StackNavigationProp<
  WalletStackParamList,
  "MarketplaceFlow"
>;
type RouteProps = NavigationRouteProp<WalletStackParamList, "MarketplaceFlow">;

interface MarketplaceData {
  action: "buy" | "sell";
  contractFile?: any;
  invoiceData?: any;
  agreedAmount?: string;
  stakeAmount?: string;
  paymentAmount?: string;
  paymentHash?: string;
  receiptGenerated?: boolean;
  productReceived?: boolean;
}

export const MarketplaceFlowScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const { action, step: initialStep } = route.params;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [marketplaceData, setMarketplaceData] = useState<MarketplaceData>({
    action,
  });

  const updateData = (newData: Partial<MarketplaceData>) => {
    setMarketplaceData((prev) => ({ ...prev, ...newData }));
  };

  const nextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ContractUploadStep
            data={marketplaceData}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 2:
        return (
          <InvoiceHandlingStep
            data={marketplaceData}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <StakingStep
            data={marketplaceData}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <PaymentStep
            data={marketplaceData}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 5:
        return (
          <ReceiptStep
            data={marketplaceData}
            updateData={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 6:
        return (
          <ConfirmationStep
            data={marketplaceData}
            updateData={updateData}
            onNext={() => navigation.navigate("WalletHome")}
            onBack={prevStep}
          />
        );
      default:
        return null;
    }
  };

  return renderStep();
};
