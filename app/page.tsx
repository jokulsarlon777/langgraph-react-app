"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
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
import ResearchReport from "@/components/ResearchReport/ResearchReport";
import type {
  ReportSectionData,
  ReportSource,
} from "@/components/ResearchReport/types";

const extractUrlsFromText = (text: string): string[] => {
  if (!text) return [];
  const urlRegex = /https?:\/\/[\w\-._~:\/?#\[\]@!$&'()*+,;=%]+/gi;
  const matches = text.match(urlRegex);
  return matches ? Array.from(new Set(matches)) : [];
};

const MAX_SECTION_TITLE_LENGTH = 68;

function buildSections(messages: Message[], threadId: string | null): ReportSectionData[] {
  const sections: ReportSectionData[] = [];
  messages.forEach((message, index) => {
    if (message.role !== "assistant") {
      return;
    }

    const precedingUser = findPrecedingUser(messages, index);
    const rawTitle = precedingUser?.content?.split("\n")[0] ?? `AI 인사이트 ${index + 1}`;
    const title = rawTitle.length > MAX_SECTION_TITLE_LENGTH
      ? `${rawTitle.slice(0, MAX_SECTION_TITLE_LENGTH)}…`
      : rawTitle;

    const tags = message.tags?.filter(Boolean) ?? [];

    sections.push({
      id: `${threadId ?? "local"}-${index}`,
      title,
      content: message.content,
      metrics:
        tags.length > 0 ? tags.map((tag) => ({ label: tag, value: "" })) : undefined,
    });
  });
  return sections;
}

function findPrecedingUser(messages: Message[], assistantIndex: number) {
  for (let i = assistantIndex - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") return messages[i];
  }
  return null;
}

function buildSources(urls: string[]): ReportSource[] {
  return urls.map((url) => ({
    title: extractDomain(url),
    url,
  }));
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (err) {
    return url;
  }
}

function computeDurationSeconds(events: ActivityEvent[]) {
  if (events.length < 2) return 30;
  const first = new Date(events[0].timestamp).getTime();
  const last = new Date(events[events.length - 1].timestamp).getTime();
  if (Number.isNaN(first) || Number.isNaN(last) || last <= first) {
    return 30;
  }
  return Math.max(30, Math.round((last - first) / 1000));
}

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
  const [activityEvents, setActivityEvents] = useState<Record<string, ActivityEvent[]>>({});
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [themePreference, setThemePreference] = useState<"light" | "dark" | "system">(() => {
    if (typeof window !== "undefined") {
      return (
        (window.localStorage.getItem("preferred-theme") as
          | "light"
          | "dark"
          | "system"
          | null) || "system"
      );
    }
    return "system";
  });

  const applyThemePreference = useCallback((value: "light" | "dark" | "system") => {
    if (typeof document !== "undefined") {
      const isDarkPreferred =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const finalTheme = value === "system" ? (isDarkPreferred ? "dark" : "light") : value;
      document.body.dataset.theme = finalTheme;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("preferred-theme", value);
    }
  }, []);

  useEffect(() => {
    applyThemePreference(themePreference);
  }, [themePreference, applyThemePreference]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => {
      if (themePreference === "system") {
        document.body.dataset.theme = event.matches ? "dark" : "light";
      }
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }

    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [themePreference]);

  useEffect(() => {
    const apiKeyToUse =
      apiUrl.includes("127.0.0.1") || apiUrl.includes("localhost")
        ? null
        : apiKey;
    const newClient = createLangGraphClient(apiUrl, apiKeyToUse);
    setClient(newClient);
  }, [apiUrl, apiKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 1280px)");
    const applyState = (matches: boolean) => {
      setIsRightSidebarOpen(!matches);
    };

    applyState(media.matches);

    const listener = (event: MediaQueryListEvent) => applyState(event.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }

    media.addListener(listener);
    return () => media.removeListener(listener);
  }, []);

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
            const timestamp =
              (msg.created_at as string | undefined) ||
              (msg.timestamp as string | undefined) ||
              new Date().toISOString();
            const tags = Array.isArray((msg as any).tags)
              ? ((msg as any).tags as string[])
              : undefined;

            if (role.includes("human") || role.includes("user")) {
              formatted.push({
                role: "user",
                content: String(content),
                timestamp,
                tags,
              });
            } else if (role.includes("ai") || role.includes("assistant")) {
              formatted.push({
                role: "assistant",
                content: String(content),
                timestamp,
                tags,
              });
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
                timestamp:
                  message.timestamp || thread.created_at || new Date().toISOString(),
              }));
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

    const timestamp = new Date().toISOString();
    const userMessage = { role: "user" as const, content: message, timestamp };
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
            timestamp,
          },
        ],
      };
    });

    setIsStreaming(true);
    setProcessLogs([]);

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

                  const eventTimestamp = new Date().toISOString();
                  const readableTime = new Date(eventTimestamp).toLocaleTimeString("ko-KR", {
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
                          timestamp: eventTimestamp,
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
          const fallbackTimestamp = new Date().toISOString();
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
                  timestamp: fallbackTimestamp,
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
        const fallbackTimestamp = new Date().toISOString();
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
                timestamp: fallbackTimestamp,
              },
            ],
          };
        });
      } else {
        const fallbackTimestamp = new Date().toISOString();
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
                timestamp: fallbackTimestamp,
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

  const assistantMessages = messages.filter((msg) => msg.role === "assistant");
  const latestAssistantMessage = assistantMessages.at(-1) || null;
  const allReferenceUrls = Array.from(
    new Set(
      assistantMessages.flatMap((msg) => extractUrlsFromText(msg.content || ""))
    )
  );
  const referenceLinks = allReferenceUrls.map((url) => ({ url }));
  const activityFeed = messages.map((message) => ({
    type: message.role,
    content: message.content,
    timestamp: new Date().toISOString(),
  }));
  const currentActivityEvents = threadId
    ? activityEvents[threadId] ?? activityFeed
    : [];

  const reportSections = buildSections(messages, threadId);
  const reportSources: ReportSource[] = buildSources(allReferenceUrls);
  const reportOverview = latestAssistantMessage?.content ||
    (reportSections[0]?.content ?? "아직 생성된 리포트가 없습니다.");
  const reportDuration = computeDurationSeconds(currentActivityEvents);
  const reportStatus: "loading" | "completed" | "error" =
    isStreaming || isLoading
      ? "loading"
      : assistantMessages.length > 0
      ? "completed"
      : "loading";
  const reportTitle = threads[threadId || ""]?.title || "AI Research Agent";
  const reportSubtitle = messages.find((msg) => msg.role === "user")?.content
    ?.split("\n")[0]
    ?.slice(0, 80) || "심층 분석 리포트";

  const reportData = {
    title: reportTitle,
    subtitle: reportSubtitle,
    status: reportStatus,
    duration: reportDuration,
    overview: reportOverview,
    sections: reportSections,
    sources: reportSources,
  } as const;

  const handleDeepResearch = (message: string) => {
    if (!message.trim()) return;
    const enriched = `[Deep Research] ${message.trim()}`;
    void handleSendMessage(enriched);
  };

  return (
    <div className="h-screen overflow-hidden flex bg-[var(--bg-root)] text-[var(--text-primary)]">
      <Sidebar onNewThread={handleNewThreadClick} />
      <div className="flex-1 flex flex-col bg-transparent min-w-0 min-h-0">
        <header className="border-b border-[var(--panel-border)] bg-[var(--panel-bg)] flex-shrink-0 shadow-sm">
          <div className="max-w-4xl mx-auto w-full px-8 py-6 flex items-center justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.5em] text-[var(--text-secondary)]">
                Research Agent
              </span>
              <h1 className="text-[2.15rem] font-semibold text-[var(--text-primary)] tracking-tight">
                AI Research Agent
              </h1>
              <p className="text-[15px] text-[var(--text-secondary)] leading-6">
                LangGraph 기반 심층 리서치를 돕는 정교한 워크스페이스
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-full px-1 py-1">
                {[
                  { label: "Light", value: "light" as const },
                  { label: "Dark", value: "dark" as const },
                  { label: "System", value: "system" as const },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setThemePreference(value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                      themePreference === value
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                    aria-pressed={themePreference === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsRightSidebarOpen((prev) => !prev)}
                aria-label="Toggle insights"
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sidebar-border)] shadow-sm transition-colors ${
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
        <main className="flex-1 min-h-0 bg-[var(--bg-root)] flex flex-col overflow-hidden">
          {assistantMessages.length > 0 ? (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto px-12 md:px-20 lg:px-28 xl:px-36 pt-10 pb-32">
                <ResearchReport data={reportData} />
              </div>
              <div className="flex-shrink-0 bg-[var(--bg-root)] px-6 md:px-12 lg:px-20 xl:px-28 pt-20 pb-24">
                <div className="max-w-2xl mx-auto w-full">
                  <ChatInput
                    onSend={handleSendMessage}
                    onDeepResearch={handleDeepResearch}
                    disabled={isStreaming || isLoading}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="mb-12 text-center px-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <h2 className="text-5xl font-semibold text-[var(--text-primary)] tracking-tight">
                    연구개발AI팀
                  </h2>
                  <span className="px-3 py-1 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                    챗봇
                  </span>
                </div>
              </div>
              <div className="w-full max-w-3xl px-4">
                <ChatInput
                  onSend={handleSendMessage}
                  onDeepResearch={handleDeepResearch}
                  disabled={isStreaming || isLoading}
                />
              </div>
            </div>
          )}
        </main>
      </div>
      {isRightSidebarOpen && (
        <div className="flex-shrink-0 border-l border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] w-[260px] transition-all duration-200">
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
