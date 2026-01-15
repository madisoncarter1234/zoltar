'use client';

import { useAccount, useReadContract, useWriteContract, useSwitchChain } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { baseSepolia } from 'viem/chains';
import { EXTRACT_ABI, EXTRACT_ADDRESS } from './contracts';

const BUY_IN_AMOUNT = parseEther('0.001');

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

// Buy in to the game
export function useBuyIn() {
  const address = useContractAddress();
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const buyIn = async () => {
    if (!address) {
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

    console.log('Calling buyIn...');
    writeContract({
      address,
      abi: EXTRACT_ABI,
      functionName: 'buyIn',
      value: BUY_IN_AMOUNT,
      chainId: baseSepolia.id,
    });
  };

  return { buyIn, isPending, isSuccess, error };
}
