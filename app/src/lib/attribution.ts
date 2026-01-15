import { toHex } from 'viem';

// Builder Code for Extract app
// Get yours at base.dev > Settings > Builder Codes
export const BUILDER_CODE = 'bc_cjnlob4i';

// Encode builder code as hex suffix for transaction attribution
// This follows the ERC-8021 spec for attributing transactions to builders
function encodeBuilderCode(code: string): `0x${string}` {
  // Convert the builder code string to hex
  return toHex(new TextEncoder().encode(code));
}

// Encoded data suffix for transaction attribution
export const DATA_SUFFIX = encodeBuilderCode(BUILDER_CODE);

// Helper to create capabilities object for useSendCalls
export const getAttributionCapabilities = () => ({
  dataSuffix: {
    value: DATA_SUFFIX,
    optional: true, // Don't fail if wallet doesn't support
  },
});
