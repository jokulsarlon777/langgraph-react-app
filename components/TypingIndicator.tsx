"use client";

import { memo } from "react";

/**
 * 타이핑 인디케이터 컴포넌트
 * 스트리밍 중일 때 표시되는 애니메이션
 */
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-8 py-4">
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-sm text-[var(--text-secondary)] ml-2">AI가 입력 중...</span>
    </div>
  );
});

TypingIndicator.displayName = "TypingIndicator";

export default TypingIndicator;

