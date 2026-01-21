/**
 * Smart Account Test Screen
 * 
 * This screen demonstrates and tests both Pimlico and Alchemy smart account implementations.
 * Use this for Phase 2 testing to verify both providers work correctly.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useSmartAccountProvider, useActiveProvider, useSmartAccountProviders } from '@/hooks/useSmartAccountProvider';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { useWallet } from '@/contexts/WalletContext';

export default function SmartAccountTestScreen() {
  const wallet = useWallet();
  const activeProvider = useActiveProvider();
  const { pimlico, alchemy } = useSmartAccountProviders();
  
  // Use unified provider
  const {
    smartAccountAddress,
    isInitialized,
    isDeployed,
    initializeSmartAccount,
    isInitializing,
    error,
    provider,
  } = useSmartAccountProvider('SmartAccountTestScreen');

  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${result}`]);
  };

  const handleInitialize = async () => {
    try {
      addTestResult(`Initializing ${provider} smart account...`);
      await initializeSmartAccount();
      addTestResult(`✅ ${provider} smart account initialized successfully`);
    } catch (err) {
      addTestResult(`❌ Failed to initialize: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleTestBothProviders = async () => {
    addTestResult('--- Testing Both Providers ---');
    
    // Test Pimlico
    try {
      addTestResult('Testing Pimlico...');
      if (!pimlico.isInitialized) {
        await pimlico.initializeSmartAccount();
      }
      addTestResult(`✅ Pimlico: ${pimlico.smartAccount?.address || 'N/A'}`);
      addTestResult(`   Deployed: ${pimlico.smartAccount?.isDeployed || false}`);
    } catch (err) {
      addTestResult(`❌ Pimlico failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    }

    // Test Alchemy
    try {
      addTestResult('Testing Alchemy...');
      if (!alchemy.isAlchemyInitialized) {
        await alchemy.initializeAlchemyAccount();
      }
      addTestResult(`✅ Alchemy: ${alchemy.alchemyAccountAddress}`);
      addTestResult(`   Deployed: ${alchemy.isAlchemyDeployed}`);
    } catch (err) {
      addTestResult(`❌ Alchemy failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    }

    addTestResult('--- Test Complete ---');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Account Test Screen</Text>
        <Text style={styles.subtitle}>Phase 2 Integration Testing</Text>
      </View>

      {/* Feature Flag Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Flags</Text>
        <InfoRow label="USE_ALCHEMY_AA" value={FEATURE_FLAGS.USE_ALCHEMY_AA ? '✅ Enabled' : '❌ Disabled'} />
        <InfoRow label="Active Provider" value={activeProvider.toUpperCase()} highlight />
        <InfoRow label="Debug Mode" value={FEATURE_FLAGS.ALCHEMY_DEBUG_MODE ? 'ON' : 'OFF'} />
        <InfoRow label="Gas Sponsorship" value={FEATURE_FLAGS.ALCHEMY_GAS_SPONSORSHIP ? 'ON' : 'OFF'} />
      </View>

      {/* Wallet Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wallet Status</Text>
        <InfoRow label="Unlocked" value={wallet.isUnlocked ? '✅ Yes' : '❌ No'} />
        <InfoRow label="Network" value={wallet.selectedNetwork.name} />
        <InfoRow label="EOA Address" value={wallet.address?.slice(0, 10) + '...'} />
      </View>

      {/* Smart Account Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Smart Account Status ({provider})</Text>
        <InfoRow label="Initialized" value={isInitialized ? '✅ Yes' : '❌ No'} />
        <InfoRow label="Deployed" value={isDeployed ? '✅ Yes' : '❌ No'} />
        <InfoRow label="Address" value={smartAccountAddress?.slice(0, 20) + '...' || 'Not initialized'} />
        {error && <InfoRow label="Error" value={error} error />}
      </View>

      {/* Pimlico Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pimlico (Legacy)</Text>
        <InfoRow label="Initialized" value={pimlico.isInitialized ? '✅' : '❌'} />
        <InfoRow label="Address" value={pimlico.smartAccount?.address?.slice(0, 20) + '...' || 'N/A'} />
      </View>

      {/* Alchemy Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alchemy (New)</Text>
        <InfoRow label="Initialized" value={alchemy.isAlchemyInitialized ? '✅' : '❌'} />
        <InfoRow label="Address" value={alchemy.alchemyAccountAddress?.slice(0, 20) + '...' || 'N/A'} />
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleInitialize}
          disabled={isInitializing || !wallet.isUnlocked}
        >
          {isInitializing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Initialize {provider.toUpperCase()} Account
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleTestBothProviders}
          disabled={!wallet.isUnlocked}
        >
          <Text style={styles.buttonTextSecondary}>Test Both Providers</Text>
        </TouchableOpacity>
      </View>

      {/* Test Results */}
      {testResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <View style={styles.logContainer}>
            {testResults.map((result, index) => (
              <Text key={index} style={styles.logText}>{result}</Text>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={() => setTestResults([])}
          >
            <Text style={styles.buttonTextSecondary}>Clear Results</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Testing Instructions</Text>
        <Text style={styles.instruction}>
          1. Ensure your wallet is unlocked
        </Text>
        <Text style={styles.instruction}>
          2. Click "Initialize" to test the active provider
        </Text>
        <Text style={styles.instruction}>
          3. Click "Test Both Providers" to compare both
        </Text>
        <Text style={styles.instruction}>
          4. Toggle USE_ALCHEMY_AA in featureFlags.ts to switch providers
        </Text>
        <Text style={styles.instruction}>
          5. Compare addresses and deployment status
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Switch providers by changing FEATURE_FLAGS.USE_ALCHEMY_AA
        </Text>
        <Text style={styles.footerText}>
          in src/config/featureFlags.ts
        </Text>
      </View>
    </ScrollView>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  error?: boolean;
}

function InfoRow({ label, value, highlight, error }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={[
        styles.infoValue,
        highlight && styles.infoValueHighlight,
        error && styles.infoValueError,
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#93c5fd',
  },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1f2937',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  infoValueHighlight: {
    color: '#2563eb',
    fontWeight: '700',
  },
  infoValueError: {
    color: '#dc2626',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  clearButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  logContainer: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 6,
    maxHeight: 300,
  },
  logText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  instruction: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
    paddingLeft: 8,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
