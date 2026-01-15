import { type Address } from 'viem';
import { baseSepolia } from 'viem/chains';

// ExtractV2 contract addresses
export const EXTRACT_ADDRESS: Record<number, Address> = {
  [baseSepolia.id]: '0x0AEA74a22d5bFb0B030d012568A60D9249619d86',
};

export const EXTRACT_ABI = [
  // Constants
  {
    type: 'function',
    name: 'BUY_IN',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'GAME_DURATION',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },

  // Agent functions (used by backend)
  {
    type: 'function',
    name: 'startGame',
    inputs: [{ name: '_commitment', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'declareWinner',
    inputs: [{ name: 'winner', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'endGame',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },

  // Player functions
  {
    type: 'function',
    name: 'buyIn',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },

  // View functions
  {
    type: 'function',
    name: 'getGameInfo',
    inputs: [],
    outputs: [
      { name: '_gameId', type: 'uint256' },
      { name: '_commitment', type: 'bytes32' },
      { name: '_pot', type: 'uint256' },
      { name: '_endTime', type: 'uint256' },
      { name: '_active', type: 'bool' },
      { name: '_timeRemaining', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasBoughtIn',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayerBuyIn',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'gameId',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },

  // Events
  {
    type: 'event',
    name: 'GameStarted',
    inputs: [
      { name: 'gameId', type: 'uint256', indexed: true },
      { name: 'commitment', type: 'bytes32', indexed: false },
      { name: 'endTime', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PlayerBoughtIn',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'gameId', type: 'uint256', indexed: false },
      { name: 'totalBuyIn', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'WinnerDeclared',
    inputs: [
      { name: 'winner', type: 'address', indexed: true },
      { name: 'gameId', type: 'uint256', indexed: false },
      { name: 'payout', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'GameEnded',
    inputs: [
      { name: 'gameId', type: 'uint256', indexed: true },
      { name: 'potRolledOver', type: 'uint256', indexed: false },
    ],
  },

  // Errors
  { type: 'error', name: 'OnlyAgent', inputs: [] },
  { type: 'error', name: 'GameNotActive', inputs: [] },
  { type: 'error', name: 'GameStillActive', inputs: [] },
  { type: 'error', name: 'IncorrectBuyIn', inputs: [] },
  { type: 'error', name: 'TransferFailed', inputs: [] },
  { type: 'error', name: 'ZeroAddress', inputs: [] },
] as const;
