"use client";

import { useState, KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full bg-black border-t border-white/15 px-6 py-5">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3 bg-black border border-white/20 rounded-2xl p-4 shadow-[0_18px_45px_-30px_rgba(0,0,0,0.75)] focus-within:border-white/70 focus-within:ring-2 focus-within:ring-white/30 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message AI Research Agent..."
            disabled={disabled}
            className="flex-1 bg-transparent text-white placeholder-white/50 caret-white resize-none outline-none px-1 py-1 min-h-[24px] max-h-[200px] text-[15px] leading-relaxed font-medium"
            rows={1}
            style={{
              height: "auto",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            className="bg-white text-black hover:bg-white/90 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl transition-all flex-shrink-0 shadow-lg shadow-white/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

