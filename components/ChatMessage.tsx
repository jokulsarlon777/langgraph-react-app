"use client";

import ReactMarkdown from "react-markdown";
import { Message } from "@/lib/langgraph";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

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
            className={`${containerClasses} rounded-[22px] px-8 py-5 transition-all border`}
          >
            <div className="text-[11px] uppercase tracking-[0.35em] text-[var(--text-secondary)]/70 mb-2">
              {isUser ? "You" : "AI"}
            </div>
            <div className={markdownClass}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
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
}

