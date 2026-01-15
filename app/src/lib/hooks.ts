'use client';

import { useAccount, useReadContract, useSwitchChain } from 'wagmi';
import { useSendCalls } from 'wagmi/experimental';
import { parseEther, type Address, encodeFunctionData, encodeAbiParameters } from 'viem';
import { baseSepolia } from 'viem/chains';
import { EXTRACT_ABI, EXTRACT_ADDRESS } from './contracts';

const BUY_IN_AMOUNT = parseEther('0.001');

// Base Builder Code for attribution (ERC-8021)
const BUILDER_CODE = 'bc_cjnlob4i';

// ERC-8021 data suffix format: 0x + codes encoded + magic suffix
// Magic suffix: keccak256("erc8021.attribution")[:4] = 0x00008021
function createAttributionSuffix(codes: string[]): `0x${string}` {
  const encoded = encodeAbiParameters(
    [{ type: 'string[]' }],
    [codes]
  );
  // Remove 0x prefix from encoded, add magic suffix
  return `${encoded}00008021` as `0x${string}`;
}

const DATA_SUFFIX = createAttributionSuffix([BUILDER_CODE]);

// Get contract address for current chain
function useContractAddress(): Address | undefined {
  return EXTRACT_ADDRESS[baseSepolia.id];
}

// Read game info from contract
export function useGameInfo() {
  const address = useContractAddress();

  return useReadContract({
    address,
    abi: EXTRACT_ABI,
    functionName: 'getGameInfo',
    query: {
      refetchInterval: 5000,
    },
  });
}

// Check if player has bought in
export function useHasBoughtIn() {
  const { address: playerAddress } = useAccount();
  const contractAddress = useContractAddress();

  return useReadContract({
    address: contractAddress,
    abi: EXTRACT_ABI,
    functionName: 'hasBoughtIn',
    args: playerAddress ? [playerAddress] : undefined,
    query: {
      enabled: !!playerAddress,
      refetchInterval: 5000,
    },
  });
}

// Buy in to the game with Builder Code attribution
export function useBuyIn() {
  const contractAddress = useContractAddress();
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { sendCalls, isPending, isSuccess, error } = useSendCalls();

  const buyIn = async () => {
    if (!contractAddress) {
      console.error('No contract address');
      return;
    }

    // Switch to Base Sepolia if not already there
    if (chain?.id !== baseSepolia.id) {
      console.log('Switching to Base Sepolia...');
      try {
        await switchChain({ chainId: baseSepolia.id });
      } catch (e) {
        console.error('Failed to switch chain:', e);
        return;
      }
    }

    console.log('Calling buyIn with builder code attribution...');

    // Encode the buyIn function call
    const data = encodeFunctionData({
      abi: EXTRACT_ABI,
      functionName: 'buyIn',
    });

    sendCalls({
      calls: [
        {
          to: contractAddress,
          value: BUY_IN_AMOUNT,
          data,
        },
      ],
      capabilities: {
        dataSuffix: {
          value: DATA_SUFFIX,
          optional: true, // Don't fail if wallet doesn't support it
        },
      },
    });
  };

  return { buyIn, isPending, isSuccess, error };
}
