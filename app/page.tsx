"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
import toast from "react-hot-toast";
import { classifyError, getErrorMessage, isRetryable, ErrorType } from "@/lib/errorHandler";

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
  const [lastFailedMessage, setLastFailedMessage] = useState<{ message: string; threadId: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [themePreference, setThemePreference] = useState<"light" | "dark" | "system">("system");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [shouldAutoFocus, setShouldAutoFocus] = useState(false);

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

  // 클라이언트 사이드에서만 테마 설정 로드
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("preferred-theme");
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemePreference(stored);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      applyThemePreference(themePreference);
    }
  }, [themePreference, applyThemePreference, mounted]);

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
        toast.error(`스레드 목록을 불러오는데 실패했습니다: ${getErrorMessage(error)}`, {
          duration: 5000,
        });
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
        toast.success("새 대화가 생성되었습니다.", { duration: 2000 });
      } catch (error) {
        console.error("Failed to create new thread:", error);
        toast.error(`새 대화 생성 실패: ${getErrorMessage(error)}`, {
          duration: 5000,
        });
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
        toast.success("대화를 불러왔습니다.", { duration: 2000 });
      } catch (error) {
        console.error("Thread switch error:", error);
        toast.error(`대화 불러오기 실패: ${getErrorMessage(error)}`, {
          duration: 5000,
        });
        setIsLoading(false);
      }
    };

    switchThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, switchToThreadId]);

  const handleSendMessage = async (message: string, isRetry = false) => {
    if (!client || !threadId) {
      toast.error("클라이언트가 준비되지 않았습니다.");
      return;
    }

    setShouldAutoFocus(false); // 메시지 전송 후 자동 포커스 비활성화
    const timestamp = new Date().toISOString();
    
    // 재시도가 아닌 경우에만 사용자 메시지 추가
    if (!isRetry) {
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
    }

    setIsStreaming(true);
    setProcessLogs([]);
    setLastFailedMessage(null);

    // 로딩 토스트 표시
    const loadingToast = toast.loading("메시지를 전송하는 중...");

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
        toast.dismiss(loadingToast);
        toast.success("응답을 받았습니다.", { duration: 2000 });
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
          toast.dismiss(loadingToast);
          toast.success("응답을 복구했습니다.", { duration: 2000 });
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
      
      // 로딩 토스트 제거
      toast.dismiss(loadingToast);

      const appError = classifyError(error);
      const errorMessage = getErrorMessage(error);
      const canRetry = isRetryable(error);

      // 에러 타입에 따른 토스트 메시지
      if (appError.type === ErrorType.NETWORK) {
        toast.error(errorMessage, {
          duration: 5000,
          icon: "📡",
        });
      } else if (appError.type === ErrorType.TIMEOUT) {
        toast.error(errorMessage, {
          duration: 5000,
          icon: "⏱️",
        });
      } else if (appError.type === ErrorType.API_ERROR) {
        toast.error(errorMessage, {
          duration: 5000,
          icon: "⚠️",
        });
      } else {
        toast.error(errorMessage, {
          duration: 5000,
        });
      }

      // 재시도 가능한 경우 재시도 버튼 제공
      if (canRetry && !isRetry) {
        setLastFailedMessage({ message, threadId });
        toast.error(
          (t) => (
            <div className="flex flex-col gap-2">
              <span>{errorMessage}</span>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  setLastFailedMessage(null);
                  void handleSendMessage(message, true);
                }}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
              >
                다시 시도
              </button>
            </div>
          ),
          {
            duration: 10000,
            icon: "🔄",
          }
        );
      }

      // Fallback: 최종 응답 가져오기 시도
      try {
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
          toast.success("응답을 복구했습니다.");
          return;
        }
      } catch (fallbackError) {
        console.error("Fallback failed:", fallbackError);
      }

      // Fallback도 실패한 경우
      const fallbackTimestamp = new Date().toISOString();
      updateLastAssistantMessage("응답을 불러오지 못했습니다. 다시 시도해주세요.");
      setActivityEvents((prev) => {
        const prevEvents = prev[threadId] ?? [];
        return {
          ...prev,
          [threadId]: [
            ...prevEvents,
            {
              type: "assistant",
              content: "응답을 불러오지 못했습니다. 다시 시도해주세요.",
              timestamp: fallbackTimestamp,
            },
          ],
        };
      });
    } finally {
      setIsStreaming(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleNewThreadClick = async () => {
    if (!client) {
      toast.error("클라이언트가 준비되지 않았습니다.");
      return;
    }

    setProcessLogs([]);
    reset();
    setShouldAutoFocus(true); // 새 스레드 생성 시 자동 포커스

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

  // 메모이제이션을 통한 불필요한 재계산 방지
  const assistantMessages = useMemo(
    () => messages.filter((msg) => msg.role === "assistant"),
    [messages]
  );

  const latestAssistantMessage = useMemo(
    () => assistantMessages.at(-1) || null,
    [assistantMessages]
  );

  const allReferenceUrls = useMemo(
    () =>
      Array.from(
        new Set(
          assistantMessages.flatMap((msg) =>
            extractUrlsFromText(msg.content || "")
          )
        )
      ),
    [assistantMessages]
  );

  const referenceLinks = useMemo(
    () => allReferenceUrls.map((url) => ({ url })),
    [allReferenceUrls]
  );

  const activityFeed = useMemo(
    () =>
      messages.map((message) => ({
        type: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
      })),
    [messages]
  );

  const currentActivityEvents = useMemo(
    () => (threadId ? activityEvents[threadId] ?? activityFeed : []),
    [threadId, activityEvents, activityFeed]
  );

  const reportSections = useMemo(
    () => buildSections(messages, threadId),
    [messages, threadId]
  );

  const reportSources: ReportSource[] = useMemo(
    () => buildSources(allReferenceUrls),
    [allReferenceUrls]
  );

  const reportOverview = useMemo(
    () =>
      latestAssistantMessage?.content ||
      (reportSections[0]?.content ?? "아직 생성된 리포트가 없습니다."),
    [latestAssistantMessage, reportSections]
  );

  const reportDuration = useMemo(
    () => computeDurationSeconds(currentActivityEvents),
    [currentActivityEvents]
  );

  const reportStatus: "loading" | "completed" | "error" = useMemo(
    () =>
      isStreaming || isLoading
        ? "loading"
        : assistantMessages.length > 0
        ? "completed"
        : "loading",
    [isStreaming, isLoading, assistantMessages.length]
  );

  const reportTitle = useMemo(
    () => threads[threadId || ""]?.title || "AI Research Agent",
    [threads, threadId]
  );

  const reportSubtitle = useMemo(
    () =>
      messages.find((msg) => msg.role === "user")?.content?.split("\n")[0]?.slice(0, 80) ||
      "심층 분석 리포트",
    [messages]
  );

  const reportData = useMemo(
    () => ({
      title: reportTitle,
      subtitle: reportSubtitle,
      status: reportStatus,
      duration: reportDuration,
      overview: reportOverview,
      sections: reportSections,
      sources: reportSources,
    }),
    [
      reportTitle,
      reportSubtitle,
      reportStatus,
      reportDuration,
      reportOverview,
      reportSections,
      reportSources,
    ]
  );

  // 스크롤 위치 관리: 새 메시지 추가 시 자동 스크롤
  useEffect(() => {
    if (!scrollContainerRef.current || !shouldAutoScrollRef.current) return;

    const container = scrollContainerRef.current;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    // 사용자가 스크롤을 위로 올렸다면 자동 스크롤 비활성화
    if (!isNearBottom && !isStreaming) {
      shouldAutoScrollRef.current = false;
      return;
    }

    // 스트리밍 중이거나 새 메시지가 추가되었을 때 자동 스크롤
    if (isStreaming || isNearBottom) {
      const timeoutId = setTimeout(() => {
        if (scrollContainerRef.current && shouldAutoScrollRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: isStreaming ? "smooth" : "auto",
          });
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [reportSections.length, isStreaming, assistantMessages.length]);

  // 스크롤 이벤트 리스너: 사용자가 스크롤할 때 자동 스크롤 상태 업데이트
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      shouldAutoScrollRef.current = isNearBottom;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // 스트리밍 시작 시 자동 스크롤 활성화
  useEffect(() => {
    if (isStreaming) {
      shouldAutoScrollRef.current = true;
    }
  }, [isStreaming]);

  const handleDeepResearch = useCallback(
    (message: string) => {
      if (!message.trim()) return;
      const enriched = `[Deep Research] ${message.trim()}`;
      void handleSendMessage(enriched);
    },
    [handleSendMessage]
  );

  return (
    <div className="h-screen overflow-hidden flex bg-[var(--bg-root)] text-[var(--text-primary)]">
      <Sidebar onNewThread={handleNewThreadClick} isLoadingThreads={isLoading && !serverThreadsLoaded} />
      <div className="flex-1 flex flex-col bg-transparent min-w-0 min-h-0">
        <header className="border-b border-[var(--panel-border)] bg-[var(--panel-bg)] flex-shrink-0 shadow-sm backdrop-blur-xl bg-opacity-95">
          <div className="max-w-4xl mx-auto w-full px-8 py-6 flex items-center justify-between gap-4">
            <div className="space-y-2 fade-in">
              <span className="text-xs uppercase tracking-[0.5em] text-[var(--text-secondary)] font-medium">
                Research Agent
              </span>
              <h1 className="text-[2.15rem] font-semibold text-[var(--text-primary)] tracking-tight gradient-text">
                AI Research Agent
              </h1>
              <p className="text-[15px] text-[var(--text-secondary)] leading-6 font-light">
                LangGraph 기반 심층 리서치를 돕는 정교한 워크스페이스
              </p>
            </div>
            <div className="flex items-center gap-3">
              {mounted && (
                <div className="flex items-center bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-full px-1 py-1 shadow-sm backdrop-blur-sm">
                  {[
                    { label: "Light", value: "light" as const },
                    { label: "Dark", value: "dark" as const },
                    { label: "System", value: "system" as const },
                  ].map(({ label, value }) => {
                    const isActive = themePreference === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setThemePreference(value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                          isActive
                            ? "bg-gradient-to-r from-[var(--accent-soft)] to-[var(--accent-soft)] text-[var(--accent)] shadow-md scale-105"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                        }`}
                        aria-pressed={isActive ? "true" : "false"}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => setIsRightSidebarOpen((prev) => !prev)}
                aria-label={isRightSidebarOpen ? "인사이트 패널 닫기" : "인사이트 패널 열기"}
                aria-expanded={isRightSidebarOpen}
                aria-controls="right-sidebar"
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-[var(--sidebar-border)] shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 ${
                  isRightSidebarOpen
                    ? "bg-gradient-to-br from-[var(--accent-soft)] to-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30"
                    : "bg-[var(--panel-bg)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                }`}
              >
                <span className="text-lg font-light transition-transform duration-200" aria-hidden="true">{isRightSidebarOpen ? "−" : "+"}</span>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 min-h-0 bg-[var(--bg-root)] flex flex-col overflow-hidden">
          {assistantMessages.length > 0 ? (
            <>
              <div
                ref={scrollContainerRef}
                className="flex-1 min-h-0 overflow-y-auto px-12 md:px-20 lg:px-28 xl:px-36 pt-10 pb-32"
              >
                <ResearchReport data={reportData} isStreaming={isStreaming} />
              </div>
              <div className="flex-shrink-0 bg-[var(--bg-root)] px-6 md:px-12 lg:px-20 xl:px-28 pt-20 pb-24">
                <div className="max-w-2xl mx-auto w-full">
                  <ChatInput
                    onSend={handleSendMessage}
                    onDeepResearch={handleDeepResearch}
                    disabled={isStreaming || isLoading}
                    autoFocus={shouldAutoFocus}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center fade-in">
              <div className="mb-12 text-center px-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <h2 className="text-5xl font-semibold text-[var(--text-primary)] tracking-tight gradient-text">
                    연구개발AI팀
                  </h2>
                  <span className="px-4 py-1.5 rounded-full border border-[var(--accent)]/40 bg-gradient-to-r from-[var(--accent-soft)] to-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)] uppercase tracking-wider shadow-md backdrop-blur-sm">
                    챗봇
                  </span>
                </div>
              </div>
              <div className="w-full max-w-3xl px-4">
                <ChatInput
                  onSend={handleSendMessage}
                  onDeepResearch={handleDeepResearch}
                  disabled={isStreaming || isLoading}
                  autoFocus={true}
                />
              </div>
            </div>
          )}
        </main>
      </div>
      {isRightSidebarOpen && (
        <div 
          id="right-sidebar"
          className="flex-shrink-0 border-l border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] w-[260px] transition-all duration-200"
          role="complementary"
          aria-label="인사이트 사이드바"
        >
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
