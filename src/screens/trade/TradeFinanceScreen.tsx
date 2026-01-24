import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { colors, palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import {
  useTradeFinance,
  Application,
  DraftCertificate,
} from "@/contexts/TradeFinanceContext";
import {
  useWallet,
  SupportedNetworkId,
  getAllSupportedTokens,
} from "@/contexts/WalletContext";
import { NetworkSelector } from "@/components/ui/NetworkSelector";
import { TokenSelector, TokenInfo } from "@/components/ui/TokenSelector";
import { CompactNetworkTokenSelector } from "@/components/ui/CompactNetworkTokenSelector";
import { StablecoinConfig } from "@/config/stablecoinPrices";
import { TradeStackParamList } from "@/navigation/types";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ToastAndroid,
  Platform,
  Dimensions,
  Pressable,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { PoolGuaranteeApplicationFlow } from "@/components/trade/PoolGuaranteeApplicationFlow";
import { SellerDraftView } from "@/components/trade/SellerDraftView";
import { BuyerApplicationView } from "@/components/trade/BuyerApplicationView";

interface PoolGuaranteeForm {
  companyName: string;
  registrationNumber: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  tradeDescription: string;
  totalTradeValue: string;
  guaranteeAmount: string;
  collateralDescription: string;
  collateralValue: string;
  sellerWalletAddress: string;
  financingDuration: string;
  contractNumber: string;
  contractDate: string;
  proformaInvoice: any;
  salesContract: any;
}

// Application and DraftCertificate interfaces now come from context

type NavigationProp = StackNavigationProp<TradeStackParamList, "TradeFinance">;
type RouteProps = RouteProp<TradeStackParamList, "TradeFinance">;

// Dummy applications data for testing buyer view
const DUMMY_BUYER_APPLICATIONS = [
  {
    id: "app-buyer-1",
    requestId: "PG-1762503009626-PI4MD88",
    guaranteeNo: "PG-1762503009626-PI4MD88",
    applicant: {
      company: "ACME Imports Ltd.",
      registration: "REG-123456",
      country: "United States",
      contact: "Alice Buyer",
      email: "alice@acmeimports.com",
      walletAddress: "0x759ed3d2...fe5e5582a",
    },
    beneficiary: {
      walletAddress: "0xef5bed7c221c85a2c88e3c0223ee45482d6f037d",
      name: "Global Exports Co.",
    },
    tradeDescription: "Import of 1,000 widgets from EU",
    collateralDescription: "Half percent of the goods as collateral",
    guaranteeAmount: "8000.00 USDC",
    collateralValue: "40.00 USDC",
    financingDuration: 90,
    contractNumber: "SC-2025-001",
    paymentDueDate: "12/4/2025",
    status: "Awaiting Seller Approval",
    currentStage: 2, // Draft Sent stage
    issuanceFee: "80.00 USDC (1%)",
    submittedDate: "Jan 16, 2025",
    content: `[BlockFinaX Treasury Pool]\n\nIRREVOCABLE POOL GUARANTEE\n\nGuarantee No: PG-1762503009626-PI4MD88\nDate of Issue: January 16, 2025\n\nWE, BLOCKFINAX TREASURY POOL, hereby irrevocably and unconditionally guarantee payment of up to Eight Thousand United States Dollars (USD 8,000.00) to the Beneficiary named below.\n\nAPPLICANT DETAILS:\nName: ACME Imports Ltd.\nRegistration: REG-123456\nCountry: United States\n\nBENEFICIARY:\nWallet Address: 0xef5bed7c221c85a2c88e3c0223ee45482d6f037d\nName: Global Exports Co.\n\nUNDERLYING TRANSACTION:\nPurpose: Import of 1,000 widgets from EU\nContract Number: SC-2025-001\nTrade Value: USD 8,000.00\n\nThis guarantee is governed by the ICC Uniform Rules for Demand Guarantees (URDG 758) and is valid for 90 days from the date of issue.\n\nAny claim under this guarantee must be submitted in writing with supporting documentation before the expiry date.\n\nTHIS IS A DIGITALLY VERIFIED POOL GUARANTEE\nBlockchain Network: Ethereum Sepolia\nSmart Contract: 0x...\n\nFor BlockFinaX Treasury Pool\n[Digital Signature]`,
    proformaInvoiceIpfs: {
      hash: "QmX7Yn9K2vPqw3ZRt8Hm5kL9Jn4Wp6Vb2Xq1Yz5Tc8Kd3",
      url: "https://gateway.pinata.cloud/ipfs/QmX7Yn9K2vPqw3ZRt8Hm5kL9Jn4Wp6Vb2Xq1Yz5Tc8Kd3",
    },
    salesContractIpfs: {
      hash: "QmP4Bf9N3vLm2Wn6Tp5Vk8Jc7Xr1Hq9Yz4Kd6Mb3Lp2Nq8",
      url: "https://gateway.pinata.cloud/ipfs/QmP4Bf9N3vLm2Wn6Tp5Vk8Jc7Xr1Hq9Yz4Kd6Mb3Lp2Nq8",
    },
  },
  {
    id: "app-buyer-2",
    requestId: "PG-1762504120837-XM9PL22",
    guaranteeNo: "PG-1762504120837-XM9PL22",
    applicant: {
      company: "Tech Supply Inc.",
      registration: "REG-789012",
      country: "Canada",
      contact: "Bob Chen",
      email: "bob@techsupply.ca",
      walletAddress: "0x8a3c5e9d...ab2f7691c",
    },
    beneficiary: {
      walletAddress: "0x2b8f4c7a9d3e6b1f5a8c4d7e2f9b6a3c8e1d4f7b",
      name: "Asian Electronics Ltd.",
    },
    tradeDescription: "Purchase of 500 electronic components",
    collateralDescription: "Electronics inventory as collateral",
    guaranteeAmount: "5000.00 USDC",
    collateralValue: "25.00 USDC",
    financingDuration: 60,
    contractNumber: "SC-2025-002",
    paymentDueDate: "11/28/2025",
    status: "Fee Paid - Awaiting Certificate",
    currentStage: 4, // Fee Paid stage
    issuanceFee: "50.00 USDC (1%)",
    submittedDate: "Jan 10, 2025",
    content: `[BlockFinaX Treasury Pool]\n\nIRREVOCABLE POOL GUARANTEE\n\nGuarantee No: PG-1762504120837-XM9PL22\nDate of Issue: January 10, 2025\n\nWE, BLOCKFINAX TREASURY POOL, hereby irrevocably and unconditionally guarantee payment of up to Five Thousand United States Dollars (USD 5,000.00) to the Beneficiary named below.\n\nAPPLICANT DETAILS:\nName: Tech Supply Inc.\nRegistration: REG-789012\nCountry: Canada\n\nBENEFICIARY:\nWallet Address: 0x2b8f4c7a9d3e6b1f5a8c4d7e2f9b6a3c8e1d4f7b\nName: Asian Electronics Ltd.\n\nUNDERLYING TRANSACTION:\nPurpose: Purchase of 500 electronic components\nContract Number: SC-2025-002\nTrade Value: USD 5,000.00\n\nThis guarantee is governed by the ICC Uniform Rules for Demand Guarantees (URDG 758) and is valid for 60 days from the date of issue.`,
    proformaInvoiceIpfs: {
      hash: "QmT8Zm5L3wQn4Vp7Yk9Jm6Bc2Xd5Np8Lq1Tr4Km7Wp3Hf9",
      url: "https://gateway.pinata.cloud/ipfs/QmT8Zm5L3wQn4Vp7Yk9Jm6Bc2Xd5Np8Lq1Tr4Km7Wp3Hf9",
    },
    salesContractIpfs: {
      hash: "QmR2Hm8N4vKp7Wq3Yd6Lm9Jc5Xn2Bp4Fq8Tr1Km6Np5Lp7",
      url: "https://gateway.pinata.cloud/ipfs/QmR2Hm8N4vKp7Wq3Yd6Lm9Jc5Xn2Bp4Fq8Tr1Km6Np5Lp7",
    },
  },
];

// Dummy draft data for testing seller view
const DUMMY_DRAFTS = [
  {
    id: "draft-1",
    requestId: "PG-1762503009626-PI4MD88",
    guaranteeNo: "PG-1762503009626-PI4MD88",
    applicant: {
      company: "ACME Imports Ltd.",
      registration: "REG-123456",
      country: "United States",
      contact: "Alice Buyer",
      email: "alice@acmeimports.com",
      phone: "+1 234 567 8900",
      walletAddress: "0x759ed3d2...fe5e5582a",
      applicationDate: "Nov 16, 2025",
    },
    beneficiary: {
      walletAddress: "0xef5bed7c221c85a2c88e3c0223ee45482d6f037d",
    },
    tradeDescription: "Import of 1,000 widgets from EU",
    collateralDescription: "Half percent of the goods as collateral",
    guaranteeAmount: "8000.00 USDC",
    collateralValue: "0.40 USDC",
    financingDuration: 90,
    contractNumber: "SC-2025-001",
    paymentDueDate: "12/4/2025",
    status: "SENT TO SELLER",
    currentStage: 2, // Draft Sent stage
    issuanceFee: "80.00 USDC (1%)",
    content: `[BlockFinaX Treasury Pool]

IRREVOCABLE POOL GUARANTEE

═══════════════════════════════════════════════════════════════════════

To: 0xef5bed7c221c85a2c88e3c0223ee45482d6f037d

Date: 2025-11-07

───────────────────────────────────────────────────────────────────────

– TYPE OF GUARANTEE: Performance Guarantee (Goods-as-Collateral Pool Guarantee)
– GUARANTEE NO.: PG-1762503009626-PI4MD88
– THE GUARANTOR: BlockFinaX Treasury Pool
   Pool Contract Address: [Treasury Pool Smart Contract]
   Place of Issue: Base Sepolia Blockchain Network
   Status: DRAFT - Subject to Seller Approval and Fee Payment
   
– THE APPLICANT (Principal/Buyer):
   Company: ACME Imports Ltd.
   Registration: REG-123456
   Country: United States
   Contact: Alice Buyer
   Email: alice@acmeimports.com
   Wallet Address: 0x759ed3d2...fe5e5582a
   
– THE BENEFICIARY (Seller):
   Wallet Address: 0xef5bed7c221c85a2c88e3c0223ee45482d6f037d
   
– TRADE DESCRIPTION:
   Import of 1,000 widgets from EU
   Total Trade Value: 16,000.00 USDC
   Contract Number: SC-2025-001
   
– GUARANTEE AMOUNT: 8,000.00 USDC (50% of trade value)
   
– COLLATERAL:
   Description: Half percent of the goods as collateral
   Estimated Value: 0.40 USDC
   
– FINANCING DURATION: 90 days
   Payment Due Date: 12/4/2025
   
– ISSUANCE FEE: 80.00 USDC (1% of guarantee amount)
   Payable by: Applicant (Buyer)
   Payment Status: PENDING - Due upon seller approval
   
– TERMS & CONDITIONS:
   1. This guarantee becomes effective upon seller approval and buyer fee payment
   2. The guarantee is irrevocable once activated
   3. Payment is guaranteed by the BlockFinaX Treasury Pool
   4. Seller must ship goods within 30 days of certificate issuance
   5. Buyer must confirm delivery within 7 days of receipt
   6. Invoice settlement triggers release of guarantee
   
– RISK & OBLIGATIONS:
   • Buyer pays 30% issuance fee and posts 10% collateral
   • Seller accepts 5% risk exposure and posts 5% collateral
   • Treasury pool covers 60% backed by staked capital
   • All parties protected by smart contract enforcement
   
═══════════════════════════════════════════════════════════════════════

Issued by: BlockFinaX Treasury Pool
Blockchain: Base Sepolia Network
Smart Contract: [Diamond Proxy Address]
Timestamp: 2025-11-07 14:30:15 UTC

This is a legally binding instrument subject to ICC URDG 758 rules.`,
  },
  {
    id: "draft-2",
    requestId: "PG-1763321117688-XYZ123",
    guaranteeNo: "PG-1763321117688-XYZ123",
    applicant: {
      company: "XYZ LTD",
      registration: "REG-789012",
      country: "Nigeria",
      contact: "Bilal",
      email: "bilal@xyzltd.com",
      phone: "+234 123 456 789",
      walletAddress: "0x324ffda4...b9f141",
      applicationDate: "Nov 16, 2025",
    },
    beneficiary: {
      walletAddress: "0xef5bed7c221c85a2c88e3c0223ee45482d6f037d",
    },
    tradeDescription: "Import of Cloth from Ghana",
    collateralDescription: "Goods as collateral",
    guaranteeAmount: "4.00 USDC",
    collateralValue: "0.40 USDC",
    financingDuration: 30,
    contractNumber: "SC-2025-002",
    paymentDueDate: "12/16/2025",
    status: "SENT TO SELLER",
    currentStage: 3, // Approved stage (for testing different stages)
    issuanceFee: "0.04 USDC (1%)",
    content: `[BlockFinaX Treasury Pool]

IRREVOCABLE POOL GUARANTEE

═══════════════════════════════════════════════════════════════════════

To: 0xef5bed7c221c85a2c88e3c0223ee45482d6f037d

Date: 2025-11-16

───────────────────────────────────────────────────────────────────────

– TYPE OF GUARANTEE: Performance Guarantee (Goods-as-Collateral Pool Guarantee)
– GUARANTEE NO.: PG-1763321117688-XYZ123
– THE GUARANTOR: BlockFinaX Treasury Pool
   Pool Contract Address: [Treasury Pool Smart Contract]
   Place of Issue: Base Sepolia Blockchain Network
   Status: APPROVED - Awaiting buyer fee payment
   
– THE APPLICANT (Principal/Buyer):
   Company: XYZ LTD
   Registration: REG-789012
   Country: Nigeria
   Contact: Bilal
   Email: bilal@xyzltd.com
   Wallet Address: 0x324ffda4...b9f141
   
– THE BENEFICIARY (Seller):
   Wallet Address: 0xef5bed7c221c85a2c88e3c0223ee45482d6f037d
   
– TRADE DESCRIPTION:
   Import of Cloth from Ghana
   Total Trade Value: 8.00 USDC
   Contract Number: SC-2025-002
   
– GUARANTEE AMOUNT: 4.00 USDC (50% of trade value)
   
– COLLATERAL:
   Description: Goods as collateral
   Estimated Value: 0.40 USDC
   
– FINANCING DURATION: 30 days
   Payment Due Date: 12/16/2025
   
– ISSUANCE FEE: 0.04 USDC (1% of guarantee amount)
   Payable by: Applicant (Buyer)
   Payment Status: PENDING
   
═══════════════════════════════════════════════════════════════════════`,
  },
];

export const TradeFinanceScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  // Use the shared context for real-time data
  const {
    applications,
    setApplications,
    drafts,
    setDrafts,
    addApplication,
    addDraft,
    updateApplicationStatus,
    updateDraftStatus,
    issueCertificate,
    updateShippingDetails,
    confirmDelivery,
    completeTransaction,
    updateApplicationStage,
    saveDraft,
  } = useTradeFinance();

  const [userRole, setUserRole] = useState<"buyer" | "seller">("buyer");
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [selectedCertificate, setSelectedCertificate] =
    useState<DraftCertificate | null>(null);
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [showSellerDraftView, setShowSellerDraftView] = useState(false);
  const [selectedSellerDraft, setSelectedSellerDraft] = useState<any>(null);
  const [showBuyerApplicationView, setShowBuyerApplicationView] =
    useState(false);
  const [selectedBuyerApplication, setSelectedBuyerApplication] =
    useState<any>(null);

  const [poolBalance] = useState({
    balance: "223.76 USDC",
    liveBalance: "Live blockchain balance",
    stakedInDB: "Staked in DB: 100.00 USDC",
  });

  const [guaranteeStats] = useState({
    pending: 0,
    totalGuaranteed: "241.00 USDC",
    approved: 0,
    inProgress: 0,
    totalApproved: 0,
  });

  const [applicationForm, setApplicationForm] = useState<PoolGuaranteeForm>({
    companyName: "",
    registrationNumber: "",
    country: "",
    contactPerson: "",
    email: "",
    phone: "",
    tradeDescription: "",
    totalTradeValue: "",
    guaranteeAmount: "",
    collateralDescription: "",
    collateralValue: "",
    sellerWalletAddress: "",
    financingDuration: "",
    contractNumber: "",
    contractDate: "",
    proformaInvoice: null,
    salesContract: null,
  });

  // Applications and drafts now come from context - no local state needed

  // Load dummy data for testing
  useEffect(() => {
    if (userRole === "seller" && drafts.length === 0) {
      DUMMY_DRAFTS.forEach((draft) =>
        setDrafts((prev) => [...prev, draft as any]),
      );
    }
    if (userRole === "buyer" && applications.length === 0) {
      DUMMY_BUYER_APPLICATIONS.forEach((app) =>
        setApplications((prev) => [...prev, app as any]),
      );
    }
  }, [userRole]);

  const handleSellerDraftApprove = () => {
    Alert.alert(
      "Draft Approved",
      "You have approved this draft. The buyer will be notified to pay the issuance fee.",
      [
        {
          text: "OK",
          onPress: () => {
            setShowSellerDraftView(false);
            setSelectedSellerDraft(null);
          },
        },
      ],
    );
  };

  const handleSellerDraftReject = () => {
    Alert.alert(
      "Reject Draft?",
      "Are you sure you want to reject this draft? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Draft Rejected",
              "You have rejected this draft. The buyer will be notified.",
            );
            setShowSellerDraftView(false);
            setSelectedSellerDraft(null);
          },
        },
      ],
    );
  };

  const handleBuyerPayFee = () => {
    Alert.alert(
      "Pay Issuance Fee",
      "Processing payment of issuance fee. In production, this will connect to your wallet.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Pay",
          onPress: () => {
            showToast(
              "Fee payment successful! Certificate is being generated.",
            );
            // Update application stage
            if (selectedBuyerApplication) {
              setSelectedBuyerApplication({
                ...selectedBuyerApplication,
                currentStage: 4,
                status: "Fee Paid - Awaiting Certificate",
              });
            }
          },
        },
      ],
    );
  };

  const handleBuyerPayInvoice = () => {
    Alert.alert(
      "Pay Invoice",
      "Processing invoice payment. In production, this will connect to your wallet.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Pay",
          onPress: () => {
            showToast("Invoice payment successful! Transaction complete.");
            // Update application stage
            if (selectedBuyerApplication) {
              setSelectedBuyerApplication({
                ...selectedBuyerApplication,
                currentStage: 9,
                status: "Payment Complete",
              });
            }
          },
        },
      ],
    );
  };

  const handleBuyerConfirmDelivery = () => {
    Alert.alert(
      "Confirm Delivery",
      "Have you received and inspected the goods?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () => {
            showToast(
              "Delivery confirmed! You can now proceed to pay the invoice.",
            );
            // Update application stage
            if (selectedBuyerApplication) {
              setSelectedBuyerApplication({
                ...selectedBuyerApplication,
                currentStage: 7,
                status: "Delivery Confirmed - Pay Invoice",
              });
            }
          },
        },
      ],
    );
  };

  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Notification", message);
    }
  };

  // Handle payment results when returning from payment screens
  useEffect(() => {
    if (route.params?.paymentResult) {
      const { success, paymentType, transactionHash, applicationId } =
        route.params.paymentResult;

      if (success && applicationId) {
        switch (paymentType) {
          case "fee":
            // Update application status after fee payment
            setApplications((prev) =>
              prev.map((app) =>
                app.id === applicationId
                  ? { ...app, status: "Awaiting Certificate" }
                  : app,
              ),
            );
            showToast("Fee payment successful! Certificate issuance pending.");
            break;

          case "invoice":
            // Update application status after invoice payment
            setApplications((prev) =>
              prev.map((app) =>
                app.id === applicationId ? { ...app, status: "Fee Paid" } : app,
              ),
            );
            showToast(
              "Invoice payment successful! Transaction is being processed.",
            );
            break;

          case "settlement":
            // Update application status after settlement payment
            setApplications((prev) =>
              prev.map((app) =>
                app.id === applicationId
                  ? { ...app, status: "Invoice Settled" }
                  : app,
              ),
            );
            showToast(
              "Settlement payment successful! Certificate will be issued.",
            );
            break;
        }
      }

      // Clear the payment result params
      navigation.setParams({ paymentResult: undefined } as any);
    }
  }, [route.params?.paymentResult, navigation, setApplications]);

  // Progress Indicator Component
  const renderProgressIndicator = (application: Application) => {
    const stages = [
      {
        id: 1,
        label: "Applied",
        status: application.currentStage >= 1 ? "completed" : "pending",
      },
      {
        id: 2,
        label: "Draft Sent",
        status: application.currentStage >= 2 ? "completed" : "pending",
      },
      {
        id: 3,
        label: "Seller Approved",
        status: application.currentStage >= 3 ? "completed" : "pending",
      },
      {
        id: 4,
        label: "Fee Paid",
        status: application.currentStage >= 4 ? "completed" : "pending",
      },
      {
        id: 5,
        label: "Cert Issued",
        status: application.currentStage >= 5 ? "completed" : "pending",
      },
      {
        id: 6,
        label: "Goods Shipped",
        status: application.currentStage >= 6 ? "completed" : "pending",
      },
      {
        id: 7,
        label: "Delivery Confirmed",
        status: application.currentStage >= 7 ? "completed" : "pending",
      },
      {
        id: 8,
        label: "Payment Complete",
        status: application.currentStage >= 8 ? "completed" : "pending",
      },
    ];

    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressTitle}>Transaction Progress</Text>
        <View style={styles.progressSteps}>
          {stages.map((stage, index) => (
            <React.Fragment key={stage.id}>
              <View style={styles.stepContainer}>
                <View
                  style={[
                    styles.stepCircle,
                    {
                      backgroundColor:
                        stage.status === "completed"
                          ? colors.success
                          : application.currentStage === stage.id
                            ? colors.primary
                            : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      {
                        color:
                          stage.status === "completed" ||
                          application.currentStage === stage.id
                            ? palette.white
                            : colors.text,
                      },
                    ]}
                  >
                    {stage.id}
                  </Text>
                </View>
                <Text style={styles.stepLabel}>{stage.label}</Text>
              </View>
              {index < stages.length - 1 && (
                <View
                  style={[
                    styles.progressLine,
                    {
                      backgroundColor:
                        application.currentStage > stage.id
                          ? colors.success
                          : colors.border,
                    },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  // Network and Token Selector Handlers
  const { selectedNetwork } = useWallet();
  const [currentNetworkId, setCurrentNetworkId] =
    useState<SupportedNetworkId | null>(selectedNetwork?.id || null);
  const [selectedToken, setSelectedToken] = useState<StablecoinConfig | null>(
    null,
  );

  const availableTokens = React.useMemo(() => {
    if (!currentNetworkId) return [];
    return getAllSupportedTokens(currentNetworkId);
  }, [currentNetworkId]);

  const handleNetworkSelect = React.useCallback(
    (networkId: SupportedNetworkId) => {
      setCurrentNetworkId(networkId);
      setShowNetworkSelector(false);

      // Auto-select first token for new network
      const tokens = getAllSupportedTokens(networkId);
      if (tokens.length > 0) {
        const firstToken: StablecoinConfig = {
          symbol: tokens[0].symbol,
          name: tokens[0].name,
          address: tokens[0].address,
          decimals: tokens[0].decimals,
          targetPeg: 1.0,
        };
        setSelectedToken(firstToken);
      }
    },
    [],
  );

  const handleTokenSelect = React.useCallback((token: TokenInfo) => {
    const stablecoinConfig: StablecoinConfig = {
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals,
      targetPeg: 1.0,
    };
    setSelectedToken(stablecoinConfig);
    setShowTokenSelector(false);
  }, []);

  const handleDocumentPick = async (
    type: "proformaInvoice" | "salesContract",
  ) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setApplicationForm({
          ...applicationForm,
          [type]: {
            name: asset.name,
            uri: asset.uri,
            size: asset.size,
            mimeType: asset.mimeType,
          },
        });
        showToast(
          `${
            type === "proformaInvoice" ? "Proforma Invoice" : "Sales Contract"
          } uploaded successfully`,
        );
      }
    } catch (error) {
      console.log("Document picker error:", error);
      showToast("Error uploading document");
    }
  };

  const handleImagePick = async (type: "proformaInvoice" | "salesContract") => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to upload images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setApplicationForm({
          ...applicationForm,
          [type]: {
            name: `image_${Date.now()}.jpg`,
            uri: asset.uri,
            size: asset.fileSize || 0,
            mimeType: "image/jpeg",
          },
        });
        showToast(
          `${
            type === "proformaInvoice" ? "Proforma Invoice" : "Sales Contract"
          } uploaded successfully`,
        );
      }
    } catch (error) {
      console.log("Image picker error:", error);
      showToast("Error uploading image");
    }
  };

  const handleSubmitApplication = () => {
    const requiredFields = [
      "companyName",
      "registrationNumber",
      "contactPerson",
      "email",
      "tradeDescription",
      "totalTradeValue",
      "guaranteeAmount",
    ];
    const missingFields = requiredFields.filter(
      (field) => !applicationForm[field as keyof PoolGuaranteeForm],
    );

    if (missingFields.length > 0) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    if (!applicationForm.proformaInvoice || !applicationForm.salesContract) {
      Alert.alert(
        "Missing Documents",
        "Please upload both Proforma Invoice and Sales Contract.",
      );
      return;
    }

    // Generate new application
    const newApplication: Application = {
      id: `app-${Date.now()}`,
      requestId: `PG-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)
        .toUpperCase()}`,
      companyName: applicationForm.companyName,
      guaranteeAmount: `${applicationForm.guaranteeAmount} USDC`,
      tradeValue: `${applicationForm.totalTradeValue} USDC`,
      status: "Pending Draft",
      submittedDate: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      contractNumber: applicationForm.contractNumber,
      tradeDescription: applicationForm.tradeDescription,
      buyer: {
        company: applicationForm.companyName,
        registration: applicationForm.registrationNumber,
        country: applicationForm.country,
        contact: applicationForm.contactPerson,
        email: applicationForm.email,
        phone: applicationForm.phone,
        walletAddress: "0x759ed3d2cc67a0de53a0cce270a9e0fef5e5582a", // Current user wallet
        applicationDate: new Date().toLocaleDateString("en-US"),
      },
      seller: {
        walletAddress: applicationForm.sellerWalletAddress,
      },
      applicationDate: new Date().toLocaleDateString("en-US"),
      paymentDueDate: new Date(
        Date.now() +
          (parseInt(applicationForm.financingDuration) || 90) *
            24 *
            60 *
            60 *
            1000,
      ).toLocaleDateString("en-US"),
      financingDuration: parseInt(applicationForm.financingDuration) || 90,
      issuanceFee: `${(
        parseFloat(applicationForm.guaranteeAmount) * 0.01
      ).toFixed(2)} USDC`,
      collateralDescription: applicationForm.collateralDescription,
      collateralValue: applicationForm.collateralValue,

      // Initialize new fields for complete flow
      currentStage: 1,
      isDraft: true,
      lastUpdated: new Date().toISOString(),
    };

    setApplications((prev) => [newApplication, ...prev]);

    // Also create a draft certificate for seller approval
    const newDraft: DraftCertificate = {
      id: `draft-${Date.now()}`,
      requestId: newApplication.requestId,
      guaranteeNo: newApplication.requestId,
      applicant: newApplication.buyer,
      beneficiary: newApplication.seller,
      tradeDescription: applicationForm.tradeDescription,
      collateralDescription: applicationForm.collateralDescription,
      guaranteeAmount: `${applicationForm.guaranteeAmount} USDC`,
      collateralValue: applicationForm.collateralValue,
      financingDuration: parseInt(applicationForm.financingDuration) || 90,
      contractNumber: applicationForm.contractNumber,
      contractDate:
        applicationForm.contractDate || new Date().toLocaleDateString("en-US"),
      paymentDueDate: new Date(
        Date.now() +
          (parseInt(applicationForm.financingDuration) || 90) *
            24 *
            60 *
            60 *
            1000,
      ).toLocaleDateString("en-US"),
      status: "SENT TO SELLER",
      issuanceFee: `${(
        parseFloat(applicationForm.guaranteeAmount) * 0.01
      ).toFixed(2)} USDC`,
      content: `Pool Guarantee Certificate - ${newApplication.requestId}
Company: ${applicationForm.companyName}
Amount: ${applicationForm.guaranteeAmount} USDC
Trade: ${applicationForm.tradeDescription}
Status: AWAITING SELLER APPROVAL`,
    };

    setDrafts((prev) => [newDraft, ...prev]);

    Alert.alert(
      "Application Submitted",
      "Your pool guarantee application has been submitted. A draft certificate has been sent to the seller for approval.",
      [
        {
          text: "OK",
          onPress: () => {
            setShowApplicationModal(false);
            setApplicationForm({
              companyName: "",
              registrationNumber: "",
              country: "",
              contactPerson: "",
              email: "",
              phone: "",
              tradeDescription: "",
              totalTradeValue: "",
              guaranteeAmount: "",
              collateralDescription: "",
              collateralValue: "",
              sellerWalletAddress: "",
              financingDuration: "",
              contractNumber: "",
              contractDate: "",
              proformaInvoice: null,
              salesContract: null,
            });
            showToast("Application submitted successfully!");
          },
        },
      ],
    );
  };

  const handleDraftApproval = (draftId: string, approved: boolean) => {
    if (approved) {
      // Update the draft status
      const approvedDraft = drafts.find((draft) => draft.id === draftId);

      setDrafts((prev) =>
        prev.map((draft) =>
          draft.id === draftId
            ? { ...draft, status: "AWAITING FEE PAYMENT" }
            : draft,
        ),
      );

      // Create a real application for the buyer when seller approves
      if (approvedDraft) {
        const newApplication: Application = {
          id: `app-${Date.now()}`,
          requestId: approvedDraft.requestId,
          companyName: approvedDraft.applicant.company,
          guaranteeAmount: approvedDraft.guaranteeAmount,
          tradeValue:
            (
              parseFloat(approvedDraft.guaranteeAmount.replace(" USDC", "")) *
              1.75
            ).toFixed(2) + " USDC", // Calculate from guarantee amount
          status: "Awaiting Fee Payment",
          submittedDate: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          contractNumber: approvedDraft.contractNumber,
          tradeDescription: approvedDraft.tradeDescription,
          buyer: approvedDraft.applicant,
          seller: approvedDraft.beneficiary,
          applicationDate: approvedDraft.applicant.applicationDate,
          paymentDueDate: approvedDraft.paymentDueDate,
          financingDuration: approvedDraft.financingDuration,
          issuanceFee: approvedDraft.issuanceFee,
          collateralDescription: approvedDraft.collateralDescription,
          collateralValue: approvedDraft.collateralValue,

          // Add missing required properties
          currentStage: 2,
          isDraft: false,
          lastUpdated: new Date().toISOString(),
        };

        setApplications((prev) => [newApplication, ...prev]);
      }

      showToast(
        "Draft approved successfully! Buyer will be notified to pay the issuance fee.",
      );
    } else {
      setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
      showToast("Draft rejected.");
    }
  };

  const handlePayFee = (application: Application) => {
    // Navigate to payment screen with fee payment parameters
    navigation.navigate("TradeFinancePayment", {
      paymentType: "fee",
      feeAmount: 50, // Standard application fee
      feeRecipient: "0x1234567890123456789012345678901234567890", // Platform fee address
      applicationId: application.id,
      preferredToken: "USDC",
    });
  };

  const processPayment = () => {
    if (!selectedApplication) return;

    // Navigate to payment screen for invoice payment
    navigation.navigate("TradeFinancePayment", {
      paymentType: "invoice",
      invoiceAmount: parseFloat(selectedApplication.tradeValue),
      supplierAddress: selectedApplication.seller.walletAddress,
      invoiceId: selectedApplication.id,
      preferredToken: "USDC",
    });
  };

  const openSettlementModal = (application: Application) => {
    // Calculate remaining amount (total - guarantee amount)
    const totalValue = parseFloat(application.tradeValue);
    const guaranteeAmount = parseFloat(application.guaranteeAmount);
    const remainingAmount = totalValue - guaranteeAmount;

    // Navigate to payment screen for settlement
    navigation.navigate("TradeFinancePayment", {
      paymentType: "settlement",
      settlementAmount: remainingAmount,
      settlementAddress: application.seller.walletAddress,
      preferredToken: "USDC",
    });
  };

  const processSettlement = () => {
    if (!selectedApplication) return;

    // Update application status to invoice settled
    setApplications((prev) =>
      prev.map((app) =>
        app.id === selectedApplication.id
          ? { ...app, status: "Invoice Settled" }
          : app,
      ),
    );

    showToast(
      "Invoice settlement successful! Certificate will be issued by treasury delegators.",
    );
  };

  // Stage 5: Certificate Issuance Handler
  const handleCertificateIssuance = (application: Application) => {
    const certificateContent = `
POOL GUARANTEE CERTIFICATE - ${application.requestId}

This certificate confirms that the following guarantee has been approved and issued:

APPLICANT INFORMATION:
Company: ${application.buyer.company}
Registration: ${application.buyer.registration}
Country: ${application.buyer.country}
Contact: ${application.buyer.contact}

GUARANTEE DETAILS:
Guarantee Amount: ${application.guaranteeAmount}
Trade Value: ${application.tradeValue}
Trade Description: ${application.tradeDescription}
Collateral: ${application.collateralDescription}
Collateral Value: ${application.collateralValue}

CONTRACT INFORMATION:
Contract Number: ${application.contractNumber}
Application Date: ${application.applicationDate}
Payment Due Date: ${application.paymentDueDate}
Financing Duration: ${application.financingDuration} days

ISSUANCE DETAILS:
Issuance Date: ${new Date().toLocaleDateString("en-US")}
Issuance Fee: ${application.issuanceFee}
Status: CERTIFICATE ISSUED

This certificate is valid and backed by the BlockFinaX treasury pool.
    `;

    issueCertificate(application.id, certificateContent);
    updateApplicationStage(application.id, 5);
    showToast("Certificate has been successfully issued!");
  };

  // Stage 6: Shipping Confirmation Handler
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingForm, setShippingForm] = useState({
    trackingNumber: "",
    carrier: "",
    shippingDate: "",
    documents: [] as Array<{ name: string; uri: string; type: string }>,
  });

  const handleShippingConfirmation = (application: Application) => {
    setSelectedApplication(application);
    setShowShippingModal(true);
  };

  const processShippingConfirmation = () => {
    if (!selectedApplication) return;

    const shippingDetails = {
      trackingNumber: shippingForm.trackingNumber,
      carrier: shippingForm.carrier,
      shippingDate:
        shippingForm.shippingDate || new Date().toLocaleDateString("en-US"),
      documents: shippingForm.documents,
    };

    updateShippingDetails(selectedApplication.id, shippingDetails);
    updateApplicationStage(selectedApplication.id, 6);

    setShowShippingModal(false);
    setSelectedApplication(null);
    setShippingForm({
      trackingNumber: "",
      carrier: "",
      shippingDate: "",
      documents: [],
    });

    showToast("Shipping confirmation uploaded successfully!");
  };

  // Stage 7: Delivery Confirmation Handler
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const handleDeliveryConfirmation = (application: Application) => {
    setSelectedApplication(application);
    setShowDeliveryModal(true);
  };

  const processDeliveryConfirmation = (confirmedBy: "buyer" | "seller") => {
    if (!selectedApplication) return;

    confirmDelivery(selectedApplication.id, confirmedBy);
    updateApplicationStage(selectedApplication.id, 7);

    setShowDeliveryModal(false);
    setSelectedApplication(null);

    showToast(`Delivery confirmed by ${confirmedBy}!`);
  };

  // Stage 8: Transaction Completion Handler
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const handleTransactionCompletion = (application: Application) => {
    setSelectedApplication(application);
    setShowCompletionModal(true);
  };

  const processTransactionCompletion = () => {
    if (!selectedApplication) return;

    const finalAmount = selectedApplication.tradeValue;
    completeTransaction(selectedApplication.id, finalAmount);

    setShowCompletionModal(false);
    setSelectedApplication(null);

    showToast("Transaction completed successfully!");
  };

  // Document Upload Handler
  const handleDocumentUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const newDocument = {
          name: asset.name || "Document",
          uri: asset.uri,
          type: asset.mimeType || "application/octet-stream",
        };

        setShippingForm((prev) => ({
          ...prev,
          documents: [...prev.documents, newDocument],
        }));

        showToast("Document uploaded successfully!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload document. Please try again.");
    }
  };

  const renderOverviewTab = () => (
    <View style={styles.content}>
      {/* Role Selection Section */}
      <View style={styles.roleSliderSection}>
        <Text style={styles.roleSliderLabel}>Your Role</Text>
        <View style={styles.roleSliderContainer}>
          <TouchableOpacity
            style={[
              styles.roleSliderOption,
              styles.roleSliderOptionLeft,
              userRole === "buyer" && styles.roleSliderOptionActive,
            ]}
            onPress={() => setUserRole("buyer")}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="cart"
              size={20}
              color={userRole === "buyer" ? "white" : colors.primary}
            />
            <Text
              style={[
                styles.roleSliderText,
                userRole === "buyer" && styles.roleSliderTextActive,
              ]}
            >
              Buyer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleSliderOption,
              styles.roleSliderOptionRight,
              userRole === "seller" && styles.roleSliderOptionActive,
            ]}
            onPress={() => setUserRole("seller")}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="store"
              size={20}
              color={userRole === "seller" ? "white" : colors.primary}
            />
            <Text
              style={[
                styles.roleSliderText,
                userRole === "seller" && styles.roleSliderTextActive,
              ]}
            >
              Seller
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* My Pool Guarantee Applications Section for Buyers */}
      {userRole === "buyer" && (
        <View style={styles.section}>
          {/* Centered Apply Button */}
          <View style={styles.centeredButtonContainer}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowApplicationModal(true)}
            >
              <MaterialCommunityIcons
                name="plus-circle"
                size={18}
                color="white"
              />
              <Text style={styles.applyButtonText}>
                Apply for Pool Guarantee
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section Header */}
          <View style={styles.sectionHeaderCentered}>
            <Text style={styles.sectionTitle}>
              My Pool Guarantee Applications
            </Text>
            <Text style={styles.sectionSubtitle}>
              Apply for new guarantees and track your applications
            </Text>
          </View>

          {/* Application History */}
          {applications.length > 0 ? (
            <View style={styles.applicationsContainer}>
              {applications.map((app) => (
                <TouchableOpacity
                  key={app.id}
                  style={styles.applicationListCard}
                  onPress={() => {
                    setSelectedBuyerApplication(app);
                    setShowBuyerApplicationView(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.applicationListHeader}>
                    <View style={styles.applicationListIcon}>
                      <MaterialCommunityIcons
                        name="file-document"
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.applicationListInfo}>
                      <Text style={styles.applicationListTitle}>
                        {(app as any).applicant?.company || app.companyName}
                      </Text>
                      <Text
                        style={styles.applicationListSubtitle}
                        numberOfLines={1}
                      >
                        {app.tradeDescription}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.applicationListDetails}>
                    <View style={styles.applicationListRow}>
                      <MaterialCommunityIcons
                        name="account"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.applicationListLabel}>Seller:</Text>
                      <Text
                        style={styles.applicationListValue}
                        numberOfLines={1}
                      >
                        {(app as any).beneficiary?.name || "Seller"}
                      </Text>
                    </View>
                    <View style={styles.applicationListRow}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.applicationListLabel}>Created:</Text>
                      <Text style={styles.applicationListValue}>
                        {(app as any).submittedDate ||
                          (app as any).applicationDate ||
                          "N/A"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.applicationListFooter}>
                    <View
                      style={[
                        styles.applicationListBadge,
                        {
                          backgroundColor:
                            app.currentStage >= 8
                              ? "#D4EDDA"
                              : app.currentStage >= 5
                                ? "#FFF3CD"
                                : "#F0F9FF",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.applicationListBadgeText,
                          {
                            color:
                              app.currentStage >= 8
                                ? "#155724"
                                : app.currentStage >= 5
                                  ? "#856404"
                                  : "#0369A1",
                          },
                        ]}
                      >
                        Stage {app.currentStage || 1} of 9
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyApplicationsState}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={48}
                color={colors.text + "40"}
              />
              <Text style={styles.emptyStateText}>No applications yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Click "Apply for Pool Guarantee" to get started
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Drafts Awaiting Your Approval Section for Sellers */}
      {userRole === "seller" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Drafts Awaiting Your Approval</Text>

          {drafts.length === 0 ? (
            <Text style={styles.emptyMessage}>
              No pending draft approvals at this time.
            </Text>
          ) : (
            <View style={styles.draftsContainer}>
              {drafts.map((draft) => (
                <View key={draft.id} style={styles.draftCard}>
                  <View style={styles.draftHeader}>
                    <Text style={styles.draftTitle}>
                      {draft.applicant.company}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: "#2196F3" },
                      ]}
                    >
                      <Text style={styles.statusText}>{draft.status}</Text>
                    </View>
                  </View>

                  <View style={styles.draftDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Request ID:</Text>
                      <Text style={styles.detailValue}>{draft.requestId}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Buyer (Applicant):</Text>
                      <Text style={styles.detailValue}>
                        {draft.applicant.contact}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Goods Description:</Text>
                      <Text style={styles.detailValue}>
                        {draft.tradeDescription}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Guarantee Amount:</Text>
                      <Text style={styles.detailValue}>
                        {draft.guaranteeAmount}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.draftActions}>
                    <TouchableOpacity
                      style={styles.viewDraftButton}
                      onPress={() => {
                        setSelectedSellerDraft(draft);
                        setShowSellerDraftView(true);
                      }}
                    >
                      <MaterialCommunityIcons
                        name="eye"
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={styles.viewDraftText}>View Draft</Text>
                    </TouchableOpacity>

                    <View style={styles.approvalButtons}>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleDraftApproval(draft.id, true)}
                      >
                        <MaterialCommunityIcons
                          name="check"
                          size={16}
                          color="white"
                        />
                        <Text style={styles.approveButtonText}>Approve</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleDraftApproval(draft.id, false)}
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={16}
                          color="white"
                        />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
      case "Fee Paid":
      case "Certificate Issued":
      case "Invoice Settled":
      case "Delivery Confirmed":
      case "Transaction Complete":
        return "#4CAF50";
      case "Awaiting Fee Payment":
      case "Awaiting Certificate":
      case "Draft Sent":
      case "Seller Approved":
        return "#2196F3";
      case "Pending Draft":
      case "Goods Shipped":
        return "#FF9800";
      default:
        return "#f44336";
    }
  };

  const renderWorkflowTab = () => (
    <View style={styles.content}>
      <View style={styles.workflowContainer}>
        <MaterialCommunityIcons
          name="cog-outline"
          size={64}
          color={colors.primary}
        />
        <Text style={styles.workflowTitle}>Pool Guarantee Workflow</Text>
        <Text style={styles.workflowDescription}>
          Detailed workflow steps and documentation will be displayed here
        </Text>
      </View>
    </View>
  );

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* <View style={styles.header}>
          <Text style={styles.title}>Trade Finance Portal</Text>
          <Text style={styles.subtitle}>
            Decentralized liquidity pool for trade financing - replacing
            traditional LC/DLC bank guarantees
          </Text>
        </View> */}

        {/* Network and Token Selection */}
        <View style={styles.compactSelectorContainer}>
          <CompactNetworkTokenSelector
            selectedNetworkId={selectedNetwork.id}
            selectedToken={selectedToken}
            onNetworkChange={handleNetworkSelect}
            onTokenChange={handleTokenSelect}
          />
        </View>

        {renderOverviewTab()}
      </ScrollView>

      {/* Pool Guarantee Application Modal - Multi-Step Flow */}
      <Modal
        visible={showApplicationModal}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <PoolGuaranteeApplicationFlow
          onClose={() => setShowApplicationModal(false)}
          onSubmit={handleSubmitApplication}
          initialFormData={applicationForm}
        />
      </Modal>

      {/* Draft Certificate Modal */}
      <Modal
        visible={showCertificateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedCertificate?.status === "AWAITING CERTIFICATE" ||
              selectedCertificate?.status === "INVOICE SETTLED"
                ? "Pool Guarantee Certificate - AWAITING ISSUANCE"
                : "Pool Guarantee Certificate - DRAFT"}
            </Text>
            <TouchableOpacity onPress={() => setShowCertificateModal(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.certificateContent}>
            {selectedCertificate && (
              <>
                <View style={styles.certificateHeader}>
                  <Text style={styles.certificateTitle}>
                    SWIFT MT 710 Format - ICC URDG 758 Compliant
                  </Text>
                </View>

                <View style={styles.certificateDetails}>
                  <Text style={styles.certificateLabel}>
                    Application Details
                  </Text>
                  <View style={styles.certificateRow}>
                    <Text style={styles.certificateField}>Request ID:</Text>
                    <Text style={styles.certificateValue}>
                      {selectedCertificate.requestId}
                    </Text>
                  </View>
                  <View style={styles.certificateRow}>
                    <Text style={styles.certificateField}>Company:</Text>
                    <Text style={styles.certificateValue}>
                      {selectedCertificate.applicant.company}
                    </Text>
                  </View>
                  <View style={styles.certificateRow}>
                    <Text style={styles.certificateField}>
                      Guarantee Amount:
                    </Text>
                    <Text style={styles.certificateValue}>
                      {selectedCertificate.guaranteeAmount}
                    </Text>
                  </View>
                  <View style={styles.certificateRow}>
                    <Text style={styles.certificateField}>Status:</Text>
                    <Text
                      style={[
                        styles.certificateValue,
                        { color: colors.primary },
                      ]}
                    >
                      {selectedCertificate.status}
                    </Text>
                  </View>
                </View>

                {/* Trade Lifecycle Status */}
                <View style={styles.lifecycleSection}>
                  <Text style={styles.certificateLabel}>
                    Trade Lifecycle Status
                  </Text>
                  <Text style={styles.currentStage}>
                    Current Stage:{" "}
                    {selectedCertificate.status === "INVOICE SETTLED"
                      ? "GUARANTEE ISSUED"
                      : "AWAITING CERTIFICATE"}
                  </Text>

                  {selectedCertificate.status === "INVOICE SETTLED" && (
                    <View style={styles.actionRequiredCard}>
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={24}
                        color={colors.success}
                      />
                      <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                          Action Required - Pay Seller
                        </Text>
                        <Text style={styles.actionDescription}>
                          Pay the seller directly (off-chain or on-chain), then
                          upload proof of payment here to proceed with the
                          trade.
                        </Text>
                      </View>
                    </View>
                  )}

                  {selectedCertificate.status === "AWAITING CERTIFICATE" && (
                    <View style={styles.pendingCard}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={24}
                        color={colors.warning}
                      />
                      <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                          Certificate Pending
                        </Text>
                        <Text style={styles.actionDescription}>
                          Certificate issuance is pending. Please settle the
                          invoice to proceed.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.certificateContentBox}>
                  <Text style={styles.certificateContentTitle}>
                    Certificate Content
                  </Text>
                  <ScrollView
                    style={styles.certificateTextContainer}
                    nestedScrollEnabled
                  >
                    <Text style={styles.certificateText}>
                      {selectedCertificate.content}
                    </Text>
                  </ScrollView>
                </View>

                {userRole === "seller" &&
                  selectedCertificate.status === "SENT TO SELLER" && (
                    <View style={styles.certificateActions}>
                      <TouchableOpacity
                        style={styles.approveCertButton}
                        onPress={() =>
                          handleDraftApproval(selectedCertificate.id, true)
                        }
                      >
                        <Text style={styles.approveCertButtonText}>
                          Approve
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rejectCertButton}
                        onPress={() =>
                          handleDraftApproval(selectedCertificate.id, false)
                        }
                      >
                        <Text style={styles.rejectCertButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                <TouchableOpacity style={styles.downloadButton}>
                  <MaterialCommunityIcons
                    name="download"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.downloadButtonText}>Download as PDF</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pay Issuance Fee</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.paymentContent}>
            {selectedApplication && (
              <>
                <Text style={styles.paymentSubtitle}>
                  Pay the 1% issuance fee to complete your Pool Guarantee
                </Text>

                <View style={styles.paymentDetails}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Fee Due:</Text>
                    <Text style={styles.paymentValue}>
                      {selectedApplication.issuanceFee}
                    </Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Guarantee Amount:</Text>
                    <Text style={styles.paymentValue}>
                      {selectedApplication.guaranteeAmount}
                    </Text>
                  </View>
                </View>

                <View style={styles.paymentAddressBox}>
                  <Text style={styles.paymentAddressTitle}>
                    SEND PAYMENT TO:
                  </Text>
                  <Text style={styles.paymentAddress}>
                    0xeAAD0BE342a0a7d6fD7b2b2073E4db2565f9ce4f
                  </Text>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Amount:</Text>
                    <Text style={styles.paymentValue}>
                      {selectedApplication.issuanceFee}
                    </Text>
                  </View>
                </View>

                <View style={styles.quickPaymentSection}>
                  <Text style={styles.quickPaymentTitle}>
                    Quick Payment from Wallet
                  </Text>
                  <Text style={styles.quickPaymentSubtitle}>
                    Click below to pay directly from your connected wallet.
                    We'll handle everything and verify the payment
                    automatically.
                  </Text>

                  <TouchableOpacity
                    style={styles.payFromWalletButton}
                    onPress={processPayment}
                  >
                    <MaterialCommunityIcons
                      name="wallet"
                      size={20}
                      color="white"
                    />
                    <Text style={styles.payFromWalletText}>
                      Pay from Wallet
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.manualPaymentSection}>
                  <Text style={styles.manualPaymentTitle}>
                    OR ENTER TRANSACTION HASH MANUALLY
                  </Text>
                  <Text style={styles.manualPaymentSubtitle}>
                    Transaction Hash (if already paid)
                  </Text>

                  <TextInput
                    style={styles.transactionHashInput}
                    placeholder="0x..."
                    placeholderTextColor={colors.textSecondary}
                  />

                  <View style={styles.manualPaymentActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setShowPaymentModal(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.submitHashButton}
                      onPress={processPayment}
                    >
                      <Text style={styles.submitHashButtonText}>
                        Submit TX Hash
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.paymentWarning}>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={20}
                    color={colors.warning}
                  />
                  <Text style={styles.paymentWarningText}>
                    This will initiate a blockchain transaction. Make sure you
                    have enough USDC and ETH for gas fees.
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Settlement Modal */}
      <Modal
        visible={showSettlementModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSettlementModal(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Settle Invoice - Send USDC Payment
            </Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              Send USDC payment directly to seller's wallet (partial or full
              payment)
            </Text>

            {selectedApplication && (
              <>
                <View style={styles.settlementDetailsCard}>
                  <Text style={styles.settlementLabel}>Seller:</Text>
                  <Text style={styles.settlementValue}>
                    {selectedApplication.companyName}
                  </Text>

                  <Text style={styles.settlementLabel}>Seller Address:</Text>
                  <Text style={styles.addressText}>
                    0x32df4a4f0c09fb4b276e60d5f8200ec4ab9f141
                  </Text>

                  <Text style={styles.settlementLabel}>Invoice Total:</Text>
                  <Text style={styles.settlementValue}>
                    {selectedApplication.tradeValue} USDC
                  </Text>

                  <Text style={styles.settlementLabel}>Already Paid:</Text>
                  <Text style={styles.settlementValue}>
                    {selectedApplication.guaranteeAmount} USDC
                  </Text>

                  <Text style={styles.settlementLabel}>Remaining Balance:</Text>
                  <Text style={styles.settlementValue}>
                    {settlementAmount} USDC
                  </Text>
                </View>

                <View style={styles.paymentAmountCard}>
                  <Text style={styles.paymentLabel}>Payment amount (USDC)</Text>
                  <View style={styles.amountInputContainer}>
                    <TextInput
                      style={styles.amountInput}
                      value={settlementAmount}
                      onChangeText={setSettlementAmount}
                      placeholder="Max: 4.00"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity style={styles.maxButton}>
                      <Text style={styles.maxButtonText}>Max</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.paymentNote}>
                    Leave empty to pay full remaining balance
                  </Text>

                  <View style={styles.paymentProcessCard}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.paymentProcessText}>
                      Payment Process{"\n"}
                      Full remaining balance of {settlementAmount} USDC will be
                      sent to the seller.{"\n"}
                      This transaction will be recorded automatically.
                    </Text>
                  </View>

                  <View style={styles.settlementActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setShowSettlementModal(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.sendPaymentButton}
                      onPress={processSettlement}
                    >
                      <MaterialCommunityIcons
                        name="send"
                        size={16}
                        color="white"
                      />
                      <Text style={styles.sendPaymentButtonText}>
                        Send Payment
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Stage 6: Shipping Confirmation Modal */}
      <Modal
        visible={showShippingModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowShippingModal(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Confirm Shipping</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              Upload proof of shipment with tracking information
            </Text>

            <View style={styles.formContainer}>
              <Text style={styles.formLabel}>Tracking Number *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter tracking number"
                value={shippingForm.trackingNumber}
                onChangeText={(text) =>
                  setShippingForm((prev) => ({ ...prev, trackingNumber: text }))
                }
              />

              <Text style={styles.formLabel}>Carrier/Logistics Provider *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., FedEx, DHL, UPS"
                value={shippingForm.carrier}
                onChangeText={(text) =>
                  setShippingForm((prev) => ({ ...prev, carrier: text }))
                }
              />

              <Text style={styles.formLabel}>Shipping Date</Text>
              <TextInput
                style={styles.formInput}
                placeholder="MM/DD/YYYY (optional)"
                value={shippingForm.shippingDate}
                onChangeText={(text) =>
                  setShippingForm((prev) => ({ ...prev, shippingDate: text }))
                }
              />

              <Text style={styles.formLabel}>
                Supporting Documents (Optional)
              </Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleDocumentUpload}
              >
                <MaterialCommunityIcons
                  name="upload"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.uploadButtonText}>Upload Documents</Text>
              </TouchableOpacity>

              {shippingForm.documents.length > 0 && (
                <View style={styles.documentsContainer}>
                  {shippingForm.documents.map((doc, index) => (
                    <View key={index} style={styles.documentItem}>
                      <MaterialCommunityIcons
                        name="file-document"
                        size={16}
                        color={colors.primary}
                      />
                      <Text style={styles.documentName}>{doc.name}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowShippingModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (!shippingForm.trackingNumber || !shippingForm.carrier) &&
                      styles.disabledButton,
                  ]}
                  onPress={processShippingConfirmation}
                  disabled={
                    !shippingForm.trackingNumber || !shippingForm.carrier
                  }
                >
                  <Text style={styles.confirmButtonText}>Confirm Shipping</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Stage 7: Delivery Confirmation Modal */}
      <Modal
        visible={showDeliveryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDeliveryModal(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Confirm Delivery</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedApplication && (
              <View style={styles.deliveryContainer}>
                <Text style={styles.modalSubtitle}>
                  Confirm that goods have been delivered successfully
                </Text>

                <View style={styles.deliveryDetails}>
                  <Text style={styles.detailLabel}>Tracking Number:</Text>
                  <Text style={styles.detailValue}>
                    {selectedApplication.proofOfShipment?.trackingNumber ||
                      "N/A"}
                  </Text>

                  <Text style={styles.detailLabel}>Carrier:</Text>
                  <Text style={styles.detailValue}>
                    {selectedApplication.proofOfShipment?.carrier || "N/A"}
                  </Text>

                  <Text style={styles.detailLabel}>Shipped Date:</Text>
                  <Text style={styles.detailValue}>
                    {selectedApplication.proofOfShipment?.shippingDate || "N/A"}
                  </Text>
                </View>

                <View style={styles.confirmationActions}>
                  <Text style={styles.confirmationNote}>
                    By confirming delivery, you acknowledge that the goods have
                    been received as described.
                  </Text>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setShowDeliveryModal(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() => processDeliveryConfirmation(userRole)}
                    >
                      <Text style={styles.confirmButtonText}>
                        Confirm Delivery
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Stage 8: Transaction Completion Modal */}
      <Modal
        visible={showCompletionModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCompletionModal(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Transaction Summary</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedApplication && (
              <View style={styles.summaryContainer}>
                <Text style={styles.modalSubtitle}>
                  Transaction completed successfully!
                </Text>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>
                    Final Transaction Summary
                  </Text>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Trade Value:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedApplication.tradeValue}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Guarantee Amount:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedApplication.guaranteeAmount}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Issuance Fee:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedApplication.issuanceFee}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Application Date:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedApplication.applicationDate}
                    </Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery Confirmed:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedApplication.deliveryConfirmedDate || "Today"}
                    </Text>
                  </View>

                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalValue}>
                      {selectedApplication.tradeValue}
                    </Text>
                  </View>
                </View>

                <View style={styles.completionActions}>
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={processTransactionCompletion}
                  >
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color="white"
                    />
                    <Text style={styles.completeButtonText}>
                      Complete Transaction
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Network Selector Modal */}
      <NetworkSelector
        visible={showNetworkSelector}
        onClose={() => setShowNetworkSelector(false)}
        onSelectNetwork={handleNetworkSelect}
      />

      {/* Token Selector Modal */}
      <TokenSelector
        visible={showTokenSelector}
        onClose={() => setShowTokenSelector(false)}
        onSelectToken={handleTokenSelect}
        selectedToken={
          selectedToken
            ? {
                symbol: selectedToken.symbol,
                name: selectedToken.name,
                address: selectedToken.address,
                decimals: selectedToken.decimals,
              }
            : undefined
        }
        networkId={currentNetworkId || "lisk-sepolia"}
      />

      {/* Seller Draft View Modal */}
      <Modal
        visible={showSellerDraftView}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {selectedSellerDraft && (
          <SellerDraftView
            draft={selectedSellerDraft}
            onApprove={handleSellerDraftApprove}
            onReject={handleSellerDraftReject}
            onClose={() => {
              setShowSellerDraftView(false);
              setSelectedSellerDraft(null);
            }}
          />
        )}
      </Modal>

      {/* Buyer Application View Modal */}
      <Modal
        visible={showBuyerApplicationView}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {selectedBuyerApplication && (
          <BuyerApplicationView
            application={selectedBuyerApplication}
            onPayFee={handleBuyerPayFee}
            onPayInvoice={handleBuyerPayInvoice}
            onConfirmDelivery={handleBuyerConfirmDelivery}
            onClose={() => {
              setShowBuyerApplicationView(false);
              setSelectedBuyerApplication(null);
            }}
          />
        )}
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  compactSelectorContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  // Portfolio Balance Card
  portfolioCard: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    padding: spacing.lg,
    margin: spacing.lg,
    marginTop: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  portfolioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  portfolioTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  networkLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  portfolioBalance: {
    fontSize: 32,
    fontWeight: "700",
    color: "white",
    marginBottom: spacing.xs,
  },
  portfolioSubtext: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: spacing.xs / 2,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  activeTabText: {
    color: colors.primary,
  },
  content: {
    padding: spacing.lg,
  },
  statsContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionHeaderWithButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  centeredButtonContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionHeaderCentered: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  guaranteeStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  guaranteeStatItem: {
    alignItems: "center",
    flex: 1,
  },
  guaranteeStatValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  guaranteeStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: spacing.lg,
  },
  roleSelection: {
    flexDirection: "row",
    gap: spacing.md,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  roleButtonTextActive: {
    color: "white",
  },
  // Role Selection Styles
  roleSliderSection: {
    marginBottom: spacing.lg,
  },
  roleSliderLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  roleSliderContainer: {
    flexDirection: "row",
    backgroundColor: colors.border,
    borderRadius: 12,
    padding: 3,
  },
  roleSliderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  roleSliderOptionLeft: {
    marginRight: 2,
  },
  roleSliderOptionRight: {
    marginLeft: 2,
  },
  roleSliderOptionActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  roleSliderText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  roleSliderTextActive: {
    color: "white",
  },
  applyButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    flexShrink: 1,
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 180,
  },
  applyButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  workflowContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  workflowTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  workflowDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "white",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  formField: {
    marginBottom: spacing.md,
  },
  formFieldHalf: {
    flex: 1,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "white",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  documentUpload: {
    marginBottom: spacing.md,
  },
  uploadButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  uploadButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: "center",
    backgroundColor: "white",
  },
  uploadButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "500",
    marginTop: spacing.xs,
  },
  uploadedFile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  uploadedFileName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  uploadSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  issuanceFee: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  issuanceFeeText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // Draft styles
  draftsContainer: {
    marginTop: spacing.md,
  },
  draftCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  draftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  draftTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  draftDetails: {
    marginBottom: spacing.md,
  },
  draftActions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  viewDraftButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  viewDraftText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  approvalButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  approveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  approveButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#f44336",
    borderRadius: 8,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  rejectButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  // Application tracking styles
  applicationsContainer: {
    marginTop: spacing.md,
  },
  applicationCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  applicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  applicationActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  payFeeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  payFeeButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  companyName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    marginLeft: spacing.sm,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  applicationDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  viewDetailsText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
    marginRight: spacing.xs,
  },
  emptyApplicationsState: {
    alignItems: "center",
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
    opacity: 0.7,
  },
  // Certificate Modal Styles
  certificateContent: {
    flex: 1,
    padding: spacing.lg,
  },
  certificateHeader: {
    marginBottom: spacing.lg,
  },
  certificateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  certificateDetails: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  certificateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  certificateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  certificateField: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  certificateValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  certificateContentBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  certificateContentTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  certificateTextContainer: {
    maxHeight: 300,
  },
  certificateText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: colors.text,
    lineHeight: 16,
    padding: spacing.md,
  },
  certificateActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  approveCertButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  approveCertButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  rejectCertButton: {
    flex: 1,
    backgroundColor: "#f44336",
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  rejectCertButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  downloadButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "500",
  },
  // Payment Modal Styles
  paymentContent: {
    flex: 1,
    padding: spacing.lg,
  },
  paymentSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  paymentDetails: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  paymentLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  paymentValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  paymentAddressBox: {
    backgroundColor: "#FFF3E0",
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  paymentAddressTitle: {
    fontSize: 12,
    color: "#F57C00",
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  paymentAddress: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: colors.text,
    backgroundColor: "white",
    padding: spacing.md,
    borderRadius: 6,
    marginBottom: spacing.md,
  },
  quickPaymentSection: {
    marginBottom: spacing.lg,
  },
  quickPaymentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  quickPaymentSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  payFromWalletButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  payFromWalletText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  manualPaymentSection: {
    marginBottom: spacing.lg,
  },
  manualPaymentTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  manualPaymentSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  transactionHashInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "white",
    marginBottom: spacing.lg,
  },
  manualPaymentActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  submitHashButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  submitHashButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  paymentWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    padding: spacing.md,
  },
  paymentWarningText: {
    flex: 1,
    fontSize: 12,
    color: colors.warning,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },
  // Settlement Modal Styles
  settleInvoiceButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  settleInvoiceButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  settlementDetailsCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settlementLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  settlementValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
  addressText: {
    fontSize: 14,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: colors.text,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 6,
  },

  // Settlement Modal Styles
  paymentAmountCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  maxButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  maxButtonText: {
    color: colors.primary,
    fontWeight: "600",
  },
  paymentNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  paymentProcessCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  paymentProcessText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  settlementActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  sendPaymentButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  sendPaymentButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // Certificate Lifecycle Styles
  lifecycleSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  currentStage: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.md,
  },
  actionRequiredCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E8F5E8",
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pendingCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  actionContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  actionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Progress Indicator Styles
  progressContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  progressSteps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  stepContainer: {
    alignItems: "center",
    flex: 1,
    minWidth: 60,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "600",
  },
  stepLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 50,
  },
  progressLine: {
    height: 2,
    flex: 1,
    marginHorizontal: spacing.xs,
    marginTop: -20,
  },

  // Stage-specific Button Styles
  issueCertButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  issueCertButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "600",
  },
  shipGoodsButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  shipGoodsButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "600",
  },
  confirmDeliveryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  confirmDeliveryButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "600",
  },
  completeTransactionButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  completeTransactionButtonText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: "600",
  },

  // Form and Modal Styles (kept original, removed duplicates)
  formContainer: {
    padding: spacing.md,
  },
  documentsContainer: {
    marginTop: spacing.sm,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  documentName: {
    fontSize: 12,
    color: colors.text,
    marginLeft: spacing.xs,
    flex: 1,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    flex: 1,
    marginLeft: spacing.sm,
  },
  confirmButtonText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  disabledButton: {
    backgroundColor: colors.border,
  },

  // Delivery Modal Styles
  deliveryContainer: {
    padding: spacing.md,
  },
  deliveryDetails: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  confirmationActions: {
    marginTop: spacing.md,
  },
  confirmationNote: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    fontStyle: "italic",
  },

  // Summary Modal Styles
  summaryContainer: {
    padding: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  completionActions: {
    marginTop: spacing.md,
  },
  completeButton: {
    backgroundColor: colors.success,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  completeButtonText: {
    color: palette.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
  selectionCard: {
    backgroundColor: palette.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  selectorButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: spacing.sm,
  },
  selectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  networkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  selectorSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Application List Card Styles (Simplified View)
  applicationListCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applicationListHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  applicationListIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}10`,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  applicationListInfo: {
    flex: 1,
  },
  applicationListTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  applicationListSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  applicationListDetails: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: spacing.xs / 2,
  },
  applicationListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs / 2,
  },
  applicationListLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  applicationListValue: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
  },
  applicationListFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applicationListBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  applicationListBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

export default TradeFinanceScreen;
