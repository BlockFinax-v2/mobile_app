// Theme exports for easy importing
export * from './colors';
export * from './spacing';
export * from './commonStyles';

// Re-export everything for convenience
import { colors, palette, gradients } from './colors';
import { spacing } from './spacing';
import {
  cardStyles,
  layoutStyles,
  buttonStyles,
  statusStyles,
  formStyles,
  modalStyles,
  textStyles,
  listStyles,
  statsStyles,
  progressStyles,
  uploadStyles,
  tabStyles,
  interactionStyles,
  networkStyles,
  utilityStyles,
} from './commonStyles';

export const theme = {
  colors,
  palette,
  gradients,
  spacing,
  styles: {
    card: cardStyles,
    layout: layoutStyles,
    button: buttonStyles,
    status: statusStyles,
    form: formStyles,
    modal: modalStyles,
    text: textStyles,
    list: listStyles,
    stats: statsStyles,
    progress: progressStyles,
    upload: uploadStyles,
    tab: tabStyles,
    interaction: interactionStyles,
    network: networkStyles,
    utility: utilityStyles,
  },
};

// Helper function to combine styles
export const combineStyles = (...styles: any[]) => {
  return styles.filter(Boolean);
};

// Helper function to get status color
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'completed':
    case 'success':
    case 'verified':
    case 'active':
    case 'delivered':
      return colors.success;
    case 'pending':
    case 'waiting':
    case 'processing':
      return colors.warning;
    case 'rejected':
    case 'failed':
    case 'error':
    case 'cancelled':
      return colors.error;
    case 'draft':
    case 'inactive':
      return colors.textSecondary;
    default:
      return colors.primary;
  }
};

// Helper function to get status background color
export const getStatusBackgroundColor = (status: string): string => {
  return getStatusColor(status) + '20'; // Add transparency
};