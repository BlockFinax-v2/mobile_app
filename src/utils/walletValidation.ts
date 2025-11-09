import { utils } from 'ethers';

/**
 * Validates if a string is a valid Ethereum wallet address
 * @param address - The address string to validate
 * @returns boolean - True if valid address, false otherwise
 */
export const isValidWalletAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Remove any whitespace
  const cleanAddress = address.trim();
  
  // Check if it's a valid Ethereum address format
  return utils.isAddress(cleanAddress);
};

/**
 * Converts an address to its checksum version
 * @param address - The address to convert
 * @returns string - The checksummed address or empty string if invalid
 */
export const toChecksumAddress = (address: string): string => {
  try {
    if (!address || typeof address !== 'string') {
      return '';
    }
    
    const cleanAddress = address.trim();
    
    if (!utils.isAddress(cleanAddress)) {
      return '';
    }
    
    return utils.getAddress(cleanAddress);
  } catch (error) {
    return '';
  }
};

/**
 * Formats a wallet address for display
 * @param address - The wallet address to format
 * @param showFull - Whether to show the full address or abbreviated
 * @returns string - Formatted address
 */
export const formatWalletAddress = (address: string, showFull: boolean = false): string => {
  if (!address) return '';
  
  const checksumAddress = toChecksumAddress(address);
  if (!checksumAddress) return address;
  
  if (showFull) return checksumAddress;
  
  return `${checksumAddress.slice(0, 6)}...${checksumAddress.slice(-4)}`;
};

/**
 * Checks if the input looks like it could be a wallet address
 * @param input - The input string to check
 * @returns boolean - True if it looks like an address in progress
 */
export const looksLikeWalletAddress = (input: string): boolean => {
  if (!input) return false;
  
  const cleanInput = input.trim().toLowerCase();
  
  // Check if it starts with 0x and has hex characters
  if (cleanInput.startsWith('0x')) {
    const hexPart = cleanInput.slice(2);
    return /^[0-9a-f]*$/.test(hexPart) && hexPart.length <= 40;
  }
  
  return false;
};