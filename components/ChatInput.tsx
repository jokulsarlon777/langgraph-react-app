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
    <div className="w-full">
      <div className="rounded-[34px] border border-[#d6d6dc] bg-white shadow-[0_18px_45px_-32px_rgba(20,20,20,0.25)] p-5 transition-all focus-within:border-[var(--accent)]/35 focus-within:ring-2 focus-within:ring-[var(--accent)]/12">
        <div className="flex items-end gap-3">
          <button
            type="button"
            className="h-9 w-9 flex items-center justify-center rounded-full border border-[#d4d4da] text-[var(--text-primary)] bg-[#f5f5f7]"
            disabled
            aria-label="Add attachment"
          >
            +
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            disabled={disabled}
            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[#9a9aa3] caret-[var(--accent)] resize-none outline-none min-h-[36px] max-h-[200px] text-[15px] leading-relaxed"
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
            className="flex items-center justify-center rounded-full h-9 w-9 border border-[#d4d4da] bg-[#f0f0f3] text-[var(--text-primary)] hover:bg-[#e5e5ea] disabled:bg-[#ececef] disabled:text-[#a5a5ad]"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

