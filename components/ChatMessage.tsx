"use client";

import ReactMarkdown from "react-markdown";
import { Message } from "@/lib/langgraph";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  const userMarkdownClass =
    "space-y-4 prose prose-sm max-w-none break-words prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-primary)] prose-strong:text-[var(--text-primary)] prose-em:text-[var(--text-primary)] prose-code:text-[var(--text-primary)] prose-li:text-[var(--text-primary)] prose-ul:text-[var(--text-primary)] prose-ol:text-[var(--text-primary)] prose-a:text-[var(--text-primary)] hover:prose-a:text-[var(--text-primary)]/80";

  const assistantMarkdownClass =
    "space-y-6 prose prose-sm md:prose-base max-w-none break-words prose-headings:font-semibold prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-primary)] prose-li:text-[var(--text-primary)] prose-strong:text-[var(--text-primary)] prose-code:text-[var(--text-primary)] prose-a:text-[var(--text-primary)] hover:prose-a:text-[var(--text-primary)]/80";

  return (
    <div className="py-4">
      <div className="max-w-4xl mx-auto px-12 md:px-16">
        <div
          className={`flex w-full gap-4 ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          {!isUser && (
            <div className="mt-1 flex-shrink-0 flex items-start">
              <div className="w-9 h-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-semibold border border-[#d4d4db]">
                🤖
              </div>
            </div>
          )}

          {isUser ? (
            <div
              className={`w-fit min-w-[260px] max-w-[65%] xl:max-w-[55%] rounded-[28px] px-12 py-6 shadow-[0_18px_44px_-32px_rgba(30,30,30,0.25)] transition-transform bg-[#f0f0f3] text-[var(--text-primary)] border border-[#d4d4da]`}
            >
              <div className="max-w-none text-[17px] leading-[1.75] break-words text-[var(--text-primary)]">
                <div className={userMarkdownClass}>
                  {message.role !== "assistant" ? (
                    <p className="whitespace-pre-wrap mb-0 text-inherit">
                      {message.content}
                    </p>
                  ) : (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <div className={assistantMarkdownClass}>
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          )}

          {isUser && (
            <div className="mt-1 hidden sm:flex flex-shrink-0 items-start">
              <div className="w-9 h-9 rounded-full bg-[#ececef] text-[var(--accent)] flex items-center justify-center font-semibold border border-[#d4d4db]">
                🙋
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

