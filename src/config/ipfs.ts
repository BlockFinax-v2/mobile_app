/**
 * IPFS Configuration using Pinata
 * 
 * To use this:
 * 1. Sign up at https://pinata.cloud
 * 2. Get your API keys from the dashboard
 * 3. Add them to your .env file or replace the values below
 */

export const IPFS_CONFIG = {
  // Pinata Authentication
  PINATA_API_KEY: process.env.EXPO_PUBLIC_PINATA_API_KEY || '',
  PINATA_SECRET_KEY: process.env.EXPO_PUBLIC_PINATA_SECRET_KEY || '',
  PINATA_JWT: process.env.EXPO_PUBLIC_PINATA_JWT || '',

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
  try {
    const formData = new FormData();

    // Ensure file object is formatted correctly for React Native fetch
    const fileToUpload = {
      uri: fileUri,
      type: fileType || 'application/octet-stream',
      name: fileName || `file_${Date.now()}`,
    };

    formData.append('file', fileToUpload as any);

    // Optional metadata to help identify files in Pinata dashboard
    const metadata = JSON.stringify({
      name: fileName,
      keyvalues: {
        platform: 'mobile_app',
        uploaded_at: new Date().toISOString(),
      }
    });
    formData.append('pinataMetadata', metadata);

    // Set headers - Prefer JWT if available, fallback to Key/Secret
    const headers: any = {};
    if (IPFS_CONFIG.PINATA_JWT) {
      headers['Authorization'] = `Bearer ${IPFS_CONFIG.PINATA_JWT}`;
    } else {
      headers['pinata_api_key'] = IPFS_CONFIG.PINATA_API_KEY;
      headers['pinata_secret_api_key'] = IPFS_CONFIG.PINATA_SECRET_KEY;
    }

    console.log(`🚀 Uploading ${fileName} to IPFS...`);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers,
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('IPFS error response:', result);
      throw new Error(result.error?.details || result.error || 'Failed to upload to IPFS');
    }

    if (result.IpfsHash) {
      console.log(`✅ IPFS Hash received: ${result.IpfsHash}`);
      return {
        ipfsHash: result.IpfsHash,
        ipfsUrl: `${IPFS_CONFIG.GATEWAY_URL}${result.IpfsHash}`,
      };
    }

    throw new Error('No IPFS hash received in Pinata response');
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
