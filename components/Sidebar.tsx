"use client";

import { useThreadStore } from "@/store/threadStore";
import { format } from "date-fns";
import { Settings, Info, Plus } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  onNewThread?: () => void | Promise<void>;
}

export default function Sidebar({ onNewThread }: SidebarProps) {
  const {
    threads,
    currentThreadId,
    setSwitchToThreadId,
    reset,
    apiUrl,
    assistantId,
    apiKey,
    setApiUrl,
    setAssistantId,
    setApiKey,
  } = useThreadStore();

  const [showApiSettings, setShowApiSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [localAssistantId, setLocalAssistantId] = useState(assistantId);
  const [localApiKey, setLocalApiKey] = useState(apiKey || "");

  const sortedThreads = Object.entries(threads).sort(
    (a, b) =>
      new Date(b[1].created_at).getTime() -
      new Date(a[1].created_at).getTime()
  );

  const handleNewThread = () => {
    if (onNewThread) {
      void onNewThread();
    } else {
      reset();
    }
  };

  const handleThreadClick = (threadId: string) => {
    setSwitchToThreadId(threadId);
  };

  const handleSaveSettings = () => {
    setApiUrl(localApiUrl);
    setAssistantId(localAssistantId);
    setApiKey(localApiKey || null);
    setShowApiSettings(false);
  };

  return (
    <aside
      className="flex flex-col h-screen overflow-hidden flex-shrink-0 bg-black border-r border-white/15"
      style={{ width: "240px" }}
    >
      <div className="px-4 py-5 border-b border-white/10">
        <button
          onClick={handleNewThread}
          className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white rounded-lg px-4 py-2.5 transition-colors duration-200 font-semibold text-sm border border-white/20"
        >
          <Plus className="w-4 h-4" />
          New thread
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <div className="space-y-2">
          <div className="text-[11px] text-white font-semibold uppercase tracking-[0.28em]">Threads</div>
          <div className="h-px bg-white/20"></div>
        </div>

        {sortedThreads.length > 0 ? (
          <div className="space-y-1.5">
            {sortedThreads.map(([threadId, threadData]) => {
              const isCurrent = threadId === currentThreadId;
              const timeStr = format(
                new Date(threadData.created_at),
                "MM/dd HH:mm"
              );

              return (
                <button
                  key={threadId}
                  onClick={() => handleThreadClick(threadId)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl transition-all text-sm border ${
                    isCurrent
                      ? "bg-white/12 text-white border-white/25"
                      : "bg-black text-white/80 hover:bg-white/10 border-white/15"
                  }`}
                  title={`${timeStr} | ${threadData.message_count}개 메시지`}
                >
                  <div className="truncate text-sm font-semibold tracking-wide text-white leading-6">
                    {threadData.title}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/70 uppercase tracking-[0.2em]">
                    <span>{timeStr}</span>
                    <span className="w-1 h-1 rounded-full bg-white/50"></span>
                    <span>{threadData.message_count} msgs</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-white/80 p-4 bg-white/5 border border-white/15 rounded-xl">
            대화 내역이 없습니다.
            <br />
            &apos;+ New thread&apos; 버튼을 클릭하여 새 대화를 시작하세요!
          </div>
        )}

        <div className="h-px bg-white/20"></div>

        <div className="space-y-1">
          <button
            onClick={() => setShowApiSettings(!showApiSettings)}
            className="w-full flex items-center justify-between text-white hover:bg-white/10 px-3.5 py-2.5 rounded-xl transition-colors text-sm border border-white/12"
          >
            <div className="flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              API 설정
            </div>
          </button>

          {showApiSettings && (
            <div className="bg-[#0a0a0a] p-5 rounded-2xl space-y-4 border border-white/15">
              <div>
                <label className="block text-xs text-white/80 mb-1 font-semibold uppercase tracking-[0.2em]">
                  API URL
                </label>
                <input
                  type="text"
                  value={localApiUrl}
                  onChange={(e) => setLocalApiUrl(e.target.value)}
                  className="w-full bg-black text-white border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/60"
                  placeholder="http://127.0.0.1:2024"
                />
              </div>
              <div>
                <label className="block text-xs text-white/80 mb-1 font-semibold uppercase tracking-[0.2em]">
                  Assistant ID
                </label>
                <input
                  type="text"
                  value={localAssistantId}
                  onChange={(e) => setLocalAssistantId(e.target.value)}
                  className="w-full bg-black text-white border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/60"
                  placeholder="Deep Researcher"
                />
              </div>
              <div>
                <label className="block text-xs text-white/80 mb-1 font-semibold uppercase tracking-[0.2em]">
                  API Key (선택사항)
                </label>
                <input
                  type="password"
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  className="w-full bg-black text-white border border-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/60"
                  placeholder="로컬 서버는 필요 없음"
                />
              </div>
              <button
                onClick={handleSaveSettings}
                className="w-full bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 rounded-xl transition-all text-sm font-semibold border border-white/25"
              >
                저장
              </button>
            </div>
          )}

          <button
            onClick={() => setShowAbout(!showAbout)}
            className="w-full flex items-center justify-between text-white hover:bg-white/10 px-3.5 py-2.5 rounded-xl transition-colors text-sm border border-white/12"
          >
            <div className="flex items-center">
              <Info className="w-4 h-4 mr-2" />
              About
            </div>
          </button>

          {showAbout && (
            <div className="bg-[#0a0a0a] p-5 rounded-2xl text-sm text-white border border-white/15 space-y-3">
              <div>
                <div className="font-semibold text-white text-base">AI Research Agent</div>
                <div className="text-white/70 text-xs uppercase tracking-[0.25em] mt-1">
                  LangGraph Insights
                </div>
              </div>
              <div className="space-y-2 text-sm leading-6 text-white/90">
                <div>
                  <span className="text-white font-semibold">주요 기능</span>
                  <ul className="list-disc list-inside ml-3 mt-1 space-y-1">
                    <li>Thread 기반 역사 관리</li>
                    <li>실시간 처리 로그 스트림</li>
                    <li>PDF·DOCX 리포트 생성</li>
                  </ul>
                </div>
                <div>
                  <span className="text-white font-semibold">사용 방법</span>
                  <ol className="list-decimal list-inside ml-3 mt-1 space-y-1">
                    <li>New thread로 새로운 대화 시작</li>
                    <li>리스트에서 Thread 선택 후 이어서 대화</li>
                    <li>메시지를 입력하고 Enter 또는 버튼으로 전송</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

