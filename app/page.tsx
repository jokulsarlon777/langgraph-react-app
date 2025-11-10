"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import RightSidebar from "@/components/RightSidebar";
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

const extractUrlsFromText = (text: string): string[] => {
  if (!text) return [];
  const urlRegex = /https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+/gi;
  const matches = text.match(urlRegex);
  return matches ? Array.from(new Set(matches)) : [];
};

const quickPrompts = [
  {
    title: "What are the advantages",
    description: "of using Assistant Cloud?",
    message:
      "What are the advantages of using Assistant Cloud? Please highlight key differentiators.",
  },
  {
    title: "Write code to",
    description: "demonstrate topological sorting",
    message:
      "Can you write TypeScript code that demonstrates topological sorting with a DAG example?",
  },
  {
    title: "Help me write an essay",
    description: "about AI chat applications",
    message:
      "Help me write an essay about modern AI chat applications and their key capabilities.",
  },
  {
    title: "What is the weather",
    description: "in San Francisco?",
    message:
      "What's the current weather in San Francisco? Include temperature and conditions.",
  },
];

type ActivityEvent = {
  type: "user" | "assistant" | "log";
  content: string;
  timestamp: string;
};

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
  const [activityEvents, setActivityEvents] = useState<Record<string, ActivityEvent[]>>({});
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

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

            setActivityEvents((prev) => {
              if (prev[serverThreadId]) return prev;
              const events = formattedMessages.map((message) => ({
                type: message.role,
                content: message.content,
                timestamp: new Date().toISOString(),
              } as ActivityEvent));
              return {
                ...prev,
                [serverThreadId]: events,
              };
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
        setActivityEvents((prev) => ({
          ...prev,
          [newThreadId]: [],
        }));
        setMessages([]);
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

    setActivityEvents((prev) => {
      const prevEvents = prev[threadId] ?? [];
      return {
        ...prev,
        [threadId]: [
          ...prevEvents,
          {
            type: "user",
            content: message,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    });

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

                  const timestamp = new Date().toISOString();
                  const readableTime = new Date(timestamp).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  const logEntry = `[${readableTime}] 🔹 **${nodeName}** 실행`;
                  logs.push(logEntry);
                  setActivityEvents((prev) => {
                    const prevEvents = prev[threadId] ?? [];
                    return {
                      ...prev,
                      [threadId]: [
                        ...prevEvents,
                        {
                          type: "log",
                          content: logEntry,
                          timestamp,
                        },
                      ],
                    };
                  });

                  if (
                    typeof nodeData === "object" &&
                    nodeData !== null &&
                    "final_report" in nodeData
                  ) {
                    const report = (nodeData as any).final_report;
                    if (report) {
                      fullResponse = String(report);
                      if (nodeName === "final_report_generation") {
                        const reportLog = `  ✅ 최종 리포트: ${String(report).length} 글자`;
                        logs.push(reportLog);
                        setActivityEvents((prev) => {
                          const prevEvents = prev[threadId] ?? [];
                          return {
                            ...prev,
                            [threadId]: [
                              ...prevEvents,
                              {
                                type: "log",
                                content: reportLog,
                                timestamp: new Date().toISOString(),
                              },
                            ],
                          };
                        });
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
        setActivityEvents((prev) => {
          const prevEvents = prev[threadId] ?? [];
          return {
            ...prev,
            [threadId]: [
              ...prevEvents,
              {
                type: "assistant",
                content: fullResponse,
                timestamp: new Date().toISOString(),
              },
            ],
          };
        });
      } else {
        const fallbackResponse = await fetchFinalAssistantResponse();
        if (fallbackResponse) {
          updateLastAssistantMessage(fallbackResponse);
          updateThreadMetadata(threadId, "assistant", fallbackResponse);
          setActivityEvents((prev) => {
            const prevEvents = prev[threadId] ?? [];
            return {
              ...prev,
              [threadId]: [
                ...prevEvents,
                {
                  type: "assistant",
                  content: fallbackResponse,
                  timestamp: new Date().toISOString(),
                },
              ],
            };
          });
        } else {
          updateLastAssistantMessage("응답을 불러오지 못했습니다.");
          setActivityEvents((prev) => {
            const prevEvents = prev[threadId] ?? [];
            return {
              ...prev,
              [threadId]: [
                ...prevEvents,
                {
                  type: "assistant",
                  content: "응답을 불러오지 못했습니다.",
                  timestamp: new Date().toISOString(),
                },
              ],
            };
          });
        }
      }
    } catch (error) {
      console.error("Message send error:", error);

      const fallbackResponse = await fetchFinalAssistantResponse();
      if (fallbackResponse) {
        updateLastAssistantMessage(fallbackResponse);
        updateThreadMetadata(threadId, "assistant", fallbackResponse);
        setActivityEvents((prev) => {
          const prevEvents = prev[threadId] ?? [];
          return {
            ...prev,
            [threadId]: [
              ...prevEvents,
              {
                type: "assistant",
                content: fallbackResponse,
                timestamp: new Date().toISOString(),
              },
            ],
          };
        });
      } else {
        updateLastAssistantMessage("응답을 불러오지 못했습니다.");
        setActivityEvents((prev) => {
          const prevEvents = prev[threadId] ?? [];
          return {
            ...prev,
            [threadId]: [
              ...prevEvents,
              {
                type: "assistant",
                content: "응답을 불러오지 못했습니다.",
                timestamp: new Date().toISOString(),
              },
            ],
          };
        });
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
      setActivityEvents((prev) => ({
        ...prev,
        [newThreadId]: [],
      }));
    } catch (error) {
      console.error("새 스레드 생성 중 오류:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const assistantMessages = messages.filter((m) => m.role === "assistant");
  const latestAssistantMessage =
    assistantMessages.length > 0
      ? assistantMessages[assistantMessages.length - 1]
      : null;
  const referenceLinks = latestAssistantMessage
    ? extractUrlsFromText(latestAssistantMessage.content).map((url) => ({ url }))
    : [];
  const activityFeed = messages.map((message) => ({
    type: message.role,
    content: message.content,
    timestamp: new Date().toISOString(),
  }));
  const currentActivityEvents = threadId
    ? activityEvents[threadId] ?? activityFeed
    : [];

  const handleQuickPrompt = (prompt: string) => {
    if (isStreaming || isLoading) return;
    handleSendMessage(prompt);
  };

  return (
    <div className="h-screen overflow-hidden flex bg-[var(--bg-root)] text-[var(--text-primary)]">
      <Sidebar onNewThread={handleNewThreadClick} />
      <div className="flex-1 flex flex-col bg-transparent min-w-0 min-h-0">
        <header className="border-b border-[#e0e4f6] bg-white flex-shrink-0 shadow-sm">
          <div className="max-w-4xl mx-auto w-full px-8 py-6 flex items-center justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.5em] text-[#8a8a94]">
                Research Agent
              </span>
              <h1 className="text-[2.15rem] font-semibold text-[var(--text-primary)] tracking-tight">
                AI Research Agent
              </h1>
              <p className="text-[15px] text-[#60606a] leading-6">
                LangGraph 기반 심층 리서치를 돕는 정교한 워크스페이스
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsRightSidebarOpen((prev) => !prev)}
                aria-label="Toggle insights"
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-[#d4d4da] shadow-sm transition-colors ${
                  isRightSidebarOpen
                    ? "bg-[#f0f0f3] text-[var(--text-primary)] hover:bg-[#e4e4e9]"
                    : "bg-white text-[var(--text-primary)] hover:bg-[#f0f0f3]"
                }`}
              >
                {isRightSidebarOpen ? "−" : "+"}
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto bg-[var(--bg-root)] px-12 md:px-20 lg:px-28 xl:px-36 py-10">
          {messages.length > 0 ? (
            <div className="space-y-5">
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              {isStreaming && <div className="text-[#6b7195] px-4">생성 중...</div>}
              {showProcessLogs && processLogs.length > 0 && (
                <div className="bg-[var(--bg-surface)] border border-[#dfe0e6] rounded-[26px] shadow-lg">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#e0e4f6]">
                    <h3 className="text-[var(--text-primary)] font-semibold text-sm tracking-wide">
                      🔄 처리 과정
                    </h3>
                    <button
                      onClick={() => setShowProcessLogs(false)}
                      className="text-[#6f6f78] hover:text-[var(--text-primary)] text-sm"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="text-sm text-[#5f5f68] space-y-1 max-h-56 overflow-y-auto px-5 py-4">
                    {processLogs.slice(-20).map((log, index) => (
                      <div key={index}>{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-4 text-center space-y-6">
              <h2 className="text-[30px] md:text-[34px] font-semibold text-[var(--text-primary)]">
                Ready to dive deep?
              </h2>
              <p className="text-[#838389] text-lg leading-relaxed">
                What would you like to research?
              </p>
            </div>
          )}
        </main>
        <div className="flex-shrink-0 bg-[var(--bg-root)] px-6 md:px-12 lg:px-20 xl:px-28 pb-12">
          <div className="max-w-2xl mx-auto w-full space-y-6">
            {messages.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.title}
                    onClick={() => handleQuickPrompt(prompt.message)}
                    className="text-left bg-white border border-[#dfe0e6] hover:border-[var(--accent)]/45 hover:shadow-lg transition-all rounded-[22px] px-5 py-4 shadow-sm"
                  >
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      {prompt.title}
                    </div>
                    <div className="text-xs text-[#7c7c85] mt-1">
                      {prompt.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <ChatInput onSend={handleSendMessage} disabled={isStreaming || isLoading} />
          </div>
        </div>
      </div>
      {isRightSidebarOpen && (
        <div className="flex-shrink-0 border-l border-[#dcdce2] bg-white">
          <RightSidebar
            references={referenceLinks}
            activity={currentActivityEvents}
            processLogs={processLogs}
          />
        </div>
      )}
    </div>
  );
}
