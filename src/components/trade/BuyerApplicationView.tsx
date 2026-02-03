import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { DocumentViewerModal } from "@/components/documents/DocumentViewerModal";

interface ApplicationData {
  id: string;
  requestId: string;
  guaranteeNo: string;
  applicant: {
    company: string;
    registration: string;
    country: string;
    contact: string;
    email: string;
    walletAddress: string;
  };
  beneficiary: {
    walletAddress: string;
    name?: string;
  };
  tradeDescription: string;
  collateralDescription: string;
  guaranteeAmount: string;
  collateralValue: string;
  collateralPaid?: boolean; // Tracks if collateral has been paid
  issuanceFeePaid?: boolean; // Tracks if issuance fee has been paid
  financingDuration: number;
  contractNumber: string;
  paymentDueDate: string;
  status: string;
  currentStage: number; // 1-9
  issuanceFee: string;
  content: string;
  certificateContent?: string;
  proformaInvoiceIpfs?: { hash: string; url: string };
  salesContractIpfs?: { hash: string; url: string };
  proofOfShipment?: {
    trackingNumber?: string;
    carrier?: string;
    shippingDate?: string;
  };
  invoiceAmount?: string;
  invoicePaidDate?: string;
  submittedDate: string;
  companyName?: string;
  tradeValue?: string;
}

interface BuyerApplicationViewProps {
  application: ApplicationData;
  onClose: () => void;
  onPayCollateral?: () => void;
  onPayFee?: () => void;
  onPayInvoice?: () => void;
  onConfirmDelivery?: () => void;
  onIssueCertificate?: () => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

const STAGE_TITLES = [
  "Applied",
  "Pool Review",
  "Seller Review",
  "Payment Pending",
  "Logistics",
  "Shipped",
  "Delivered",
  "Balance Paid",
  "Complete",
];

const STAGE_ICONS = [
  "file-document-edit",
  "send",
  "check-circle",
  "cash",
  "truck-fast",
  "truck",
  "truck-delivery",
  "receipt",
  "certificate",
];

export const BuyerApplicationView: React.FC<BuyerApplicationViewProps> = ({
  application,
  onClose,
  onPayCollateral,
  onPayFee,
  onPayInvoice,
  onConfirmDelivery,
  onIssueCertificate,
  onRefresh,
  isRefreshing = false,
}) => {
  const [showFullCertificate, setShowFullCertificate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const handlePayCollateral = async () => {
    if (!onPayCollateral) return;
    setIsProcessing(true);
    try {
      await onPayCollateral();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayFee = async () => {
    if (!onPayFee) return;
    setIsProcessing(true);
    try {
      await onPayFee();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayInvoice = async () => {
    if (!onPayInvoice) return;
    setIsProcessing(true);
    try {
      await onPayInvoice();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!onConfirmDelivery) return;
    setIsProcessing(true);
    try {
      await onConfirmDelivery();
    } finally {
      setIsProcessing(false);
    }
  };

  const viewDocument = (url?: string) => {
    if (!url) return;
    setViewerUrl(url);
    setViewerVisible(true);
  };

  const renderStageIndicator = () => {
    return (
      <View style={styles.stageContainer}>
        <Text style={styles.stageHeader}>Application Progress</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stageScrollView}
        >
          <View style={styles.stagesRow}>
            {STAGE_TITLES.map((title, index) => {
              const stageNumber = index + 1;
              const isCompleted = stageNumber < application.currentStage;
              const isCurrent = stageNumber === application.currentStage;
              const isPending = stageNumber > application.currentStage;

              return (
                <React.Fragment key={stageNumber}>
                  <View style={styles.stageItem}>
                    <View
                      style={[
                        styles.stageCircle,
                        isCompleted && styles.stageCircleCompleted,
                        isCurrent && styles.stageCircleCurrent,
                        isPending && styles.stageCirclePending,
                      ]}
                    >
                      {isCompleted ? (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color="white"
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name={STAGE_ICONS[index] as any}
                          size={18}
                          color={
                            isCurrent
                              ? "white"
                              : isPending
                                ? colors.textSecondary
                                : "white"
                          }
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stageLabel,
                        (isCompleted || isCurrent) && styles.stageLabelActive,
                      ]}
                      numberOfLines={2}
                    >
                      {title}
                    </Text>
                  </View>
                  {index < STAGE_TITLES.length - 1 && (
                    <View
                      style={[
                        styles.stageConnector,
                        isCompleted && styles.stageConnectorCompleted,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderStageContent = () => {
    switch (application.currentStage) {
      case 1: // Applied
        return renderAppliedStage();
      case 2: // Pool Review
        return renderPoolReviewStage();
      case 3: // Seller Review
        return renderSellerReviewStage();
      case 4: // Payment Pending (Collateral + Fee)
        return renderApprovedStage();
      case 5: // Logistics (Waiting for Takeup)
        return renderLogisticsStage();
      case 6: // Goods Shipped
        return renderGoodsShippedStage();
      case 7: // Delivery Confirmed
        return renderDeliveryConfirmedStage();
      case 8: // Balance Paid
        return renderInvoicePaidStage();
      case 9: // Complete (Cert Issued)
        return renderCertificateIssuedStage();
      default:
        return renderAppliedStage();
    }
  };

  const renderLogisticsStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="truck-fast"
          size={24}
          color={colors.primary}
        />
        <Text style={styles.statusBannerText}>
          Waiting for logistics partner to take up the application
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Logistics Status</Text>
        <Text style={styles.infoDescription}>
          The buyer has paid the collateral and issuance fee. The application is
          now visible to authorized logistics partners.
        </Text>
        <View style={styles.logisticsNotifiedCard}>
          <MaterialCommunityIcons
            name="bell-ring"
            size={40}
            color={colors.primary}
          />
          <Text style={styles.logisticsNotifiedText}>
            Logistics Partners Notified
          </Text>
          <Text style={styles.logisticsNotifiedSubtitle}>
            Awaiting a partner to claim this shipment
          </Text>
        </View>
      </View>
    </View>
  );

  const renderAppliedStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={24}
          color={colors.warning}
        />
        <Text style={styles.statusBannerText}>
          Application submitted - Awaiting treasury review
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Application Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Request ID:</Text>
          <Text style={styles.infoValue}>{application.requestId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Your Company:</Text>
          <Text style={styles.infoValue}>{application.applicant.company}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Guarantee Amount:</Text>
          <Text style={[styles.infoValue, styles.amountHighlight]}>
            {application.guaranteeAmount}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Submitted:</Text>
          <Text style={styles.infoValue}>{application.submittedDate}</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Trade Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Description:</Text>
          <Text style={styles.infoValue} numberOfLines={3}>
            {application.tradeDescription}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Seller Address:</Text>
          <Text
            style={[styles.infoValue, styles.addressText]}
            numberOfLines={1}
          >
            {application.beneficiary.walletAddress}
          </Text>
        </View>
      </View>

      <View style={styles.nextStepsCard}>
        <MaterialCommunityIcons
          name="information"
          size={24}
          color={colors.primary}
        />
        <View style={styles.nextStepsContent}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>
          <Text style={styles.nextStepsText}>
            Treasury financiers are reviewing your application. Once approved, a
            draft certificate will be sent to the seller for approval.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPoolReviewStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="account-search-outline"
          size={24}
          color={colors.warning}
        />
        <Text style={styles.statusBannerText}>
          Draft sent to pool - Awaiting financier approval
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Application Status</Text>
        <View style={styles.statusCard}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={32}
            color={colors.warning}
          />
          <View style={styles.statusCardContent}>
            <Text style={styles.statusCardTitle}>Financier Review</Text>
            <Text style={styles.statusCardDescription}>
              The pool financiers are currently reviewing your guarantee
              application credentials and trade details.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.nextStepsCard}>
        <MaterialCommunityIcons
          name="information"
          size={24}
          color={colors.primary}
        />
        <View style={styles.nextStepsContent}>
          <Text style={styles.nextStepsTitle}>Whose next?</Text>
          <Text style={styles.nextStepsText}>
            Once financiers approve, the draft will be automatically sent to the
            seller for their consideration.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSellerReviewStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="email-outline"
          size={24}
          color={colors.primary}
        />
        <Text style={styles.statusBannerText}>
          Draft sent to seller - Awaiting seller approval
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Draft Status</Text>
        <View style={styles.statusCard}>
          <MaterialCommunityIcons
            name="account-check-outline"
            size={32}
            color={colors.primary}
          />
          <View style={styles.statusCardContent}>
            <Text style={styles.statusCardTitle}>Seller Review</Text>
            <Text style={styles.statusCardDescription}>
              The pool has approved your application! It has now been forwarded
              to the seller for their final acceptance.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.documentsSection}>
        <Text style={styles.sectionTitle}>Submitted Documents</Text>
        {application.proformaInvoiceIpfs && (
          <View style={styles.documentCard}>
            <MaterialCommunityIcons
              name="file-document"
              size={24}
              color={colors.primary}
            />
            <View style={styles.documentInfo}>
              <Text style={styles.documentName}>Proforma Invoice</Text>
              <Text style={styles.documentHash} numberOfLines={1}>
                IPFS: {application.proformaInvoiceIpfs.hash}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => viewDocument(application.proformaInvoiceIpfs?.url)}
            >
              <MaterialCommunityIcons
                name="eye"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        )}
        {application.salesContractIpfs && (
          <View style={styles.documentCard}>
            <MaterialCommunityIcons
              name="file-document"
              size={24}
              color={colors.primary}
            />
            <View style={styles.documentInfo}>
              <Text style={styles.documentName}>Sales Contract</Text>
              <Text style={styles.documentHash} numberOfLines={1}>
                IPFS: {application.salesContractIpfs.hash}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => viewDocument(application.salesContractIpfs?.url)}
            >
              <MaterialCommunityIcons
                name="eye"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderApprovedStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="check-circle"
          size={24}
          color={colors.success}
        />
        <Text style={styles.statusBannerText}>
          Seller approved! - Action required:{" "}
          {application.collateralPaid && application.issuanceFeePaid
            ? "Awaiting logistics"
            : !application.collateralPaid && !application.issuanceFeePaid
              ? "Pay collateral and fee"
              : !application.collateralPaid
                ? "Pay collateral"
                : "Pay issuance fee"}
        </Text>
      </View>

      {/* Step 1: Collateral Payment */}
      <View
        style={[
          styles.feePaymentCard,
          application.collateralPaid && styles.completedCard,
        ]}
      >
        <View style={styles.feeHeader}>
          <MaterialCommunityIcons
            name={application.collateralPaid ? "check-circle" : "shield-lock"}
            size={40}
            color={application.collateralPaid ? colors.success : colors.primary}
          />
          <View style={styles.feeHeaderText}>
            <Text style={styles.feeTitle}>
              Step 1: Collateral Payment {application.collateralPaid ? "✓" : ""}
            </Text>
            <Text style={styles.feeAmount}>{application.collateralValue}</Text>
          </View>
        </View>

        <View style={styles.feeDivider} />

        <View style={styles.feeDetails}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Collateral Amount:</Text>
            <Text style={styles.feeValue}>{application.collateralValue}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Paid to:</Text>
            <Text style={styles.feeValue}>BlockFinax Diamond (Staking)</Text>
          </View>
        </View>

        {!application.collateralPaid && (
          <TouchableOpacity
            style={styles.payFeeButton}
            onPress={handlePayCollateral}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={20}
                  color="white"
                />
                <Text style={styles.payFeeButtonText}>Pay Collateral</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {application.collateralPaid && (
          <View style={styles.paidBadge}>
            <MaterialCommunityIcons
              name="check"
              size={16}
              color={colors.success}
            />
            <Text style={styles.paidText}>Collateral Paid</Text>
          </View>
        )}
      </View>

      {/* Step 2: Issuance Fee Payment */}
      <View
        style={[
          styles.feePaymentCard,
          !application.collateralPaid && styles.disabledCard,
          application.issuanceFeePaid && styles.completedCard,
        ]}
      >
        <View style={styles.feeHeader}>
          <MaterialCommunityIcons
            name={
              application.issuanceFeePaid ? "check-circle" : "cash-multiple"
            }
            size={40}
            color={
              application.issuanceFeePaid
                ? colors.success
                : application.collateralPaid
                  ? colors.primary
                  : colors.textSecondary
            }
          />
          <View style={styles.feeHeaderText}>
            <Text
              style={[
                styles.feeTitle,
                !application.collateralPaid && styles.disabledText,
              ]}
            >
              Step 2: Issuance Fee Payment{" "}
              {application.issuanceFeePaid ? "✓" : ""}
            </Text>
            <Text
              style={[
                styles.feeAmount,
                !application.collateralPaid && styles.disabledText,
              ]}
            >
              {application.issuanceFee}
            </Text>
          </View>
        </View>

        <View style={styles.feeDivider} />

        <View style={styles.feeDetails}>
          <View style={styles.feeRow}>
            <Text
              style={[
                styles.feeLabel,
                !application.collateralPaid && styles.disabledText,
              ]}
            >
              Guarantee Amount:
            </Text>
            <Text
              style={[
                styles.feeValue,
                !application.collateralPaid && styles.disabledText,
              ]}
            >
              {application.guaranteeAmount}
            </Text>
          </View>
          <View style={styles.feeRow}>
            <Text
              style={[
                styles.feeLabel,
                !application.collateralPaid && styles.disabledText,
              ]}
            >
              Issuance Fee (1%):
            </Text>
            <Text
              style={[
                styles.feeValue,
                styles.feeHighlight,
                !application.collateralPaid && styles.disabledText,
              ]}
            >
              {application.issuanceFee}
            </Text>
          </View>
          <View style={styles.feeRow}>
            <Text
              style={[
                styles.feeLabel,
                !application.collateralPaid && styles.disabledText,
              ]}
            >
              Paid to:
            </Text>
            <Text
              style={[
                styles.feeValue,
                !application.collateralPaid && styles.disabledText,
              ]}
            >
              BlockFinax Treasury
            </Text>
          </View>
        </View>

        {!application.issuanceFeePaid && application.collateralPaid && (
          <TouchableOpacity
            style={[
              styles.payFeeButton,
              !application.collateralPaid && styles.disabledButton,
            ]}
            onPress={handlePayFee}
            disabled={isProcessing || !application.collateralPaid}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="cash" size={20} color="white" />
                <Text style={styles.payFeeButtonText}>Pay Issuance Fee</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {application.issuanceFeePaid && (
          <View style={styles.paidBadge}>
            <MaterialCommunityIcons
              name="check"
              size={16}
              color={colors.success}
            />
            <Text style={styles.paidText}>Issuance Fee Paid</Text>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Payment Steps</Text>
        <View style={styles.stepsList}>
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepNumber,
                application.collateralPaid && styles.stepNumberComplete,
              ]}
            >
              <Text style={styles.stepNumberText}>
                {application.collateralPaid ? "✓" : "1"}
              </Text>
            </View>
            <Text style={styles.stepText}>
              Pay collateral to Diamond (staking model)
            </Text>
          </View>
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepNumber,
                application.issuanceFeePaid && styles.stepNumberComplete,
                !application.collateralPaid && styles.stepNumberDisabled,
              ]}
            >
              <Text style={styles.stepNumberText}>
                {application.issuanceFeePaid ? "✓" : "2"}
              </Text>
            </View>
            <Text style={styles.stepText}>
              Pay issuance fee to BlockFinax Treasury
            </Text>
          </View>
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepNumber,
                !application.issuanceFeePaid && styles.stepNumberDisabled,
              ]}
            >
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Certificate generated and goods shipped
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFeePaidStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="cash-check"
          size={24}
          color={colors.success}
        />
        <Text style={styles.statusBannerText}>
          Fee paid - Certificate being generated
        </Text>
      </View>

      <View style={styles.successCard}>
        <MaterialCommunityIcons
          name="check-decagram"
          size={48}
          color={colors.success}
        />
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successMessage}>
          Your issuance fee of {application.issuanceFee} has been received.
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Processing Status</Text>
        <View style={styles.processingCard}>
          <MaterialCommunityIcons
            name="file-certificate"
            size={32}
            color={colors.warning}
          />
          <View style={styles.processingContent}>
            <Text style={styles.processingTitle}>
              Certificate Generation in Progress
            </Text>
            <Text style={styles.processingDescription}>
              Treasury is generating your pool guarantee certificate. This
              usually takes 24-48 hours. You'll be notified once it's ready.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.timelineSection}>
        <Text style={styles.sectionTitle}>Payment Timeline</Text>
        <View style={styles.timelineItem}>
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color={colors.success}
          />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Application Submitted</Text>
            <Text style={styles.timelineDate}>{application.submittedDate}</Text>
          </View>
        </View>
        <View style={styles.timelineItem}>
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color={colors.success}
          />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Seller Approved</Text>
            <Text style={styles.timelineDate}>Today</Text>
          </View>
        </View>
        <View style={styles.timelineItem}>
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color={colors.success}
          />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>Fee Paid</Text>
            <Text style={styles.timelineDate}>Just now</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderCertificateIssuedStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="certificate"
          size={24}
          color={colors.success}
        />
        <Text style={styles.statusBannerText}>
          Transaction Complete - Certificate Available
        </Text>
      </View>

      <View style={styles.certificateCard}>
        <View style={styles.certificateCardHeader}>
          <MaterialCommunityIcons
            name="shield-check"
            size={48}
            color={colors.success}
          />
          <View style={styles.certificateCardInfo}>
            <Text style={styles.certificateCardTitle}>
              Pool Guarantee Certificate
            </Text>
            <Text style={styles.certificateCardSubtitle}>
              Certificate No: {application.guaranteeNo}
            </Text>
            <Text style={styles.certificateCardAmount}>
              {application.guaranteeAmount}
            </Text>
          </View>
        </View>

        <View style={styles.certificateActions}>
          <TouchableOpacity
            style={styles.certificateActionButton}
            onPress={() => setShowFullCertificate(true)}
          >
            <MaterialCommunityIcons
              name="eye"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.certificateActionText}>View Certificate</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.certificateActionButton}>
            <MaterialCommunityIcons
              name="download"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.certificateActionText}>Download PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Transaction Finalized</Text>
        <View style={styles.alertCard}>
          <MaterialCommunityIcons
            name="check-circle"
            size={32}
            color={colors.success}
          />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>All Steps Completed</Text>
            <Text style={styles.alertDescription}>
              This trade finance transaction has been fully settled and the
              certificate is now valid for your records.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderGoodsShippedStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons name="truck" size={24} color={colors.primary} />
        <Text style={styles.statusBannerText}>
          Goods shipped - Awaiting delivery confirmation
        </Text>
      </View>

      {application.proofOfShipment && (
        <View style={styles.shippingCard}>
          <View style={styles.shippingHeader}>
            <MaterialCommunityIcons
              name="package-variant"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.shippingTitle}>Shipping Information</Text>
          </View>

          <View style={styles.shippingDetails}>
            <View style={styles.shippingRow}>
              <Text style={styles.shippingLabel}>Tracking Number:</Text>
              <Text style={styles.shippingValue}>
                {application.proofOfShipment.trackingNumber}
              </Text>
            </View>
            <View style={styles.shippingRow}>
              <Text style={styles.shippingLabel}>Carrier:</Text>
              <Text style={styles.shippingValue}>
                {application.proofOfShipment.carrier}
              </Text>
            </View>
            <View style={styles.shippingRow}>
              <Text style={styles.shippingLabel}>Shipped Date:</Text>
              <Text style={styles.shippingValue}>
                {application.proofOfShipment.shippingDate}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.trackShipmentButton}>
            <MaterialCommunityIcons
              name="map-marker-path"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.trackShipmentButtonText}>Track Shipment</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Shipment Status</Text>
        <View style={styles.alertCard}>
          <MaterialCommunityIcons
            name="truck-fast"
            size={32}
            color={colors.warning}
          />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Goods In Transit</Text>
            <Text style={styles.alertDescription}>
              Your goods have been shipped and are on their way. Track the
              shipment above and confirm delivery once you receive the goods.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.nextStepsCard}>
        <MaterialCommunityIcons
          name="information"
          size={24}
          color={colors.primary}
        />
        <View style={styles.nextStepsContent}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>
          <Text style={styles.nextStepsText}>
            Once you receive the goods, inspect them carefully and confirm
            delivery. After confirmation, you'll proceed to invoice payment.
          </Text>
        </View>
      </View>

      <View style={styles.deliveryActionCard}>
        <MaterialCommunityIcons
          name="check-decagram"
          size={40}
          color={colors.success}
        />
        <View style={styles.deliveryActionContent}>
          <Text style={styles.deliveryActionTitle}>
            Confirm Delivery When Received
          </Text>
          <Text style={styles.deliveryActionDescription}>
            Once you receive and inspect the goods, confirm delivery to proceed
            with invoice payment.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.confirmDeliveryButton}
          onPress={handleConfirmDelivery}
        >
          <MaterialCommunityIcons
            name="checkbox-marked-circle"
            size={20}
            color="white"
          />
          <Text style={styles.confirmDeliveryButtonText}>Confirm Delivery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDeliveryConfirmedStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="truck-delivery"
          size={24}
          color={colors.success}
        />
        <Text style={styles.statusBannerText}>
          Delivery confirmed - Ready for invoice payment
        </Text>
      </View>

      <View style={styles.successCard}>
        <MaterialCommunityIcons
          name="check-decagram"
          size={48}
          color={colors.success}
        />
        <Text style={styles.successTitle}>Delivery Confirmed!</Text>
        <Text style={styles.successMessage}>
          You have confirmed receipt of the goods. You can now proceed to pay
          the invoice.
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        {application.proofOfShipment && (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tracking Number:</Text>
              <Text style={styles.summaryValue}>
                {application.proofOfShipment.trackingNumber}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Carrier:</Text>
              <Text style={styles.summaryValue}>
                {application.proofOfShipment.carrier}
              </Text>
            </View>
          </>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Goods Received:</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            ✓ Confirmed
          </Text>
        </View>
      </View>

      <View style={styles.nextStepsCard}>
        <MaterialCommunityIcons
          name="information"
          size={24}
          color={colors.primary}
        />
        <View style={styles.nextStepsContent}>
          <Text style={styles.nextStepsTitle}>Next Step: Invoice Payment</Text>
          <Text style={styles.nextStepsText}>
            The invoice payment stage is next. You'll be able to review and pay
            the invoice to complete the transaction.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderInvoicePaidStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="receipt"
          size={24}
          color={colors.primary}
        />
        <Text style={styles.statusBannerText}>
          {application.status === "Invoice Settled"
            ? "Invoice settled - Request your certificate"
            : "Delivery confirmed - Pay invoice to complete transaction"}
        </Text>
      </View>

      <View style={styles.invoiceCard}>
        <View style={styles.invoiceHeader}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={40}
            color={
              application.status === "Invoice Settled"
                ? colors.success
                : colors.primary
            }
          />
          <View style={styles.invoiceHeaderText}>
            <Text style={styles.invoiceTitle}>
              {application.status === "Invoice Settled"
                ? "Invoice Paid"
                : "Invoice Payment Required"}
            </Text>
            <Text style={styles.invoiceAmount}>
              {application.invoiceAmount || application.guaranteeAmount}
            </Text>
          </View>
        </View>

        <View style={styles.invoiceDivider} />

        <View style={styles.invoiceDetails}>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Guarantee Amount:</Text>
            <Text style={styles.invoiceValue}>
              {application.guaranteeAmount}
            </Text>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceLabel}>Invoice Amount:</Text>
            <Text style={[styles.invoiceValue, styles.invoiceHighlight]}>
              {application.invoiceAmount || application.guaranteeAmount}
            </Text>
          </View>
          {application.status === "Invoice Settled" && (
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Status:</Text>
              <Text style={[styles.invoiceValue, { color: colors.success }]}>
                Paid
              </Text>
            </View>
          )}
        </View>

        {application.status === "Invoice Settled" ? (
          <TouchableOpacity
            style={[
              styles.payInvoiceButton,
              { backgroundColor: colors.success },
            ]}
            onPress={onIssueCertificate}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="certificate"
                  size={20}
                  color="white"
                />
                <Text style={styles.payInvoiceButtonText}>
                  Issue Certificate
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.payInvoiceButton}
            onPress={handlePayInvoice}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="cash" size={20} color="white" />
                <Text style={styles.payInvoiceButtonText}>Pay Invoice</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Transaction Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Goods Received:</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            ✓ Confirmed
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Seller:</Text>
          <Text style={styles.summaryValue}>
            {application.beneficiary.name || "Seller"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Trade Description:</Text>
          <Text style={styles.summaryValue} numberOfLines={2}>
            {application.tradeDescription}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPaymentCompleteStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.successBanner}>
        <MaterialCommunityIcons
          name="trophy"
          size={64}
          color={colors.success}
        />
        <Text style={styles.successBannerTitle}>Transaction Complete!</Text>
        <Text style={styles.successBannerSubtitle}>
          All payments settled successfully
        </Text>
      </View>

      <View style={styles.completionCard}>
        <Text style={styles.completionTitle}>Transaction Summary</Text>

        <View style={styles.completionDetails}>
          <View style={styles.completionRow}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success}
            />
            <View style={styles.completionInfo}>
              <Text style={styles.completionLabel}>Application Approved</Text>
              <Text style={styles.completionValue}>
                {application.requestId}
              </Text>
            </View>
          </View>

          <View style={styles.completionRow}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success}
            />
            <View style={styles.completionInfo}>
              <Text style={styles.completionLabel}>Certificate Issued</Text>
              <Text style={styles.completionValue}>
                {application.guaranteeNo}
              </Text>
            </View>
          </View>

          <View style={styles.completionRow}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success}
            />
            <View style={styles.completionInfo}>
              <Text style={styles.completionLabel}>Goods Delivered</Text>
              <Text style={styles.completionValue}>Confirmed</Text>
            </View>
          </View>

          <View style={styles.completionRow}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={colors.success}
            />
            <View style={styles.completionInfo}>
              <Text style={styles.completionLabel}>Invoice Paid</Text>
              <Text style={styles.completionValue}>
                {application.invoiceAmount || application.guaranteeAmount}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.finalActionsCard}>
        <TouchableOpacity style={styles.finalActionButton}>
          <MaterialCommunityIcons
            name="file-download"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.finalActionButtonText}>
            Download Transaction Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.finalActionButton}>
          <MaterialCommunityIcons
            name="certificate"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.finalActionButtonText}>View Certificate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStageIndicator()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          ) : undefined
        }
      >
        {renderStageContent()}
      </ScrollView>

      {/* Full Certificate Modal */}
      <Modal
        visible={showFullCertificate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFullCertificate(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pool Guarantee Certificate</Text>
            <TouchableOpacity onPress={() => setShowFullCertificate(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.certificateFullHeader}>
              <Text style={styles.certificateFullTitle}>
                Pool Guarantee Certificate -{" "}
                {application.currentStage < 4 ? "DRAFT" : "ISSUED"}
              </Text>
              <Text style={styles.certificateFullSubtitle}>
                SWIFT MT 710 Format - ICC URDG 758 Compliant
              </Text>
            </View>

            <View style={styles.certificateFullSection}>
              <Text style={styles.certificateFullSectionTitle}>
                Draft Review: Full Application Details
              </Text>

              {/* Company Info */}
              <Text style={styles.reviewSubTitle}>Company Information</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Company Name:</Text>
                <Text style={styles.reviewValue}>
                  {application.applicant?.company ||
                    application.companyName ||
                    "N/A"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Registration:</Text>
                <Text style={styles.reviewValue}>
                  {application.applicant?.registration || "N/A"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Country:</Text>
                <Text style={styles.reviewValue}>
                  {application.applicant?.country || "N/A"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Contact Person:</Text>
                <Text style={styles.reviewValue}>
                  {application.applicant?.contact || "N/A"}
                </Text>
              </View>

              {/* Trade Details */}
              <Text style={styles.reviewSubTitle}>Trade Details</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Description:</Text>
                <Text style={styles.reviewValue}>
                  {application.tradeDescription}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Total Trade Value:</Text>
                <Text style={styles.reviewValue}>{application.tradeValue}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Guarantee Amount:</Text>
                <Text style={styles.reviewValue}>
                  {application.guaranteeAmount}
                </Text>
              </View>

              {/* Financial & Documents */}
              <Text style={styles.reviewSubTitle}>Financial & Documents</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Collateral Info:</Text>
                <Text style={styles.reviewValue}>
                  {application.collateralDescription || "N/A"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Seller Wallet:</Text>
                <Text style={styles.reviewValue}>
                  {application.beneficiary?.walletAddress || "N/A"}
                </Text>
              </View>

              <View style={styles.documentLinks}>
                {application.proformaInvoiceIpfs && (
                  <TouchableOpacity
                    style={styles.docLink}
                    onPress={() =>
                      Alert.alert(
                        "Document Link",
                        application.proformaInvoiceIpfs?.url,
                      )
                    }
                  >
                    <MaterialCommunityIcons
                      name="file-pdf-box"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.docLinkText}>
                      View Proforma Invoice
                    </Text>
                  </TouchableOpacity>
                )}
                {application.salesContractIpfs && (
                  <TouchableOpacity
                    style={styles.docLink}
                    onPress={() =>
                      Alert.alert(
                        "Document Link",
                        application.salesContractIpfs?.url,
                      )
                    }
                  >
                    <MaterialCommunityIcons
                      name="file-pdf-box"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.docLinkText}>View Sales Contract</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.certificateFullSection}>
              <Text style={styles.certificateFullSectionTitle}>
                Application Summary
              </Text>
              <Text style={styles.certificateFullText}>
                Request ID: {application.requestId}
              </Text>
              <Text style={styles.certificateFullText}>
                Status: {application.status}
              </Text>
            </View>

            <View style={styles.certificateFullSection}>
              <Text style={styles.certificateFullSectionTitle}>
                Certificate Content
              </Text>
              <View style={styles.certificateContentBox}>
                <Text style={styles.certificateContentText}>
                  {application.content}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.downloadPdfButton}>
              <MaterialCommunityIcons
                name="download"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.downloadPdfButtonText}>Download as PDF</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <DocumentViewerModal
        visible={viewerVisible}
        url={viewerUrl}
        title="Document Viewer"
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  stageContainer: {
    backgroundColor: "white",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stageHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  stageScrollView: {
    flexGrow: 0,
  },
  stagesRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stageItem: {
    alignItems: "center",
    width: 70,
  },
  stageCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  stageCircleCompleted: {
    backgroundColor: colors.success,
  },
  stageCircleCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: "#E0E7FF",
  },
  stageCirclePending: {
    backgroundColor: colors.border,
  },
  stageLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
  },
  stageLabelActive: {
    color: colors.text,
    fontWeight: "600",
  },
  stageConnector: {
    width: 30,
    height: 2,
    backgroundColor: colors.border,
    marginBottom: 30,
  },
  stageConnectorCompleted: {
    backgroundColor: colors.success,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  stageContent: {
    gap: spacing.lg,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3CD",
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statusBannerText: {
    flex: 1,
    fontSize: 14,
    color: "#856404",
    fontWeight: "500",
  },
  successBanner: {
    alignItems: "center",
    backgroundColor: "#D4EDDA",
    borderRadius: 12,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  successBannerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.success,
  },
  successBannerSubtitle: {
    fontSize: 14,
    color: "#155724",
  },
  infoSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  amountHighlight: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  addressText: {
    fontSize: 11,
    fontFamily: "monospace",
  },
  nextStepsCard: {
    flexDirection: "row",
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  nextStepsContent: {
    flex: 1,
  },
  nextStepsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.xs / 2,
  },
  nextStepsText: {
    fontSize: 13,
    color: "#0369A1",
    lineHeight: 18,
  },
  statusCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
  },
  statusCardContent: {
    flex: 1,
  },
  statusCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  statusCardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  viewCertificateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
  },
  viewCertificateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  documentsSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  documentHash: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
  feePaymentCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  feeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  feeHeaderText: {
    flex: 1,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  feeAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  feeDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  feeDetails: {
    marginBottom: spacing.md,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  feeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  feeValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
  },
  feeHighlight: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  payFeeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  payFeeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  completedCard: {
    opacity: 0.7,
    borderColor: colors.success,
  },
  disabledCard: {
    opacity: 0.5,
    backgroundColor: colors.surface,
  },
  disabledText: {
    color: colors.textSecondary,
  },
  disabledButton: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    backgroundColor: colors.success + "20",
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  paidText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
  stepsList: {
    gap: spacing.md,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberComplete: {
    backgroundColor: colors.success,
  },
  stepNumberDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  successCard: {
    alignItems: "center",
    backgroundColor: "#D4EDDA",
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.success,
  },
  successMessage: {
    fontSize: 14,
    color: "#155724",
    textAlign: "center",
  },
  processingCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: "#FFF3CD",
    borderRadius: 8,
  },
  processingContent: {
    flex: 1,
  },
  processingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#856404",
    marginBottom: spacing.xs / 2,
  },
  processingDescription: {
    fontSize: 13,
    color: "#856404",
    lineHeight: 18,
  },
  timelineSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineItem: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  timelineDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  certificateCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.success,
  },
  certificateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  certificateCardInfo: {
    flex: 1,
  },
  certificateCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  certificateCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  certificateCardAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.success,
    marginTop: spacing.xs,
  },
  certificateActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  certificateActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
  },
  certificateActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  alertCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.xs / 2,
  },
  alertDescription: {
    fontSize: 13,
    color: "#0369A1",
    lineHeight: 18,
  },
  shippingCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shippingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  shippingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  shippingDetails: {
    marginBottom: spacing.md,
  },
  shippingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  shippingLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  shippingValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
  },
  trackShipmentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
  },
  trackShipmentButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  deliveryActionCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.success,
    alignItems: "center",
  },
  deliveryActionContent: {
    alignItems: "center",
    marginVertical: spacing.md,
  },
  deliveryActionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  deliveryActionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  confirmDeliveryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.success,
    borderRadius: 8,
    width: "100%",
  },
  confirmDeliveryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  invoiceCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  invoiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  invoiceHeaderText: {
    flex: 1,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  invoiceAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  invoiceDetails: {
    marginBottom: spacing.md,
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  invoiceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  invoiceValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
  },
  invoiceHighlight: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  payInvoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  payInvoiceButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  completionCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  completionDetails: {
    gap: spacing.md,
  },
  completionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  completionInfo: {
    flex: 1,
  },
  completionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  completionValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  finalActionsCard: {
    gap: spacing.md,
  },
  finalActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
  },
  finalActionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
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
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  certificateFullHeader: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  certificateFullTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  certificateFullSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  certificateFullSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  certificateFullSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  certificateFullText: {
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  certificateContentBox: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: spacing.md,
  },
  certificateContentText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: "monospace",
    lineHeight: 18,
  },
  downloadPdfButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  downloadPdfButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  reviewSubTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "40",
  },
  reviewLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  reviewValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
    flex: 2,
    textAlign: "right",
  },
  documentLinks: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  docLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "10",
    padding: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  docLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
});
