/**
 * AA Status Indicator Component
 * 
 * Displays the current Account Abstraction status for debugging
 * Shows EOA address, Smart Account address, and deployment status
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useWallet } from '@/contexts/WalletContext';
import { useAlchemySmartAccount } from '@/contexts/AlchemySmartAccountContext';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface AAStatusIndicatorProps {
  compact?: boolean;
}

export const AAStatusIndicator: React.FC<AAStatusIndicatorProps> = ({ compact = false }) => {
  const { 
    address, 
    smartAccountAddress, 
    isSmartAccountEnabled, 
    isSmartAccountDeployed,
    isInitializingSmartAccount 
  } = useWallet();
  
  const { 
    isAlchemyInitialized, 
    isInitializing,
    error 
  } = useAlchemySmartAccount();

  if (!__DEV__ && !compact) {
    // Only show in development mode if not compact
    return null;
  }

  const formatAddress = (addr?: string) => {
    if (!addr) return 'Not initialized';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <MaterialCommunityIcons 
          name={isAlchemyInitialized ? "shield-check" : "shield-off"} 
          size={16} 
          color={isAlchemyInitialized ? palette.accentGreen : palette.neutralMid} 
        />
        <Text style={styles.compactText}>
          {isAlchemyInitialized ? 'AA Active' : 'AA Inactive'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons 
          name="shield-account" 
          size={20} 
          color={palette.primaryBlue} 
        />
        <Text style={styles.headerText}>Account Abstraction Status</Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.label}>EOA Address:</Text>
        <Text style={styles.value}>{formatAddress(address)}</Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.label}>Smart Account:</Text>
        <Text style={styles.value}>{formatAddress(smartAccountAddress)}</Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.label}>AA Enabled:</Text>
        <View style={styles.statusBadge}>
          <MaterialCommunityIcons 
            name={isSmartAccountEnabled ? "check-circle" : "close-circle"} 
            size={14} 
            color={isSmartAccountEnabled ? palette.accentGreen : palette.errorRed} 
          />
          <Text style={styles.statusText}>
            {isSmartAccountEnabled ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.label}>Initialized:</Text>
        <View style={styles.statusBadge}>
          <MaterialCommunityIcons 
            name={isAlchemyInitialized ? "check-circle" : "close-circle"} 
            size={14} 
            color={isAlchemyInitialized ? palette.accentGreen : palette.neutralMid} 
          />
          <Text style={styles.statusText}>
            {isAlchemyInitialized ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.label}>Deployed:</Text>
        <View style={styles.statusBadge}>
          <MaterialCommunityIcons 
            name={isSmartAccountDeployed ? "check-circle" : "alert-circle"} 
            size={14} 
            color={isSmartAccountDeployed ? palette.accentGreen : palette.warningYellow} 
          />
          <Text style={styles.statusText}>
            {isSmartAccountDeployed ? 'Yes' : 'Will deploy on first tx'}
          </Text>
        </View>
      </View>

      {(isInitializing || isInitializingSmartAccount) && (
        <View style={styles.statusRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, { color: palette.primaryBlue }]}>
            Initializing...
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert" size={14} color={palette.errorRed} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLight,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.neutralDark,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  value: {
    fontSize: 12,
    color: palette.neutralDark,
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: palette.neutralDark,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFF3F3',
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  errorText: {
    flex: 1,
    fontSize: 11,
    color: palette.errorRed,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.neutralLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  compactText: {
    fontSize: 11,
    color: palette.neutralMid,
    fontWeight: '500',
  },
});
