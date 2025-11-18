import { StyleSheet } from 'react-native';
import { colors, palette } from './colors';
import { spacing } from './spacing';

/**
 * Common reusable styles across the app
 * This eliminates duplicate StyleSheet.create calls and ensures consistency
 */

// Card Styles - Used extensively across all screens
export const cardStyles = StyleSheet.create({
  // Base card style
  base: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Card with larger border radius (24px)
  large: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Primary colored header card
  primaryHeader: {
    backgroundColor: palette.primaryBlue,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  // Gradient-style card
  gradient: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  // Warning/alert card
  warning: {
    backgroundColor: palette.warningYellow + '15',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.warningYellow + '30',
  },

  // Success card
  success: {
    backgroundColor: palette.successGreen + '15',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.successGreen + '30',
  },

  // Error card
  error: {
    backgroundColor: palette.errorRed + '15',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.errorRed + '30',
  },
});

// Layout Styles - Common layout patterns
export const layoutStyles = StyleSheet.create({
  // Common container
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Centered container
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content padding
  content: {
    padding: spacing.lg,
  },

  // Section with margin bottom
  section: {
    marginBottom: spacing.lg,
  },

  // Row layouts
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  rowWithGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  // Header layouts
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerCentered: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
});

// Button Styles - Extended button variations
export const buttonStyles = StyleSheet.create({
  // Primary action button
  primaryAction: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  // Secondary button
  secondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    gap: spacing.xs,
  },

  // Small action button
  small: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Icon button
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // Disabled button
  disabled: {
    opacity: 0.5,
  },
});

// Status Badge Styles - For status indicators
export const statusStyles = StyleSheet.create({
  // Base badge
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Status specific badges
  success: {
    backgroundColor: colors.success + '20',
  },

  pending: {
    backgroundColor: colors.warning + '20',
  },

  error: {
    backgroundColor: colors.error + '20',
  },

  active: {
    backgroundColor: colors.primary + '20',
  },

  // Status text colors
  successText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '500',
  },

  pendingText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '500',
  },

  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '500',
  },

  activeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },

  // Status dot (small circle indicator)
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

// Form Styles - Common form elements
export const formStyles = StyleSheet.create({
  // Form container
  container: {
    gap: spacing.md,
  },

  // Form section
  section: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },

  // Form field
  field: {
    gap: spacing.xs,
  },

  // Form label
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },

  // Form input
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: 'white',
  },

  // Text area input
  textArea: {
    height: 96,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',
  },

  // Form row (side by side fields)
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  fieldHalf: {
    flex: 1,
  },

  // Form actions
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },

  // Helper text
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Error text
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
});

// Modal Styles - Common modal layouts
export const modalStyles = StyleSheet.create({
  // Modal backdrop
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  // Modal container
  container: {
    flex: 1,
    backgroundColor: 'white',
  },

  // Modal header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Modal content
  content: {
    flex: 1,
    padding: spacing.lg,
  },

  // Modal footer/actions
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Modal title
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },

  // Modal subtitle
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
});

// Text Styles - Common text patterns
export const textStyles = StyleSheet.create({
  // Page title
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  // Page subtitle
  pageSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Section title
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  // Section subtitle
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // Card title
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },

  // Detail label
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Detail value
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },

  // Monospace text (addresses, hashes)
  monospace: {
    fontFamily: 'monospace',
    fontSize: 14,
  },

  // White text (for dark backgrounds)
  white: {
    color: 'white',
  },

  // Primary color text
  primary: {
    color: colors.primary,
  },

  // Success color text
  success: {
    color: colors.success,
  },

  // Error color text
  error: {
    color: colors.error,
  },

  // Warning color text
  warning: {
    color: colors.warning,
  },
});

// List Styles - For lists and grids
export const listStyles = StyleSheet.create({
  // List container
  container: {
    gap: spacing.md,
  },

  // List item
  item: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // List item header
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  // List item content
  itemContent: {
    gap: spacing.xs,
  },

  // List item footer
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },

  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },

  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

// Stats/Metrics Styles - For dashboard stats
export const statsStyles = StyleSheet.create({
  // Stats grid
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  // Individual stat card
  card: {
    flex: 1,
    backgroundColor: 'white',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Stat label
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },

  // Stat value
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  // Large stat value
  valueLarge: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },

  // Stat subtext
  subtext: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});

// Progress Styles - For progress indicators
export const progressStyles = StyleSheet.create({
  // Progress container
  container: {
    gap: spacing.md,
  },

  // Progress steps container
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  // Progress step
  step: {
    alignItems: 'center',
    gap: spacing.xs,
  },

  // Progress circle
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress line
  line: {
    flex: 1,
    height: 2,
    marginHorizontal: spacing.xs,
  },

  // Step label
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Step number
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
});

// Upload Styles - For document/file upload areas
export const uploadStyles = StyleSheet.create({
  // Upload area
  area: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },

  // Upload button
  button: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },

  // Upload button text
  buttonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },

  // Uploaded file item
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
    gap: spacing.sm,
  },

  // File name
  fileName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },

  // Upload instructions
  instructions: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

// Tab Styles - For tab navigation
export const tabStyles = StyleSheet.create({
  // Tab container
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Individual tab
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },

  // Active tab
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },

  // Tab text
  text: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Active tab text
  activeText: {
    color: colors.primary,
  },
});

// Animation/Interaction Styles
export const interactionStyles = StyleSheet.create({
  // Pressable with opacity feedback
  pressable: {
    opacity: 1,
  },

  pressed: {
    opacity: 0.7,
  },

  // Scale animation container
  scaleContainer: {
    transform: [{ scale: 1 }],
  },

  // Disabled state
  disabled: {
    opacity: 0.5,
  },
});

// Network/Connection Styles - For network indicators
export const networkStyles = StyleSheet.create({
  // Network pill
  pill: {
    backgroundColor: 'white',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  // Network text
  text: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Connection indicator
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

// Utility Styles - Common utility classes
export const utilityStyles = StyleSheet.create({
  // Flex utilities
  flex1: { flex: 1 },
  flexRow: { flexDirection: 'row' },
  flexColumn: { flexDirection: 'column' },
  flexCenter: { alignItems: 'center', justifyContent: 'center' },
  flexBetween: { justifyContent: 'space-between' },
  flexEnd: { justifyContent: 'flex-end' },
  alignCenter: { alignItems: 'center' },
  alignEnd: { alignItems: 'flex-end' },

  // Spacing utilities
  marginXS: { margin: spacing.xs },
  marginSM: { margin: spacing.sm },
  marginMD: { margin: spacing.md },
  marginLG: { margin: spacing.lg },
  marginXL: { margin: spacing.xl },
  marginXXL: { margin: spacing.xxl },

  paddingXS: { padding: spacing.xs },
  paddingSM: { padding: spacing.sm },
  paddingMD: { padding: spacing.md },
  paddingLG: { padding: spacing.lg },
  paddingXL: { padding: spacing.xl },
  paddingXXL: { padding: spacing.xxl },

  // Margin bottom utilities
  mbXS: { marginBottom: spacing.xs },
  mbSM: { marginBottom: spacing.sm },
  mbMD: { marginBottom: spacing.md },
  mbLG: { marginBottom: spacing.lg },
  mbXL: { marginBottom: spacing.xl },
  mbXXL: { marginBottom: spacing.xxl },

  // Padding horizontal utilities
  phXS: { paddingHorizontal: spacing.xs },
  phSM: { paddingHorizontal: spacing.sm },
  phMD: { paddingHorizontal: spacing.md },
  phLG: { paddingHorizontal: spacing.lg },
  phXL: { paddingHorizontal: spacing.xl },

  // Padding vertical utilities
  pvXS: { paddingVertical: spacing.xs },
  pvSM: { paddingVertical: spacing.sm },
  pvMD: { paddingVertical: spacing.md },
  pvLG: { paddingVertical: spacing.lg },
  pvXL: { paddingVertical: spacing.xl },

  // Border utilities
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.border },
  borderLeft: { borderLeftWidth: 1, borderLeftColor: colors.border },
  borderRight: { borderRightWidth: 1, borderRightColor: colors.border },

  // Shadow utilities
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  shadowLarge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  // Background utilities
  bgWhite: { backgroundColor: 'white' },
  bgPrimary: { backgroundColor: colors.primary },
  bgSurface: { backgroundColor: colors.surface },
  bgTransparent: { backgroundColor: 'transparent' },

  // Text align utilities
  textCenter: { textAlign: 'center' },
  textLeft: { textAlign: 'left' },
  textRight: { textAlign: 'right' },

  // Width utilities
  fullWidth: { width: '100%' },
  halfWidth: { width: '50%' },

  // Position utilities
  absolute: { position: 'absolute' },
  relative: { position: 'relative' },

  // Hidden
  hidden: { display: 'none' },
  visible: { display: 'flex' },
});