"use client";

import { create } from "zustand";
import { Message, ThreadMetadata } from "@/lib/langgraph";

interface ThreadStore {
  messages: Message[];
  threadId: string | null;
  currentThreadId: string | null;
  threads: Record<string, ThreadMetadata>;
  apiUrl: string;
  assistantId: string;
  apiKey: string | null;
  serverThreadsLoaded: boolean;
  switchToThreadId: string | null;

  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateLastAssistantMessage: (content: string) => void;
  setThreadId: (threadId: string | null) => void;
  setCurrentThreadId: (threadId: string | null) => void;
  setThreads: (threads: Record<string, ThreadMetadata>) => void;
  addThread: (threadId: string, metadata: ThreadMetadata) => void;
  updateThread: (threadId: string, metadata: Partial<ThreadMetadata>) => void;
  setApiUrl: (url: string) => void;
  setAssistantId: (id: string) => void;
  setApiKey: (key: string | null) => void;
  setServerThreadsLoaded: (loaded: boolean) => void;
  setSwitchToThreadId: (threadId: string | null) => void;
  updateThreadMetadata: (threadId: string, role: "user" | "assistant", content: string) => void;
  reset: () => void;
}

const defaultApiUrl = process.env.NEXT_PUBLIC_LANGGRAPH_URL || "http://127.0.0.1:2024";
const defaultAssistantId = process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID || "Deep Researcher";

export const useThreadStore = create<ThreadStore>((set, get) => ({
  messages: [],
  threadId: null,
  currentThreadId: null,
  threads: {},
  apiUrl: defaultApiUrl,
  assistantId: defaultAssistantId,
  apiKey: null,
  serverThreadsLoaded: false,
  switchToThreadId: null,

  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          timestamp: message.timestamp || new Date().toISOString(),
        },
      ],
    })),
  updateLastAssistantMessage: (content) =>
    set((state) => {
      const updatedMessages = [...state.messages];
      if (updatedMessages.length === 0) {
        updatedMessages.push({
          role: "assistant",
          content,
          timestamp: new Date().toISOString(),
        });
      } else {
        const lastIndex = updatedMessages.length - 1;
        const lastMessage = updatedMessages[lastIndex];
        if (lastMessage.role === "assistant") {
          updatedMessages[lastIndex] = {
            ...lastMessage,
            content,
            timestamp: new Date().toISOString(),
          };
        } else {
          updatedMessages.push({
            role: "assistant",
            content,
            timestamp: new Date().toISOString(),
          });
        }
      }
      return { messages: updatedMessages };
    }),
  setThreadId: (threadId) => set({ threadId }),
  setCurrentThreadId: (threadId) => set({ currentThreadId: threadId }),
  setThreads: (threads) => set({ threads }),
  addThread: (threadId, metadata) =>
    set((state) => ({
      threads: { ...state.threads, [threadId]: metadata },
    })),
  updateThread: (threadId, metadata) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [threadId]: { ...state.threads[threadId], ...metadata },
      },
    })),
  setApiUrl: (url) => set({ apiUrl: url }),
  setAssistantId: (id) => set({ assistantId: id }),
  setApiKey: (key) => set({ apiKey: key }),
  setServerThreadsLoaded: (loaded) => set({ serverThreadsLoaded: loaded }),
  setSwitchToThreadId: (threadId) => set({ switchToThreadId: threadId }),
  updateThreadMetadata: (threadId, role, content) => {
    const state = get();
    const thread = state.threads[threadId];
    
    if (!thread) {
      const title = content.length > 30 ? content.slice(0, 30) + "..." : content;
      set({
        threads: {
          ...state.threads,
          [threadId]: {
            title,
            created_at: new Date().toISOString(),
            message_count: 1,
            messages: [
              {
                role,
                content,
                timestamp: new Date().toISOString(),
              },
            ],
          },
        },
      });
    } else {
      const updatedThread = {
        ...thread,
        message_count: thread.message_count + 1,
        messages: [
          ...thread.messages,
          {
            role,
            content,
            timestamp: new Date().toISOString(),
          },
        ],
      };
      
      if (thread.message_count === 0 && role === "user") {
        updatedThread.title = content.length > 30 ? content.slice(0, 30) + "..." : content;
      }
      
      set({
        threads: {
          ...state.threads,
          [threadId]: updatedThread,
        },
      });
    }
  },
  reset: () =>
    set({
      messages: [],
      threadId: null,
      currentThreadId: null,
      switchToThreadId: null,
    }),
}));

