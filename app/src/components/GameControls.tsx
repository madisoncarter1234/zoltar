'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { useGameInfo, useHasBoughtIn, useBuyIn } from 'src/lib/hooks';
import WalletWrapper from './WalletWrapper';

interface ChatMessage {
  address: string;
  message: string;
  response: string;
  timestamp: number;
}

interface GameControlsProps {
  onStartGame?: () => void;
}

export function GameControls({ onStartGame }: GameControlsProps) {
  const { address, isConnected } = useAccount();
  const { data: gameInfo, refetch: refetchGame } = useGameInfo();
  const { data: hasBoughtIn, refetch: refetchBuyIn } = useHasBoughtIn();
  const { buyIn, isPending: isBuyingIn, isSuccess: buyInSuccess } = useBuyIn();

  const [input, setInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [triesRemaining, setTriesRemaining] = useState<number | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [optimisticBuyIn, setOptimisticBuyIn] = useState(false);

  // Chat scroll refs
  const chatRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const lastChatLength = useRef(0);

  // Parse game info from contract
  // V2 format: [gameId, commitment, pot, endTime, active, timeRemaining]
  const gameId = Number(gameInfo?.[0] ?? 0);
  const pot = gameInfo?.[2] ?? BigInt(0);
  const isActive = gameInfo?.[4] ?? false;
  const contractTimeRemaining = Number(gameInfo?.[5] ?? 0);

  // Local timer that updates every second
  const [displayTime, setDisplayTime] = useState(contractTimeRemaining);

  // Sync display time when contract time updates
  useEffect(() => {
    setDisplayTime(contractTimeRemaining);
  }, [contractTimeRemaining]);

  // Decrement display time every second
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setDisplayTime((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  // Effective buy-in state (real or optimistic)
  const effectivelyBoughtIn = hasBoughtIn || optimisticBuyIn;

  // Clear state when game changes
  useEffect(() => {
    if (gameId > 0) {
      setChat([]);
      setLastResponse(null);
      setTriesRemaining(null);
      setWon(false);
      setOptimisticBuyIn(false);
    }
  }, [gameId]);

  // Handle buy-in success - refetch and clear optimistic
  useEffect(() => {
    if (buyInSuccess) {
      refetchBuyIn();
      // Keep optimistic state until real state confirms
    }
  }, [buyInSuccess, refetchBuyIn]);

  // Clear optimistic when real buy-in confirms
  useEffect(() => {
    if (hasBoughtIn && optimisticBuyIn) {
      setOptimisticBuyIn(false);
    }
  }, [hasBoughtIn, optimisticBuyIn]);

  // Fetch chat on mount and periodically
  useEffect(() => {
    if (!address || !effectivelyBoughtIn) return;

    const fetchChat = async () => {
      try {
        const res = await fetch(`/api/message?address=${address}`);
        const data = await res.json();
        if (data.chat) {
          setChat(data.chat);
        }
      } catch (e) {
        console.error('Failed to fetch chat:', e);
      }
    };

    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => clearInterval(interval);
  }, [address, effectivelyBoughtIn]);

  // Auto-scroll chat when new messages arrive (unless user is scrolling)
  useEffect(() => {
    if (chat.length > lastChatLength.current && chatRef.current && !isUserScrolling.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
    lastChatLength.current = chat.length;
  }, [chat]);

  // Track user scrolling
  const handleChatScroll = () => {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    // User is "at bottom" if within 50px of bottom
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    isUserScrolling.current = !atBottom;
  };

  const handleBuyIn = async () => {
    // Optimistically update UI
    setOptimisticBuyIn(true);
    setTriesRemaining(5);
    buyIn();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !address) return;

    setIsSending(true);
    setLastResponse(null);

    try {
      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim(), address }),
      });

      const data = await res.json();

      if (data.error) {
        setLastResponse(`Error: ${data.error}`);
        // If error is about buy-in, reset optimistic state
        if (data.needsBuyIn) {
          setOptimisticBuyIn(false);
          setTriesRemaining(null);
        }
      } else {
        setLastResponse(data.response);
        setTriesRemaining(data.triesRemaining);

        if (data.won) {
          setWon(true);
        }

        // Refetch chat to get updated messages
        const chatRes = await fetch(`/api/message?address=${address}`);
        const chatData = await chatRes.json();
        if (chatData.chat) {
          setChat(chatData.chat);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setLastResponse('Failed to send message. Try again.');
    } finally {
      setIsSending(false);
      setInput('');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-4">Connect wallet to play</p>
        <WalletWrapper text="Connect Wallet" />
      </div>
    );
  }

  // Won state
  if (won) {
    return (
      <div className="text-center">
        <p className="text-green-500 text-lg mb-4 glow">🎉 YOU WON! 🎉</p>
        <p className="text-xs text-gray-400 mb-4">
          Prize: {formatEther(pot)} ETH has been sent to your wallet!
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-8bit"
        >
          PLAY AGAIN
        </button>
      </div>
    );
  }

  // Game not active - show start button
  if (!isActive) {
    return (
      <div className="text-center">
        <p className="text-xs text-gray-400 mb-4">
          No active game. Zoltar rests...
        </p>
        <button
          onClick={async () => {
            setIsStarting(true);
            try {
              const res = await fetch('/api/game/start', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              const data = await res.json();
              if (data.success) {
                refetchGame();
                onStartGame?.();
              } else {
                alert(data.error || 'Failed to start game');
              }
            } catch (e) {
              console.error(e);
              alert('Failed to start game');
            } finally {
              setIsStarting(false);
            }
          }}
          disabled={isStarting}
          className="btn-8bit"
        >
          {isStarting ? 'STARTING...' : 'START NEW GAME'}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Stats bar */}
      <div className="flex justify-between text-xs text-gray-400 px-2">
        <div>
          <span className="text-white">POT:</span> {formatEther(pot)} ETH
        </div>
        <div>
          <span className="text-white">TIME:</span> {formatTime(displayTime)}
        </div>
        {triesRemaining !== null && (
          <div>
            <span className="text-white">TRIES:</span> {triesRemaining}
          </div>
        )}
      </div>

      {/* Buy in or play */}
      {!effectivelyBoughtIn || triesRemaining === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-gray-400 mb-4">
            {triesRemaining === 0
              ? 'Out of tries! Buy in again for 5 more'
              : 'Buy in to get 5 tries'}
          </p>
          <button
            onClick={handleBuyIn}
            disabled={isBuyingIn}
            className="btn-8bit"
          >
            {isBuyingIn ? 'BUYING IN...' : 'BUY IN (0.001 ETH)'}
          </button>
        </div>
      ) : (
        <>
          {/* Chat history */}
          {chat.length > 0 && (
            <div
              ref={chatRef}
              onScroll={handleChatScroll}
              className="bg-black/50 border border-gray-700 p-3 max-h-48 overflow-y-auto space-y-3 scroll-smooth"
            >
              {chat.map((msg, i) => (
                <div key={i} className="text-xs">
                  <div className="text-purple-400">
                    {msg.address.slice(0, 6)}...{msg.address.slice(-4)}:
                    <span className="text-gray-300 ml-2">{msg.message}</span>
                  </div>
                  <div className="text-green-400 ml-4 mt-1">
                    Zoltar: {msg.response}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Zoltar or guess the word..."
              className="input-8bit"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="btn-8bit w-full"
            >
              {isSending ? 'SENDING...' : 'SEND (1 TRY)'}
            </button>
          </form>

          {/* Last response */}
          {lastResponse && (
            <div className="bg-black/50 border border-green-800 p-3 text-center">
              <p className="text-green-400 text-sm">{lastResponse}</p>
            </div>
          )}

          <p className="text-[8px] text-gray-500 text-center">
            Every message uses 1 try. Type the exact word to win!
          </p>
        </>
      )}
    </div>
  );
}
