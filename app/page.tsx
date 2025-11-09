"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { useThreadStore } from "@/store/threadStore";
import {
  createLangGraphClient,
  checkServerHealth,
  createThread,
  loadThreadMessages,
  getServerThreads,
  streamMessage,
  LANGGRAPH_API_URL,
  LANGGRAPH_ASSISTANT_ID,
} from "@/lib/langgraph";
import type { Message } from "@/lib/langgraph";
import { Client } from "@langchain/langgraph-sdk";

export default function Home() {
  const {
    messages,
    threadId,
    currentThreadId,
    threads,
    apiUrl,
    assistantId,
    apiKey,
    serverThreadsLoaded,
    switchToThreadId,
    setMessages,
    addMessage,
    updateLastAssistantMessage,
    setThreadId,
    setCurrentThreadId,
    addThread,
    updateThread,
    updateThreadMetadata,
    setServerThreadsLoaded,
    setSwitchToThreadId,
    reset,
  } = useThreadStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [processLogs, setProcessLogs] = useState<string[]>([]);
  const [showProcessLogs, setShowProcessLogs] = useState(false);

  useEffect(() => {
    const apiKeyToUse =
      apiUrl.includes("127.0.0.1") || apiUrl.includes("localhost")
        ? null
        : apiKey;
    const newClient = createLangGraphClient(apiUrl, apiKeyToUse);
    setClient(newClient);
  }, [apiUrl, apiKey]);

  useEffect(() => {
    if (!client || serverThreadsLoaded) return;

    let cancelled = false;

    const loadThreads = async () => {
      try {
        const isHealthy = await checkServerHealth(client);
        if (!isHealthy || cancelled) {
          console.error("Server health check failed");
          return;
        }

        setIsLoading(true);
        const serverThreads = await getServerThreads(client, assistantId);

        const convertMessages = (rawMessages: any[] = []) => {
          const formatted: Message[] = [];
          for (const msg of rawMessages) {
            if (typeof msg !== "object" || msg === null) continue;
            const role = (msg.type || msg.role || "").toString().toLowerCase();
            const content = msg.content || "";

            if (role.includes("human") || role.includes("user")) {
              formatted.push({ role: "user", content: String(content) });
            } else if (role.includes("ai") || role.includes("assistant")) {
              formatted.push({ role: "assistant", content: String(content) });
            }
          }
          return formatted;
        };

        for (const thread of serverThreads) {
          const serverThreadId = thread.thread_id;
          if (serverThreadId && !threads[serverThreadId]) {
            const formattedMessages = convertMessages(
              Array.isArray(thread.values?.messages)
                ? thread.values?.messages
                : []
            );
            let title = "New Thread";
            if (formattedMessages.length > 0) {
              title = formattedMessages[0].content.slice(0, 30);
            }

            addThread(serverThreadId, {
              title: title.length === 30 ? title + "..." : title,
              created_at: thread.created_at || new Date().toISOString(),
              message_count: formattedMessages.length,
              messages: formattedMessages,
            });
          }
        }

        if (!cancelled) {
          setServerThreadsLoaded(true);
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadThreads();

    return () => {
      cancelled = true;
    };
  }, [client, assistantId, serverThreadsLoaded, addThread, threads]);

  useEffect(() => {
    if (!client || !serverThreadsLoaded) return;
    if (threadId) return;

    let cancelled = false;

    const createNewThread = async () => {
      try {
        setIsLoading(true);
        const newThread = await createThread(client);
        if (!newThread || cancelled) return;

        const newThreadId = newThread.thread_id;
        setThreadId(newThreadId);
        setCurrentThreadId(newThreadId);
        addThread(newThreadId, {
          title: "새 대화",
          created_at: new Date().toISOString(),
          message_count: 0,
          messages: [],
        });
      } catch (error) {
        console.error("Failed to create new thread:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    createNewThread();

    return () => {
      cancelled = true;
    };
  }, [client, serverThreadsLoaded, threadId, addThread, setThreadId, setCurrentThreadId]);

  useEffect(() => {
    if (!threadId) return;
    if (messages.length > 0) return;

    const thread = threads[threadId];
    if (thread) {
      setMessages(thread.messages);
    }
  }, [threadId, threads, messages.length, setMessages]);

  useEffect(() => {
    if (!client || !switchToThreadId) return;

    const switchThread = async () => {
      try {
        setIsLoading(true);
        const threadMessages = await loadThreadMessages(client, switchToThreadId);
        setMessages(threadMessages);
        setThreadId(switchToThreadId);
        setCurrentThreadId(switchToThreadId);

        if (!threads[switchToThreadId]) {
          const firstUserMsg = threadMessages.find((m) => m.role === "user");
          const title = firstUserMsg
            ? firstUserMsg.content.slice(0, 30) +
              (firstUserMsg.content.length > 30 ? "..." : "")
            : "New Thread";

          addThread(switchToThreadId, {
            title,
            created_at: new Date().toISOString(),
            message_count: threadMessages.length,
            messages: threadMessages,
          });
        } else {
          updateThread(switchToThreadId, {
            messages: threadMessages,
            message_count: threadMessages.length,
          });
        }

        setSwitchToThreadId(null);
        setIsLoading(false);
      } catch (error) {
        console.error("Thread switch error:", error);
        setIsLoading(false);
      }
    };

    switchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, switchToThreadId]);

  const handleSendMessage = async (message: string) => {
    if (!client || !threadId) return;

    const userMessage = { role: "user" as const, content: message };
    addMessage(userMessage);
    updateThreadMetadata(threadId, "user", message);

    setIsStreaming(true);
    setProcessLogs([]);
    setShowProcessLogs(true);

    const fetchFinalAssistantResponse = async () => {
      try {
        const state = await client.threads.getState(threadId);
        if (state && typeof state === "object" && "values" in state) {
          const values = (state as any).values;

          if (values?.final_report) {
            return String(values.final_report);
          }

          if (Array.isArray(values?.messages)) {
            for (let i = values.messages.length - 1; i >= 0; i--) {
              const msg = values.messages[i];
              if (!msg) continue;
              const role = (msg.type || msg.role || "").toLowerCase();
              const content = msg.content || "";
              if ((role.includes("ai") || role.includes("assistant")) && content) {
                return String(content);
              }
            }
          }
        }
      } catch (fallbackError) {
        console.error("Fallback load failed:", fallbackError);
      }

      return null;
    };

    const extractAssistantText = (data: any): string => {
      if (!data) return "";

      const gather = (value: any): string => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (typeof value === "number" || typeof value === "boolean") {
          return String(value);
        }
        if (Array.isArray(value)) {
          return value.map((item) => gather(item)).join("");
        }
        if (typeof value === "object") {
          if ("text" in value && value.text) return gather((value as any).text);
          if ("content" in value && value.content) return gather((value as any).content);
          if ("value" in value && value.value) return gather((value as any).value);
          if ("data" in value && value.data) return gather((value as any).data);
          if ("messages" in value && value.messages) return gather((value as any).messages);
        }
        return "";
      };

      if (Array.isArray(data)) {
        return data.map((item) => gather(item)).join("");
      }

      return gather(data);
    };

    addMessage({ role: "assistant", content: "" });

    try {
      let fullResponse = "";
      let streamedContent = "";
      const logs: string[] = [];

      for await (const chunk of streamMessage(client, threadId, assistantId, message)) {
        if (chunk && typeof chunk === "object") {
          if ("event" in chunk && "data" in chunk) {
            const eventType = (chunk as any).event;
            const data = (chunk as any).data;

            if (eventType === "values") {
              if (typeof data === "object" && data !== null) {
                if ("final_report" in data && data.final_report) {
                  fullResponse = String(data.final_report);
                }
              }
            } else if (eventType === "messages") {
              const delta = extractAssistantText(data);
              if (delta) {
                streamedContent += delta;
                updateLastAssistantMessage(streamedContent);
              }
            } else if (eventType === "updates") {
              if (typeof data === "object" && data !== null) {
                for (const [nodeName, nodeData] of Object.entries(data)) {
                  if (nodeName === "__start__") continue;

                  const timestamp = new Date().toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  logs.push(`[${timestamp}] 🔹 **${nodeName}** 실행`);

                  if (
                    typeof nodeData === "object" &&
                    nodeData !== null &&
                    "final_report" in nodeData
                  ) {
                    const report = (nodeData as any).final_report;
                    if (report) {
                      fullResponse = String(report);
                      if (nodeName === "final_report_generation") {
                        logs.push(
                          `  ✅ 최종 리포트: ${String(report).length} 글자`
                        );
                      }
                    }
                  }

                  setProcessLogs([...logs]);
                }
              }
            }
          }
        }
      }

      if (!fullResponse && streamedContent) {
        fullResponse = streamedContent;
      }

      if (fullResponse) {
        updateLastAssistantMessage(fullResponse);
        updateThreadMetadata(threadId, "assistant", fullResponse);
      } else {
        const fallbackResponse = await fetchFinalAssistantResponse();
        if (fallbackResponse) {
          updateLastAssistantMessage(fallbackResponse);
          updateThreadMetadata(threadId, "assistant", fallbackResponse);
        } else {
          updateLastAssistantMessage("응답을 불러오지 못했습니다.");
        }
      }
    } catch (error) {
      console.error("Message send error:", error);

      const fallbackResponse = await fetchFinalAssistantResponse();
      if (fallbackResponse) {
        updateLastAssistantMessage(fallbackResponse);
        updateThreadMetadata(threadId, "assistant", fallbackResponse);
      } else {
        updateLastAssistantMessage("응답을 불러오지 못했습니다.");
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleNewThreadClick = async () => {
    if (!client) {
      console.error("Client not ready");
      return;
    }

    setProcessLogs([]);
    setShowProcessLogs(false);
    reset();

    try {
      setIsLoading(true);
      const newThread = await createThread(client);
      if (!newThread) {
        console.error("새 스레드 생성 실패");
        return;
      }

      const newThreadId = newThread.thread_id;
      setThreadId(newThreadId);
      setCurrentThreadId(newThreadId);
      addThread(newThreadId, {
        title: "새 대화",
        created_at: new Date().toISOString(),
        message_count: 0,
        messages: [],
      });
      setMessages([]);
    } catch (error) {
      console.error("새 스레드 생성 중 오류:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex bg-black text-white">
      <Sidebar onNewThread={handleNewThreadClick} />
      <div className="flex-1 flex flex-col bg-transparent min-w-0 min-h-0">
        <header className="border-b border-white/12 bg-black flex-shrink-0">
          <div className="max-w-3xl mx-auto w-full px-6 py-5 flex items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-[0.35em] text-white/70">
                Research Agent
              </span>
              <h1 className="text-2xl font-semibold text-white">AI Research Agent</h1>
              <p className="text-sm text-white leading-6">
                LangGraph 기반 심층 리서치를 돕는 대화형 워크스페이스
              </p>
            </div>
            <button className="hidden sm:inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg border border-white/20 text-sm font-semibold transition-colors">
              Plus 사용하기
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto">
          {messages.length > 0 ? (
            <div>
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              {isStreaming && (
                <div className="py-6">
                  <div className="max-w-3xl mx-auto px-6">
                    <div className="text-white/70">생성 중...</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col justify-center h-full px-6">
              <div className="max-w-3xl w-full mx-auto space-y-8">
                <div className="space-y-3">
                  <h2 className="text-3xl md:text-4xl font-semibold text-white">
                    오늘은 어떤 리서치를 도와드릴까요?
                  </h2>
                  <p className="text-white/80 text-base leading-relaxed">
                    궁금한 주제를 물어보거나, 분석이 필요한 데이터를 설명하세요. LangGraph가 심층 리포트를 도와드립니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {showProcessLogs && processLogs.length > 0 && (
            <div className="max-w-3xl mx-auto px-6 mt-6">
              <div className="bg-black border border-white/20 rounded-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/15">
                  <h3 className="text-white font-semibold text-sm tracking-wide">
                    🔄 처리 과정
                  </h3>
                  <button
                    onClick={() => setShowProcessLogs(false)}
                    className="text-white/70 hover:text-white text-sm"
                  >
                    닫기
                  </button>
                </div>
                <div className="text-sm text-white/80 space-y-1 max-h-56 overflow-y-auto px-5 py-4">
                  {processLogs.slice(-20).map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        <div className="flex-shrink-0">
          <ChatInput onSend={handleSendMessage} disabled={isStreaming || isLoading} />
        </div>
      </div>
    </div>
  );
}
