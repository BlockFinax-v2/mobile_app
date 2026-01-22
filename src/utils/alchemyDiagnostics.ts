/**
 * Alchemy Account Abstraction Diagnostics
 * 
 * Comprehensive diagnostic utility to troubleshoot Alchemy AA initialization issues
 */

import { getAlchemyChain, isAlchemyNetworkSupported, getAlchemyApiKey, getAlchemyGasPolicyId } from '../config/alchemyAccount';
import { FEATURE_FLAGS } from '../config/featureFlags';

export interface DiagnosticResult {
  category: string;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
  }[];
}

/**
 * Run comprehensive Alchemy AA diagnostics
 */
export async function runAlchemyDiagnostics(networkId: string): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // 1. Feature Flags Check
  results.push({
    category: 'Feature Flags',
    checks: [
      {
        name: 'USE_ALCHEMY_AA',
        status: FEATURE_FLAGS.USE_ALCHEMY_AA ? 'pass' : 'fail',
        message: FEATURE_FLAGS.USE_ALCHEMY_AA 
          ? 'Alchemy AA is enabled' 
          : 'Alchemy AA is disabled in feature flags',
        details: { value: FEATURE_FLAGS.USE_ALCHEMY_AA }
      },
      {
        name: 'ALCHEMY_DEBUG_MODE',
        status: FEATURE_FLAGS.ALCHEMY_DEBUG_MODE ? 'pass' : 'warning',
        message: FEATURE_FLAGS.ALCHEMY_DEBUG_MODE 
          ? 'Debug mode enabled' 
          : 'Debug mode disabled',
        details: { value: FEATURE_FLAGS.ALCHEMY_DEBUG_MODE }
      },
      {
        name: 'ALCHEMY_GAS_SPONSORSHIP',
        status: FEATURE_FLAGS.ALCHEMY_GAS_SPONSORSHIP ? 'pass' : 'warning',
        message: FEATURE_FLAGS.ALCHEMY_GAS_SPONSORSHIP 
          ? 'Gas sponsorship enabled' 
          : 'Gas sponsorship disabled (no policy ID)',
        details: { value: FEATURE_FLAGS.ALCHEMY_GAS_SPONSORSHIP }
      }
    ]
  });

  // 2. Environment Variables Check
  const apiKey = getAlchemyApiKey();
  const gasPolicyId = getAlchemyGasPolicyId();

  results.push({
    category: 'Environment Variables',
    checks: [
      {
        name: 'EXPO_PUBLIC_ALCHEMY_API_KEY',
        status: apiKey && apiKey !== 'your_alchemy_api_key_here' ? 'pass' : 'fail',
        message: apiKey && apiKey !== 'your_alchemy_api_key_here'
          ? `API key configured (${apiKey.substring(0, 10)}...)`
          : 'API key not configured or using placeholder',
        details: { 
          isSet: !!apiKey,
          isPlaceholder: apiKey === 'your_alchemy_api_key_here',
          keyPrefix: apiKey?.substring(0, 10)
        }
      },
      {
        name: 'EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID',
        status: gasPolicyId && gasPolicyId !== 'your_gas_policy_id_here' ? 'pass' : 'warning',
        message: gasPolicyId && gasPolicyId !== 'your_gas_policy_id_here'
          ? `Gas policy configured (${gasPolicyId.substring(0, 20)}...)`
          : 'Gas policy not configured (transactions will require gas fees)',
        details: { 
          isSet: !!gasPolicyId,
          isPlaceholder: gasPolicyId === 'your_gas_policy_id_here',
          policyPrefix: gasPolicyId?.substring(0, 20)
        }
      }
    ]
  });

  // 3. Network Support Check
  const networkSupported = isAlchemyNetworkSupported(networkId);
  let chain;
  try {
    chain = getAlchemyChain(networkId);
  } catch (e) {
    chain = null;
  }

  results.push({
    category: 'Network Configuration',
    checks: [
      {
        name: 'Network Support',
        status: networkSupported ? 'pass' : 'fail',
        message: networkSupported
          ? `Network ${networkId} is supported by Alchemy`
          : `Network ${networkId} is NOT supported by Alchemy`,
        details: { networkId, supported: networkSupported }
      },
      {
        name: 'Chain Configuration',
        status: chain ? 'pass' : 'fail',
        message: chain
          ? `Chain config loaded: ${chain.name} (ID: ${chain.id})`
          : 'Failed to load chain configuration',
        details: chain ? {
          id: chain.id,
          name: chain.name,
          nativeCurrency: chain.nativeCurrency,
          hasRpcUrls: !!chain.rpcUrls,
          defaultRpc: chain.rpcUrls?.default?.http?.[0],
          publicRpc: chain.rpcUrls?.public?.http?.[0],
          hasBlockExplorers: !!chain.blockExplorers
        } : null
      }
    ]
  });

  // 4. RPC Endpoint Check
  if (chain?.rpcUrls) {
    const defaultRpc = chain.rpcUrls.default?.http?.[0];
    const publicRpc = chain.rpcUrls.public?.http?.[0];
    const isUsingAlchemyRpc = defaultRpc?.includes('alchemy.com');

    results.push({
      category: 'RPC Endpoints',
      checks: [
        {
          name: 'Default RPC',
          status: defaultRpc ? 'pass' : 'fail',
          message: defaultRpc || 'No default RPC configured',
          details: { 
            url: defaultRpc,
            isAlchemyRpc: isUsingAlchemyRpc 
          }
        },
        {
          name: 'Alchemy RPC Usage',
          status: isUsingAlchemyRpc ? 'pass' : 'warning',
          message: isUsingAlchemyRpc 
            ? 'Using Alchemy RPC endpoint (required for AA)' 
            : 'NOT using Alchemy RPC - this may cause AA failures',
          details: { 
            isAlchemyRpc: isUsingAlchemyRpc,
            recommendation: !isUsingAlchemyRpc ? 'Configure Alchemy RPC endpoint for reliable AA support' : undefined
          }
        },
        {
          name: 'Public RPC',
          status: publicRpc ? 'pass' : 'warning',
          message: publicRpc || 'No public RPC configured',
          details: { url: publicRpc }
        }
      ]
    });
  }

  return results;
}

/**
 * Print diagnostics to console
 */
export function printDiagnostics(results: DiagnosticResult[]): void {
  console.log('\n═══════════════════════════════════════════════');
  console.log('🔍 ALCHEMY AA DIAGNOSTICS REPORT');
  console.log('═══════════════════════════════════════════════\n');

  results.forEach((category) => {
    console.log(`\n📋 ${category.category}`);
    console.log('─'.repeat(50));

    category.checks.forEach((check) => {
      const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${check.name}: ${check.message}`);
      if (check.details) {
        console.log(`   Details:`, check.details);
      }
    });
  });

  console.log('\n═══════════════════════════════════════════════\n');
}

/**
 * Get diagnostic summary
 */
export function getDiagnosticSummary(results: DiagnosticResult[]): {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  canProceed: boolean;
} {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  results.forEach(category => {
    category.checks.forEach(check => {
      total++;
      if (check.status === 'pass') passed++;
      else if (check.status === 'fail') failed++;
      else warnings++;
    });
  });

  // Can proceed if no critical failures
  const criticalChecks = [
    'USE_ALCHEMY_AA',
    'EXPO_PUBLIC_ALCHEMY_API_KEY',
    'Network Support',
    'Chain Configuration',
    'Default RPC'
  ];

  const criticalFailures = results.some(category =>
    category.checks.some(check =>
      criticalChecks.includes(check.name) && check.status === 'fail'
    )
  );

  return {
    total,
    passed,
    failed,
    warnings,
    canProceed: !criticalFailures
  };
}
