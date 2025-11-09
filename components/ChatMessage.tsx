"use client";

import ReactMarkdown from "react-markdown";
import { Message } from "@/lib/langgraph";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className="py-4">
      <div className="max-w-3xl mx-auto px-6">
        <div
          className={`flex w-full ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          {!isUser && (
            <div className="mr-3 mt-1 flex">
              <div className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center font-semibold border border-white/30">
                🤖
              </div>
            </div>
          )}

          <div
            className={`max-w-3xl rounded-3xl px-5 py-4 shadow-lg transition-transform ${
              isUser
                ? "bg-white/12 text-white border border-white/25"
                : "bg-[#111111] text-white border border-white/20"
            }`}
          >
            <div className="prose prose-invert max-w-none text-[16px] leading-7">
              {message.role !== "assistant" ? (
                <p className="whitespace-pre-wrap mb-0">{message.content}</p>
              ) : (
                <div className="space-y-4">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          {isUser && (
            <div className="ml-3 mt-1 hidden sm:flex">
              <div className="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center font-semibold border border-white/30">
                🙋
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

