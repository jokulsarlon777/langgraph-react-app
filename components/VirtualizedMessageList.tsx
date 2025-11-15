"use client";

import { memo, useRef, useEffect, useCallback, useState } from "react";
import { FixedSizeList as List } from "react-window";
import ChatMessage from "./ChatMessage";
import type { Message } from "@/lib/langgraph";

interface VirtualizedMessageListProps {
  messages: Message[];
  isStreaming: boolean;
  className?: string;
}

/**
 * 가상 스크롤링 메시지 리스트 컴포넌트
 * react-window를 사용하여 대량의 메시지를 효율적으로 렌더링
 */
const VirtualizedMessageList = memo(function VirtualizedMessageList({
  messages,
  isStreaming,
  className = "",
}: VirtualizedMessageListProps) {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);

  // 컨테이너 높이 계산
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setListHeight(rect.height || window.innerHeight - 200);
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // 스트리밍 중이거나 새 메시지가 추가되면 맨 아래로 스크롤
  useEffect(() => {
    if (isStreaming && listRef.current) {
      listRef.current.scrollToItem(messages.length - 1, "end");
    }
  }, [messages.length, isStreaming]);

  // 각 메시지 아이템 렌더링 함수
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const message = messages[index];
      if (!message) return null;

      return (
        <div style={style}>
          <ChatMessage message={message} />
        </div>
      );
    },
    [messages]
  );

  // 메시지가 없을 때
  if (messages.length === 0) {
    return (
      <div ref={containerRef} className={`flex-1 ${className}`}>
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--text-secondary)]">메시지가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex-1 min-h-0 ${className}`}>
      <List
        ref={listRef}
        height={listHeight}
        itemCount={messages.length}
        itemSize={200} // 예상 평균 높이 (동적으로 조정 가능)
        width="100%"
        overscanCount={5} // 뷰포트 밖 5개 아이템 미리 렌더링
      >
        {Row}
      </List>
    </div>
  );
});

VirtualizedMessageList.displayName = "VirtualizedMessageList";

export default VirtualizedMessageList;

