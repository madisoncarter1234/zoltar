// CT-themed wordlist with difficulty tiers
// The good stuff - crypto lore, memes, figures

export const WORDS = {
  easy: [
    // Common crypto terms everyone knows
    'bitcoin', 'ethereum', 'solana', 'polygon', 'avalanche',
    'wallet', 'blockchain', 'token', 'altcoin', 'stablecoin',
    'mining', 'staking', 'airdrop', 'whitelist', 'presale',
    'bullish', 'bearish', 'hodl', 'fomo', 'fud',
    'whale', 'degen', 'ape', 'moon', 'pump',
    'dump', 'rugpull', 'scam', 'hack', 'exploit',
    'gas', 'gwei', 'mempool', 'bridge', 'swap',
    'dex', 'cex', 'liquidity', 'yield', 'farming',
    'nft', 'mint', 'floor', 'rarity', 'pfp',
    'dao', 'governance', 'treasury', 'multisig', 'snapshot',
    'rekt', 'wagmi', 'ngmi', 'gm', 'ser',
  ],

  medium: [
    // More specific crypto knowledge
    'metamask', 'uniswap', 'opensea', 'coinbase', 'binance',
    'ledger', 'trezor', 'phantom', 'rabby', 'rainbow',
    'vitalik', 'satoshi', 'changpeng', 'armstrong', 'hoskinson',
    'slippage', 'frontrun', 'sandwich', 'mev', 'flashbots',
    'rollup', 'optimism', 'arbitrum', 'zksync', 'starknet',
    'merkle', 'validator', 'attestation', 'finality', 'reorg',
    'ponzi', 'pyramid', 'vaporware', 'shitcoin', 'memecoin',
    'pepe', 'doge', 'shiba', 'bonk', 'dogwifhat',
    'leverage', 'liquidation', 'margin', 'perps', 'funding',
    'apy', 'tvl', 'diluted', 'circulating', 'emissions',
    'impermanent', 'divergence', 'rebalance', 'concentrated', 'range',
    'ordinals', 'inscriptions', 'brc20', 'runes', 'bitmap',
  ],

  hard: [
    // Deep CT lore - the degens know
    'dokwon', 'terraform', 'anchor', 'luna', 'kwon',
    'bankman', 'caroline', 'alameda', 'polycule', 'bahamas',
    'celsius', 'mashinsky', 'voyager', 'blockfi', 'genesis',
    'zhu', 'davies', 'threearrows', 'dubai', 'superyacht',
    'bitconnect', 'matos', 'carlos', 'wassup', 'ponzicoin',
    'mtgox', 'karpeles', 'goxing', 'kobayashi', 'wizsec',
    'quadriga', 'cotten', 'coldwallet', 'exhume', 'jennifer',
    'wonderland', 'daniele', 'sifu', 'patryn', 'doxed',
    'olympus', 'rebase', 'ponzinomics', 'ohmfork', 'node',
    'depeg', 'spiral', 'deathspiral', 'usdt', 'tether',
    'serum', 'ftx', 'backpack', 'solend', 'mango',
    'effective', 'altruism', 'vegan', 'stimulants', 'adderall',
    'cobie', 'hsaka', 'ansem', 'giganticrebirth', 'loomdart',
    'uptober', 'rektember', 'pumptober', 'crabmarket', 'chop',
    'goblintown', 'memeland', 'degods', 'azuki', 'elementals',
    'milady', 'remilio', 'bonkler', 'opepen', 'checks',
    'eigenlayer', 'restaking', 'lrt', 'pointfarming', 'sybil',
  ],
};

export type Difficulty = 'easy' | 'medium' | 'hard';

export function getRandomWord(): string {
  // Random difficulty distribution: 40% easy, 40% medium, 20% hard
  const roll = Math.random();
  let difficulty: Difficulty;

  if (roll < 0.4) {
    difficulty = 'easy';
  } else if (roll < 0.8) {
    difficulty = 'medium';
  } else {
    difficulty = 'hard';
  }

  const words = WORDS[difficulty];
  const word = words[Math.floor(Math.random() * words.length)];

  console.log(`[Wordlist] Selected: "${word}" (${difficulty})`);
  return word;
}

// Get word with difficulty info (for potential UI display)
export function getRandomWordWithDifficulty(): { word: string; difficulty: Difficulty } {
  const roll = Math.random();
  let difficulty: Difficulty;

  if (roll < 0.4) {
    difficulty = 'easy';
  } else if (roll < 0.8) {
    difficulty = 'medium';
  } else {
    difficulty = 'hard';
  }

  const words = WORDS[difficulty];
  const word = words[Math.floor(Math.random() * words.length)];

  return { word, difficulty };
}

// Check if a word is in the list (for validation)
export function isValidWord(word: string): boolean {
  const allWords = [...WORDS.easy, ...WORDS.medium, ...WORDS.hard];
  return allWords.includes(word.toLowerCase());
}
