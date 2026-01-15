'use client';

import { useState, useCallback } from 'react';
import { Zoltar } from 'src/components/Zoltar';
import { GameControls } from 'src/components/GameControls';

interface QA {
  question: string;
  answer: string;
}

export default function Page() {
  const [qaHistory, setQaHistory] = useState<QA[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  const handleAsk = useCallback(async (question: string) => {
    setIsAsking(true);
    setIsSpeaking(true);
    setCurrentMessage('');

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (data.error) {
        setCurrentMessage(data.error);
      } else {
        setCurrentMessage(data.answer);
        setQaHistory(prev => [...prev, { question, answer: data.answer }]);
      }
    } catch {
      setCurrentMessage('The spirits are disturbed... Try again.');
    } finally {
      setIsAsking(false);
      setTimeout(() => setIsSpeaking(false), 500);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 scanlines">
      {/* Title */}
      <h1 className="text-xl mb-2 tracking-wider glow">EXTRACT</h1>
      <p className="text-[8px] text-gray-500 mb-8">CAN YOU OUTSMART THE ORACLE?</p>

      {/* Zoltar */}
      <Zoltar speaking={isSpeaking} message={currentMessage} />

      {/* Game Controls */}
      <div className="mt-8 w-full max-w-md">
        <GameControls onAsk={handleAsk} isAsking={isAsking} />
      </div>

      {/* Q&A History */}
      {qaHistory.length > 0 && (
        <div className="mt-8 w-full max-w-md">
          <div className="terminal p-4 max-h-48 overflow-y-auto">
            <p className="text-[8px] text-gray-500 mb-2">// CONSULTATION LOG</p>
            {qaHistory.map((qa, i) => (
              <div key={i} className="mb-3 text-[10px]">
                <p className="text-gray-400">
                  <span className="text-white">&gt;</span> {qa.question}
                </p>
                <p className="text-green-500 mt-1 pl-2">{qa.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto pt-8 pb-4 text-[6px] text-gray-600">
        BUILT ON BASE
      </footer>
    </div>
  );
}
