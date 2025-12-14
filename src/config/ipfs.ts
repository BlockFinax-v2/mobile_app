/**
 * IPFS Configuration using Pinata
 * 
 * To use this:
 * 1. Sign up at https://pinata.cloud
 * 2. Get your API keys from the dashboard
 * 3. Add them to your .env file or replace the values below
 */

export const IPFS_CONFIG = {
  // Get these from https://app.pinata.cloud/developers/api-keys
  PINATA_API_KEY: process.env.EXPO_PUBLIC_PINATA_API_KEY || 'YOUR_PINATA_API_KEY',
  PINATA_SECRET_KEY: process.env.EXPO_PUBLIC_PINATA_SECRET_KEY || 'YOUR_PINATA_SECRET_KEY',
  
  // Set to true to use mock IPFS (for testing without Pinata)
  USE_MOCK: process.env.EXPO_PUBLIC_PINATA_API_KEY ? false : true,
  
  // Pinata gateway URL
  GATEWAY_URL: 'https://gateway.pinata.cloud/ipfs/',
  
  // Alternative public gateways (fallback options)
  PUBLIC_GATEWAYS: [
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
  ],
};

/**
 * Upload file to IPFS via Pinata
 */
export async function uploadToIPFS(fileUri: string, fileName: string, fileType: string) {
  // Mock mode for development/testing
  if (IPFS_CONFIG.USE_MOCK) {
    console.log('📦 Using mock IPFS upload (no Pinata credentials configured)');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate upload delay
    
    const mockHash = `QmMock${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    return {
      ipfsHash: mockHash,
      ipfsUrl: fileUri, // Use local file URI in mock mode
    };
  }

  // Real Pinata upload
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: fileType,
      name: fileName,
    } as any);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': IPFS_CONFIG.PINATA_API_KEY,
        'pinata_secret_api_key': IPFS_CONFIG.PINATA_SECRET_KEY,
      },
      body: formData,
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error?.details || 'Failed to upload to IPFS');
    }
    
    if (result.IpfsHash) {
      return {
        ipfsHash: result.IpfsHash,
        ipfsUrl: `${IPFS_CONFIG.GATEWAY_URL}${result.IpfsHash}`,
      };
    }
    
    throw new Error('No IPFS hash received');
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw error;
  }
}

/**
 * Get IPFS URL from hash
 */
export function getIPFSUrl(ipfsHash: string, gatewayIndex = 0): string {
  const gateway = IPFS_CONFIG.PUBLIC_GATEWAYS[gatewayIndex] || IPFS_CONFIG.GATEWAY_URL;
  return `${gateway}${ipfsHash}`;
}
