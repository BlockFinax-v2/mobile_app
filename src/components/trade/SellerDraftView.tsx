import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { DocumentViewerModal } from "@/components/documents/DocumentViewerModal";

interface DraftData {
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
  };
  tradeDescription: string;
  collateralDescription: string;
  guaranteeAmount: string;
  collateralValue: string;
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
  documents?: string[];
  proofOfShipment?: {
    trackingNumber?: string;
    carrier?: string;
    shippingDate?: string;
  };
  invoiceAmount?: string;
  invoicePaidDate?: string;
}

interface SellerDraftViewProps {
  draft: DraftData;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}

const STAGE_TITLES = [
  "Applied",
  "Pool Review",
  "Seller Review",
  "Approved",
  "Cert Issued",
  "Goods Shipped",
  "Delivery Confirmed",
  "Invoice Paid",
  "Complete",
];

const STAGE_ICONS = [
  "file-document-edit",
  "send",
  "check-circle",
  "cash",
  "certificate",
  "truck",
  "truck-delivery",
  "receipt",
  "trophy",
];

export const SellerDraftView: React.FC<SellerDraftViewProps> = ({
  draft,
  onApprove,
  onReject,
  onClose,
}) => {
  const [showFullCertificate, setShowFullCertificate] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

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
              const isCompleted = stageNumber < draft.currentStage;
              const isCurrent = stageNumber === draft.currentStage;
              const isPending = stageNumber > draft.currentStage;

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
    switch (draft.currentStage) {
      case 1: // Applied
        return renderAppliedStage();
      case 2: // Pool Review
        return renderPoolReviewStage();
      case 3: // Seller Review
        return renderSellerReviewStage();
      case 4: // Approved
        return renderApprovedStage();
      case 5: // Certificate Issued
        return renderCertificateIssuedStage();
      case 6: // Goods Shipped
        return renderGoodsShippedStage();
      case 7: // Delivery Confirmed
        return renderDeliveryConfirmedStage();
      case 8: // Invoice Paid
        return renderInvoicePaidStage();
      case 9: // Payment Complete
        return renderPaymentCompleteStage();
      default:
        return renderAppliedStage();
    }
  };

  const renderAppliedStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={24}
          color={colors.warning}
        />
        <Text style={styles.statusBannerText}>
          Application submitted and awaiting treasury review
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Application Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Request ID:</Text>
          <Text style={styles.infoValue}>{draft.requestId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Company:</Text>
          <Text style={styles.infoValue}>{draft.applicant.company}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Guarantee Amount:</Text>
          <Text style={[styles.infoValue, styles.amountHighlight]}>
            {draft.guaranteeAmount}
          </Text>
        </View>
      </View>
    </View>
  );

  const viewDocument = (url: string) => {
    setViewerUrl(url);
    setViewerVisible(true);
  };

  const renderPoolReviewStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={24}
          color={colors.warning}
        />
        <Text style={styles.statusBannerText}>
          Awaiting financier approval - Documents under review
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Application Details</Text>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Company Name:</Text>
          <Text style={styles.reviewValue}>{draft.applicant.company}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Registration:</Text>
          <Text style={styles.reviewValue}>{draft.applicant.registration}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Trade Value:</Text>
          <Text style={styles.reviewValue}>{draft.invoiceAmount || "N/A"}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Guarantee Amount:</Text>
          <Text style={[styles.reviewValue, styles.amountHighlight]}>
            {draft.guaranteeAmount}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Collateral Amount:</Text>
          <Text style={styles.reviewValue}>{draft.collateralValue}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Duration:</Text>
          <Text style={styles.reviewValue}>{draft.financingDuration} days</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Trade Description</Text>
        <Text style={styles.tradeDescriptionText}>
          {draft.tradeDescription}
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Submitted Documents</Text>
        <View style={styles.documentLinks}>
          {draft.proformaInvoiceIpfs && (
            <TouchableOpacity
              style={styles.docLink}
              onPress={() => viewDocument(draft.proformaInvoiceIpfs!.url)}
            >
              <MaterialCommunityIcons
                name="file-pdf-box"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.docLinkText}>View Proforma Invoice</Text>
            </TouchableOpacity>
          )}
          {draft.salesContractIpfs && (
            <TouchableOpacity
              style={styles.docLink}
              onPress={() => viewDocument(draft.salesContractIpfs!.url)}
            >
              <MaterialCommunityIcons
                name="file-pdf-box"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.docLinkText}>View Sales Contract</Text>
            </TouchableOpacity>
          )}
          {!draft.proformaInvoiceIpfs &&
            !draft.salesContractIpfs &&
            draft.documents &&
            draft.documents.length > 0 &&
            draft.documents.map((url, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.docLink}
                onPress={() =>
                  viewDocument(
                    url.replace(
                      "ipfs://",
                      "https://gateway.pinata.cloud/ipfs/",
                    ),
                  )
                }
              >
                <MaterialCommunityIcons
                  name="file-document"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.docLinkText}>View Document {idx + 1}</Text>
              </TouchableOpacity>
            ))}
        </View>
      </View>
    </View>
  );

  const renderSellerReviewStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="email-alert"
          size={24}
          color={colors.primary}
        />
        <Text style={styles.statusBannerText}>
          The pool has approved! - Awaiting your final approval
        </Text>
      </View>

      <View style={styles.certificatePreview}>
        <View style={styles.certificateHeader}>
          <MaterialCommunityIcons
            name="certificate"
            size={32}
            color={colors.primary}
          />
          <View style={styles.certificateHeaderText}>
            <Text style={styles.certificateTitle}>
              Pool Guarantee Certificate - DRAFT
            </Text>
            <Text style={styles.certificateSubtitle}>
              SWIFT MT 710 Format - ICC URDG 758 Compliant
            </Text>
          </View>
        </View>

        <View style={styles.applicationDetails}>
          <Text style={styles.detailsTitle}>Application Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Request ID:</Text>
            <Text style={styles.detailValue}>{draft.requestId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Company:</Text>
            <Text style={styles.detailValue}>{draft.applicant.company}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Guarantee Amount:</Text>
            <Text style={[styles.detailValue, styles.amountHighlight]}>
              {draft.guaranteeAmount}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[styles.detailValue, { color: colors.primary }]}>
              AWAITING YOUR APPROVAL
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.viewDraftButton}
          onPress={() => setShowFullCertificate(true)}
        >
          <MaterialCommunityIcons name="eye" size={20} color={colors.primary} />
          <Text style={styles.viewDraftButtonText}>View Draft Certificate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Submitted Documents</Text>
        <View style={styles.documentLinks}>
          {draft.proformaInvoiceIpfs && (
            <TouchableOpacity
              style={styles.docLink}
              onPress={() => viewDocument(draft.proformaInvoiceIpfs!.url)}
            >
              <MaterialCommunityIcons
                name="file-pdf-box"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.docLinkText}>View Proforma Invoice</Text>
            </TouchableOpacity>
          )}
          {draft.salesContractIpfs && (
            <TouchableOpacity
              style={styles.docLink}
              onPress={() => viewDocument(draft.salesContractIpfs!.url)}
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

      <View style={styles.decisionSection}>
        <Text style={styles.decisionTitle}>Your Decision & Obligations</Text>
        <View style={styles.obligationsList}>
          <View style={styles.obligationItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={18}
              color={colors.success}
            />
            <Text style={styles.obligationText}>
              Review the payment guarantee details above
            </Text>
          </View>
          <View style={styles.obligationItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={18}
              color={colors.success}
            />
            <Text style={styles.obligationText}>
              Ensure shipping dates align with your schedule
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
          <MaterialCommunityIcons name="close" size={20} color="white" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.approveButton} onPress={onApprove}>
          <MaterialCommunityIcons name="check" size={20} color="white" />
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
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
          Draft approved - Waiting for buyer to pay issuance fee
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Next Steps</Text>
        <View style={styles.stepCard}>
          <MaterialCommunityIcons
            name="account-cash"
            size={32}
            color={colors.primary}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Buyer Fee Payment</Text>
            <Text style={styles.stepDescription}>
              The buyer needs to pay the issuance fee of {draft.issuanceFee} to
              proceed with certificate issuance.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Approved Certificate Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Guarantee Amount:</Text>
          <Text style={[styles.infoValue, styles.amountHighlight]}>
            {draft.guaranteeAmount}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Issuance Fee:</Text>
          <Text style={styles.infoValue}>{draft.issuanceFee}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment Due:</Text>
          <Text style={styles.infoValue}>{draft.paymentDueDate}</Text>
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
          Fee paid - Certificate issuance in progress
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Processing Status</Text>
        <View style={styles.stepCard}>
          <MaterialCommunityIcons
            name="file-certificate"
            size={32}
            color={colors.warning}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Certificate Generation</Text>
            <Text style={styles.stepDescription}>
              Treasury is generating your pool guarantee certificate. This
              usually takes 24-48 hours.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Payment Confirmation</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Issuance Fee Paid:</Text>
          <Text style={[styles.infoValue, { color: colors.success }]}>
            ✓ {draft.issuanceFee}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Paid By:</Text>
          <Text style={styles.infoValue}>{draft.applicant.company}</Text>
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
          Certificate issued - Awaiting delivery confirmation
        </Text>
      </View>

      <View style={styles.certificateCard}>
        <View style={styles.certificateCardHeader}>
          <MaterialCommunityIcons
            name="shield-check"
            size={40}
            color={colors.success}
          />
          <View style={styles.certificateCardInfo}>
            <Text style={styles.certificateCardTitle}>
              Pool Guarantee Certificate
            </Text>
            <Text style={styles.certificateCardSubtitle}>
              Certificate No: {draft.guaranteeNo}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => setShowFullCertificate(true)}
        >
          <MaterialCommunityIcons
            name="download"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.downloadButtonText}>Download Certificate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Next Steps</Text>
        <View style={styles.stepCard}>
          <MaterialCommunityIcons
            name="truck-delivery"
            size={32}
            color={colors.primary}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Ship Goods</Text>
            <Text style={styles.stepDescription}>
              You can now ship the goods to the buyer. The certificate
              guarantees payment upon delivery confirmation.
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
          Goods shipped - Awaiting buyer's delivery confirmation
        </Text>
      </View>

      {draft.proofOfShipment && (
        <View style={styles.shippingCard}>
          <View style={styles.shippingHeader}>
            <MaterialCommunityIcons
              name="package-variant"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.shippingTitle}>Shipment Details</Text>
          </View>

          <View style={styles.shippingDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tracking Number:</Text>
              <Text style={styles.detailValue}>
                {draft.proofOfShipment.trackingNumber}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Carrier:</Text>
              <Text style={styles.detailValue}>
                {draft.proofOfShipment.carrier}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Shipped Date:</Text>
              <Text style={styles.detailValue}>
                {draft.proofOfShipment.shippingDate}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Shipment Status</Text>
        <View style={styles.stepCard}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={32}
            color={colors.warning}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Goods In Transit</Text>
            <Text style={styles.stepDescription}>
              Your shipment is on the way to the buyer. Once they receive and
              confirm delivery, you'll be able to proceed with invoice payment.
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
            Wait for the buyer to receive and inspect the goods. After they
            confirm delivery, the transaction will proceed to invoice payment.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderDeliveryConfirmedStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="truck-check"
          size={24}
          color={colors.success}
        />
        <Text style={styles.statusBannerText}>
          Delivery confirmed - Awaiting invoice payment
        </Text>
      </View>

      {draft.proofOfShipment && (
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Shipping Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tracking Number:</Text>
            <Text style={styles.infoValue}>
              {draft.proofOfShipment.trackingNumber}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Carrier:</Text>
            <Text style={styles.infoValue}>
              {draft.proofOfShipment.carrier}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shipped Date:</Text>
            <Text style={styles.infoValue}>
              {draft.proofOfShipment.shippingDate}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.stepCard}>
          <MaterialCommunityIcons
            name="cash"
            size={32}
            color={colors.success}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Invoice Settlement</Text>
            <Text style={styles.stepDescription}>
              The buyer will now settle the invoice. Payment is guaranteed by
              the pool.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderInvoicePaidStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.statusBanner}>
        <MaterialCommunityIcons
          name="cash-check"
          size={24}
          color={colors.success}
        />
        <Text style={styles.statusBannerText}>
          Invoice settled - Processing final payment
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Payment Confirmation</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Invoice Amount:</Text>
          <Text style={[styles.infoValue, styles.amountHighlight]}>
            {draft.invoiceAmount || draft.guaranteeAmount}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment Status:</Text>
          <Text style={[styles.infoValue, { color: colors.success }]}>
            ✓ Paid in Full
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Paid Date:</Text>
          <Text style={styles.infoValue}>
            {draft.invoicePaidDate || "Processing..."}
          </Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Final Processing</Text>
        <View style={styles.stepCard}>
          <MaterialCommunityIcons
            name="clock-check-outline"
            size={32}
            color={colors.primary}
          />
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Transaction Finalization</Text>
            <Text style={styles.stepDescription}>
              Your payment is being processed and will be available shortly.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPaymentCompleteStage = () => (
    <View style={styles.stageContent}>
      <View style={styles.successBanner}>
        <MaterialCommunityIcons
          name="trophy"
          size={48}
          color={colors.success}
        />
        <Text style={styles.successTitle}>Transaction Complete!</Text>
        <Text style={styles.successSubtitle}>
          All obligations have been fulfilled
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Transaction Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Guarantee Amount:</Text>
          <Text style={[styles.summaryValue, styles.amountHighlight]}>
            {draft.guaranteeAmount}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Invoice Paid:</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            ✓ {draft.invoiceAmount || draft.guaranteeAmount}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Buyer:</Text>
          <Text style={styles.summaryValue}>{draft.applicant.company}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Status:</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            ✓ COMPLETED
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.downloadReportButton}>
        <MaterialCommunityIcons name="file-download" size={20} color="white" />
        <Text style={styles.downloadReportButtonText}>
          Download Transaction Report
        </Text>
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Pool Guarantee Draft</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStageIndicator()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
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
                Pool Guarantee Certificate - DRAFT
              </Text>
              <Text style={styles.certificateFullSubtitle}>
                SWIFT MT 710 Format - ICC URDG 758 Compliant
              </Text>
            </View>

            <View style={styles.certificateFullSection}>
              <Text style={styles.certificateFullSectionTitle}>
                Registration Review: Full Profile
              </Text>

              {/* Company Info */}
              <Text style={styles.reviewSubTitle}>Applicant Information</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Company Name:</Text>
                <Text style={styles.reviewValue}>
                  {draft.applicant.company}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Registration:</Text>
                <Text style={styles.reviewValue}>
                  {draft.applicant.registration}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Country:</Text>
                <Text style={styles.reviewValue}>
                  {draft.applicant.country}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Contact Person:</Text>
                <Text style={styles.reviewValue}>
                  {draft.applicant.contact}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Email:</Text>
                <Text style={styles.reviewValue}>{draft.applicant.email}</Text>
              </View>

              {/* Trade Details */}
              <Text style={styles.reviewSubTitle}>Trade Details</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Description:</Text>
                <Text style={styles.reviewValue}>{draft.tradeDescription}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Guarantee Amount:</Text>
                <Text style={styles.reviewValue}>{draft.guaranteeAmount}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Financing Duration:</Text>
                <Text style={styles.reviewValue}>
                  {draft.financingDuration} days
                </Text>
              </View>

              {/* Financials */}
              <Text style={styles.reviewSubTitle}>Financials</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Collateral Info:</Text>
                <Text style={styles.reviewValue}>
                  {draft.collateralDescription}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Collateral Value:</Text>
                <Text style={styles.reviewValue}>{draft.collateralValue}</Text>
              </View>
            </View>

            <View style={styles.certificateFullSection}>
              <Text style={styles.certificateFullSectionTitle}>
                Application ID
              </Text>
              <Text style={styles.certificateFullText}>
                Request ID: {draft.requestId}
              </Text>
              <Text style={styles.certificateFullText}>
                Status: {draft.status}
              </Text>
            </View>

            <View style={styles.certificateFullSection}>
              <Text style={styles.certificateFullSectionTitle}>
                Certificate Content
              </Text>
              <View style={styles.certificateContentBox}>
                <Text style={styles.certificateContentText}>
                  {draft.content}
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
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.success,
  },
  successSubtitle: {
    fontSize: 14,
    color: "#155724",
  },
  certificatePreview: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  certificateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  certificateHeaderText: {
    flex: 1,
  },
  certificateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  certificateSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  applicationDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
  },
  amountHighlight: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  viewDraftButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
  },
  viewDraftButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  decisionSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  decisionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  obligationsList: {
    gap: spacing.sm,
  },
  obligationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  obligationText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.error,
    borderRadius: 8,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.success,
    borderRadius: 8,
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
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
  },
  stepCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  stepDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
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
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
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
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  downloadReportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  downloadReportButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
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
    gap: spacing.sm,
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
  statusCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    alignItems: "center",
  },
  statusCardContent: {
    flex: 1,
  },
  statusCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  statusCardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  tradeDescriptionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    backgroundColor: "#F8F9FA",
    padding: spacing.md,
    borderRadius: 8,
  },
  documentLinks: {
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
