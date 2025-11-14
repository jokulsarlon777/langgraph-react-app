"use client";

import { useState, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onDeepResearch?: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onDeepResearch, disabled }: ChatInputProps) {
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
    <div className="w-full">
      <div 
        className="flex items-center rounded-[30px] bg-[#4f4f4f] pr-6 py-5 shadow-[0_18px_48px_-30px_rgba(0,0,0,0.7)] transition-all focus-within:shadow-[0_24px_54px_-28px_rgba(20,20,35,0.85)]"
        style={{ border: "none", outline: "none" }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="무엇이든 물어보세요"
          disabled={disabled}
          className={`flex-1 bg-transparent text-[#f5f6f8] placeholder-[#80818b] caret-[var(--accent)] resize-none outline-none border-0 min-h-[44px] max-h-[220px] text-[16px] ${!input.trim() ? 'text-center' : 'text-left'}`}
          rows={1}
          style={{
            height: "44px",
            lineHeight: "44px",
            padding: "0",
            paddingRight: "12px",
            verticalAlign: "middle",
            border: "none",
            outline: "none",
            boxShadow: "none",
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            const newHeight = Math.min(Math.max(target.scrollHeight, 44), 220);
            target.style.height = `${newHeight}px`;
            if (newHeight === 44) {
              target.style.lineHeight = "44px";
            } else {
              target.style.lineHeight = "1.5";
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="flex-shrink-0 h-11 w-11 ml-3 flex items-center justify-center rounded-full bg-gradient-to-b from-[#5c5e68] to-[#3f4048] text-white hover:from-[var(--accent)] hover:to-[var(--accent)] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:from-[#34353b] disabled:to-[#34353b] disabled:text-[#8a8c95]"
          aria-label="Send message"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

