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
       className="flex flex-col h-screen overflow-hidden flex-shrink-0 bg-[var(--bg-surface)] border-r border-[#dcdce2]"
     >
      <div className="px-5 py-6 border-b border-[#e2e2e8] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs uppercase tracking-[0.45em] text-[#8d8d96]">
              Threads
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Workspace</h2>
          </div>
          <div className="w-10 h-10 rounded-full border border-[#dfe0e6] flex items-center justify-center text-sm text-[#7a7a83]">
            ✦
          </div>
        </div>
        <button
          onClick={handleNewThread}
          className="w-full flex items-center justify-center gap-3 bg-[#f0f0f3] hover:bg-[#e4e4e9] text-[var(--text-primary)] rounded-[20px] px-6 py-3 transition-colors duration-200 font-semibold text-sm shadow-md border border-[#d4d4da]"
        >
          <Plus className="w-4 h-4" />
          New thread
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-3 bg-[var(--bg-root)]">
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
                  className={`w-full text-left px-4 py-3.5 rounded-[20px] transition-all text-sm border ${
                    isCurrent
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] border-transparent shadow-sm"
                      : "bg-transparent text-[var(--text-secondary)] hover:bg-[#ececef] border-[#dfe0e6]"
                  }`}
                  title={`${timeStr} | ${threadData.message_count}개 메시지`}
                >
                  <div className="truncate text-sm font-semibold tracking-wide text-[var(--text-primary)] leading-6">
                    {threadData.title}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#7c82a4] uppercase tracking-[0.2em]">
                    <span>{timeStr}</span>
                    <span className="w-1 h-1 rounded-full bg-[#c2c7e5]"></span>
                    <span>{threadData.message_count} msgs</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-[#5a5a63] p-4 bg-[#efeff2] border border-[#dedee3] rounded-[18px]">
            대화 내역이 없습니다.
            <br />
            &apos;+ New thread&apos; 버튼을 클릭하여 새 대화를 시작하세요!
          </div>
        )}
      </div>

      <div className="px-5 py-5 border-t border-[#e2e2e8] bg-[var(--bg-surface)] space-y-2">
        <button
          onClick={() => setShowApiSettings(!showApiSettings)}
          className="w-full flex items-center justify-between text-[var(--text-primary)] hover:bg-[#f5f5f7] px-3.5 py-2.5 rounded-[18px] transition-colors text-sm border border-[#dfe0e6] bg-white"
        >
          <div className="flex items-center">
            <Settings className="w-4 h-4 mr-2 text-[var(--accent)]" />
            API 설정
          </div>
        </button>

        {showApiSettings && (
          <div className="bg-white p-5 rounded-[22px] space-y-4 border border-[#dedee3] shadow-sm">
            <div>
              <label className="block text-xs text-[#6f6f78] mb-1 font-semibold uppercase tracking-[0.35em]">
                API URL
              </label>
              <input
                type="text"
                value={localApiUrl}
                onChange={(e) => setLocalApiUrl(e.target.value)}
                className="w-full bg-[#f5f5f7] text-[var(--text-primary)] border border-[#d7d7dc] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/35"
                placeholder="http://127.0.0.1:2024"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6f6f78] mb-1 font-semibold uppercase tracking-[0.35em]">
                Assistant ID
              </label>
              <input
                type="text"
                value={localAssistantId}
                onChange={(e) => setLocalAssistantId(e.target.value)}
                className="w-full bg-[#f5f5f7] text-[var(--text-primary)] border border-[#d7d7dc] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/35"
                placeholder="Deep Researcher"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6f6f78] mb-1 font-semibold uppercase tracking-[0.35em]">
                API Key (선택사항)
              </label>
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                className="w-full bg-[#f5f5f7] text-[var(--text-primary)] border border-[#d7d7dc] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/35"
                placeholder="로컬 서버는 필요 없음"
              />
            </div>
            <button
              onClick={handleSaveSettings}
              className="w-full bg-[var(--accent)]/90 hover:bg-[var(--accent)] text-white px-4 py-2.5 rounded-[18px] transition-all text-sm font-semibold shadow-md"
            >
              저장
            </button>
          </div>
        )}

        <button
          onClick={() => setShowAbout(!showAbout)}
          className="w-full flex items-center justify-between text-[var(--text-primary)] hover:bg-[#f5f5f7] px-3.5 py-2.5 rounded-[18px] transition-colors text-sm border border-[#dfe0e6] bg-white"
        >
          <div className="flex items-center">
            <Info className="w-4 h-4 mr-2 text-[var(--accent)]" />
            About
          </div>
        </button>

        {showAbout && (
          <div className="bg-white p-5 rounded-[22px] text-sm text-[var(--text-secondary)] border border-[#dfe0e6] space-y-3 shadow-sm">
            <div>
              <div className="font-semibold text-[var(--text-primary)] text-lg">AI Research Agent</div>
              <div className="text-[#70707a] text-xs uppercase tracking-[0.35em] mt-2">
                LangGraph Insights
              </div>
            </div>
            <div className="space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
              <div>
                <span className="text-[var(--text-primary)] font-semibold">주요 기능</span>
                <ul className="list-disc list-inside ml-3 mt-1 space-y-1">
                  <li>Thread 기반 역사 관리</li>
                  <li>실시간 처리 로그 스트림</li>
                  <li>PDF·DOCX 리포트 생성</li>
                </ul>
              </div>
              <div>
                <span className="text-[var(--text-primary)] font-semibold">사용 방법</span>
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
    </aside>
  );
}

