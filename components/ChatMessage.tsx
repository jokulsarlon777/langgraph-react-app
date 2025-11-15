"use client";

import { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check } from "lucide-react";
import { Message } from "@/lib/langgraph";
import LazyImage from "./LazyImage";
import LazyUrlPreview from "./LazyUrlPreview";
import toast from "react-hot-toast";

interface ChatMessageProps {
  message: Message;
}

/**
 * 메시지 컴포넌트 - React.memo로 메모이제이션
 * props가 변경되지 않으면 리렌더링 방지
 */
const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  // URL과 이미지 URL 추출 (메모이제이션)
  const { urls, imageUrls } = useMemo(() => {
    const urlRegex = /https?:\/\/[\w\-._~:\/?#\[\]@!$&'()*+,;=%]+/gi;
    const imageRegex = /https?:\/\/[\w\-._~:\/?#\[\]@!$&'()*+,;=%]+\.(jpg|jpeg|png|gif|webp|svg)/gi;
    
    const allUrls = message.content.match(urlRegex) || [];
    const images = message.content.match(imageRegex) || [];
    const nonImageUrls = allUrls.filter(url => !images.includes(url));
    
    return {
      urls: Array.from(new Set(nonImageUrls)),
      imageUrls: Array.from(new Set(images)),
    };
  }, [message.content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("메시지가 클립보드에 복사되었습니다.", { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("복사에 실패했습니다.");
    }
  };

  const markdownClass =
    "prose prose-sm md:prose-base max-w-none break-words prose-headings:font-semibold prose-p:leading-7 prose-li:leading-7 prose-a:text-[var(--accent)] hover:prose-a:text-[var(--accent)]/80";

  const containerClasses = isUser
    ? "w-fit min-w-[220px] max-w-[65%] xl:max-w-[55%] bg-[var(--chat-user-bg)] text-[var(--chat-user-text)] border-[var(--chat-user-border)] shadow-[var(--chat-user-shadow)]"
    : "w-full bg-[var(--chat-assistant-bg)] text-[var(--chat-assistant-text)] border-[var(--chat-assistant-border)] shadow-[var(--chat-assistant-shadow)]";

  return (
    <div className="py-4">
      <div className="max-w-4xl mx-auto px-10 md:px-16">
        <div
          className={`flex w-full ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`${containerClasses} rounded-[22px] px-8 py-5 transition-all border relative group`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-[0.35em] text-[var(--text-secondary)]/70">
                {isUser ? "You" : "AI"}
              </div>
              <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-[var(--bg-surface)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
                aria-label="메시지 복사"
                title="복사"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[var(--accent)]" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" aria-hidden="true" />
                )}
              </button>
            </div>
            <div className={markdownClass}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            
            {/* 이미지 지연 로딩 */}
            {imageUrls.length > 0 && (
              <div className="mt-4 space-y-2">
                {imageUrls.map((imageUrl, idx) => (
                  <LazyImage
                    key={`${imageUrl}-${idx}`}
                    src={imageUrl}
                    alt={`이미지 ${idx + 1}`}
                    className="rounded-lg"
                  />
                ))}
              </div>
            )}
            
            {/* URL 미리보기 지연 로딩 */}
            {urls.length > 0 && (
              <div className="mt-4 space-y-2">
                {urls.map((url, idx) => (
                  <LazyUrlPreview
                    key={`${url}-${idx}`}
                    url={url}
                  />
                ))}
              </div>
            )}
            
            {message.timestamp && (
              <div
                className={`mt-3 text-[11px] text-[var(--text-secondary)]/70 ${
                  isUser ? "text-right" : "text-left"
                }`}
              >
                {new Date(message.timestamp).toLocaleString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 커스텀 비교 함수: 메시지 내용과 타임스탬프만 비교
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.timestamp === nextProps.message.timestamp &&
    prevProps.message.role === nextProps.message.role
  );
});

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;

