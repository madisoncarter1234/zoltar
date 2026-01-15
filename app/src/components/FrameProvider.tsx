'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { createContext, useContext, useEffect, useState } from 'react';

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface MiniAppClient {
  platformType?: 'web' | 'mobile';
  clientFid: number;
  added: boolean;
  safeAreaInsets?: SafeAreaInsets;
  notificationDetails?: {
    url: string;
    token: string;
  };
}

interface MiniAppUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface MiniAppContext {
  user: MiniAppUser;
  location?: Record<string, unknown>;
  client: MiniAppClient;
}

type FrameContextType = {
  context: MiniAppContext | Record<string, unknown> | null;
  isInMiniApp: boolean;
} | null;

const FrameContext = createContext<FrameContextType>(null);

export const useFrameContext = () => useContext(FrameContext);

export function FrameProvider({ children }: { children: React.ReactNode }) {
  const [frameContext, setFrameContext] = useState<FrameContextType>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const context = await sdk.context;
        sdk.actions.ready();
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isInMiniApp = await sdk.isInMiniApp();
        setFrameContext({ context, isInMiniApp });
      } catch {
        // Not in a mini app context - that's fine for local dev
        setFrameContext({
          context: null,
          isInMiniApp: false,
        });
      }
    };

    init();
  }, []);

  return (
    <FrameContext.Provider value={frameContext}>
      {children}
    </FrameContext.Provider>
  );
}
