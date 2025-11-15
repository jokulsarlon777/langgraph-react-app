"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onDeepResearch?: (message: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function ChatInput({ onSend, onDeepResearch, disabled, autoFocus = false }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // 자동 포커스
  useEffect(() => {
    if (autoFocus && textareaRef.current && !disabled) {
      // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 포커스
      const timeoutId = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [autoFocus, disabled]);

  return (
    <div className="w-full fade-in">
      <div 
        className="flex items-center rounded-[30px] pl-6 pr-6 py-5 shadow-[0_18px_48px_-30px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-all duration-300 focus-within:shadow-[0_24px_54px_-28px_rgba(61,106,255,0.25)] focus-within:scale-[1.01]"
        style={{ 
          border: "none", 
          outline: "none", 
          backgroundColor: "var(--input-field-bg)",
          background: "linear-gradient(135deg, var(--input-field-bg) 0%, rgba(255,255,255,0.1) 100%)"
        }}
        role="form"
        aria-label="메시지 입력 폼"
      >
        <span id="input-description" className="sr-only">
          메시지를 입력하고 Enter 키를 누르거나 전송 버튼을 클릭하여 전송할 수 있습니다.
        </span>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "전송 중..." : "무엇이든 물어보세요"}
          disabled={disabled}
          className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] placeholder:text-left caret-[var(--accent)] resize-none outline-none border-0 min-h-[44px] max-h-[220px] text-[16px] text-left transition-all duration-200 focus:outline-none"
          rows={1}
          aria-label="메시지 입력"
          aria-describedby="input-description"
          style={{
            height: "44px",
            lineHeight: "44px",
            padding: "0",
            paddingLeft: "16px",
            paddingRight: "12px",
            verticalAlign: "middle",
            border: "none",
            outline: "none",
            boxShadow: "none",
            textAlign: "left",
          }}
          onFocus={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.textAlign = "left";
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
          className="flex-shrink-0 ml-3 flex items-center justify-center rounded-full bg-gradient-to-b from-[#9ca3af] to-[#6b7280] text-white hover:from-[#9ca3af] hover:to-[#6b7280] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 disabled:from-[#d1d5db] disabled:to-[#d1d5db] disabled:text-[#9ca3af] border-0"
          style={{ width: "35px", height: "35px", aspectRatio: "1/1", border: "none", outline: "none" }}
          aria-label="메시지 전송"
          title="전송 (Enter)"
        >
          <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

