"use client";

import { useThreadStore } from "@/store/threadStore";
import { History, Info, Plus, Settings, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ThreadList from "./Sidebar/ThreadList";

interface SidebarProps {
  onNewThread?: () => void | Promise<void>;
}

type PanelView = "threads" | "settings" | "about" | null;

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

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelView>(null);
  const [hoveredPanel, setHoveredPanel] = useState<PanelView>(null);

  const handleNewThread = () => {
    if (onNewThread) {
      void onNewThread();
    } else {
      reset();
    }
    setActivePanel(null);
  };

  const handleThreadClick = (threadId: string) => {
    setSwitchToThreadId(threadId);
    setActivePanel(null);
  };

  const handleSaveSettings = () => {
    setApiUrl(localApiUrl);
    setAssistantId(localAssistantId);
    setApiKey(localApiKey || null);
    setShowApiSettings(false);
    setActivePanel(null);
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
    setActivePanel(null);
  };

  useEffect(() => {
     if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 1024px)");
    const applyState = (matches: boolean) => {
      setIsCollapsed(matches);
      if (!matches) {
        setActivePanel(null);
      }
    };

    applyState(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      applyState(event.matches);
    };

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }

    media.addListener(listener);
    return () => media.removeListener(listener);
  }, []);

  const renderSettingsPanel = () => (
    <div className="bg-[var(--panel-bg)] p-5 rounded-2xl space-y-4 border border-[var(--panel-border)]">
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1 font-semibold uppercase tracking-[0.2em]">
          API URL
        </label>
        <input
          type="text"
          value={localApiUrl}
          onChange={(e) => setLocalApiUrl(e.target.value)}
          className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          placeholder="http://127.0.0.1:2024"
        />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1 font-semibold uppercase tracking-[0.2em]">
          Assistant ID
        </label>
        <input
          type="text"
          value={localAssistantId}
          onChange={(e) => setLocalAssistantId(e.target.value)}
          className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          placeholder="Deep Researcher"
        />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1 font-semibold uppercase tracking-[0.2em]">
          API Key (선택사항)
        </label>
        <input
          type="password"
          value={localApiKey}
          onChange={(e) => setLocalApiKey(e.target.value)}
          className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          placeholder="로컬 서버는 필요 없음"
        />
      </div>
      <button
        onClick={handleSaveSettings}
        className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white px-4 py-2.5 rounded-[16px] transition-colors text-sm font-semibold"
      >
        저장
      </button>
    </div>
  );

  const renderAboutPanel = () => (
    <div className="bg-[var(--panel-bg)] p-5 rounded-2xl text-sm text-[var(--text-secondary)] border border-[var(--panel-border)] space-y-3">
      <div>
        <div className="font-semibold text-[var(--text-primary)] text-base">
          AI Research Agent
        </div>
        <div className="text-[var(--text-secondary)] text-xs uppercase tracking-[0.25em] mt-1">
          LangGraph Insights
        </div>
      </div>
      <div className="space-y-2 text-sm leading-6">
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
  );

  if (isCollapsed) {
    const displayPanel = activePanel || hoveredPanel;
    
    return (
      <div className="relative h-screen flex-shrink-0">
        <nav className="h-full w-[72px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col items-center py-5 gap-5 transition-all duration-200">
          <button
            onClick={toggleCollapse}
            className="w-10 h-10 rounded-xl border border-[var(--sidebar-border)] text-[var(--sidebar-icon-text)] bg-[var(--sidebar-icon-bg)] flex items-center justify-center hover:bg-[var(--sidebar-icon-hover)] transition-colors"
            title="펼치기"
          >
            +
          </button>
          <button
            onClick={handleNewThread}
            className="w-10 h-10 rounded-xl border border-[var(--sidebar-border)] text-[var(--sidebar-icon-text)] bg-[var(--sidebar-icon-bg)] flex items-center justify-center hover:bg-[var(--sidebar-icon-hover)] transition-colors"
            title="새 대화"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="relative group">
            <button
              onClick={() => setActivePanel(activePanel === "threads" ? null : "threads")}
              onMouseEnter={() => setHoveredPanel("threads")}
              className={`w-10 h-10 rounded-xl border border-[var(--sidebar-border)] flex items-center justify-center transition-colors ${
                activePanel === "threads"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "bg-[var(--sidebar-icon-bg)] text-[var(--sidebar-icon-text)] hover:text-[var(--sidebar-icon-text)] hover:bg-[var(--sidebar-icon-hover)]"
              }`}
              title="대화 기록"
            >
              <History className="w-4 h-4" />
            </button>
            {hoveredPanel === "threads" && !activePanel && (
              <div 
                className="fixed top-0 left-[72px] h-screen w-[240px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] shadow-[0_18px_60px_-35px_rgba(0,0,0,0.45)] z-50"
                onMouseEnter={() => setHoveredPanel("threads")}
                onMouseLeave={() => setHoveredPanel(null)}
              >
                <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--sidebar-border)] text-[var(--text-secondary)] text-xs uppercase tracking-[0.3em]">
                  <span>Threads</span>
                </div>
                <div className="h-[calc(100%-56px)] overflow-y-auto px-4 py-5 space-y-4">
                  <ThreadList
                    onSelectThread={handleThreadClick}
                    selectedThreadId={currentThreadId}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="relative group">
            <button
              onClick={() => setActivePanel(activePanel === "settings" ? null : "settings")}
              onMouseEnter={() => setHoveredPanel("settings")}
              className={`w-10 h-10 rounded-xl border border-[var(--sidebar-border)] flex items-center justify-center transition-colors ${
                activePanel === "settings"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "bg-[var(--sidebar-icon-bg)] text-[var(--sidebar-icon-text)] hover:text-[var(--sidebar-icon-text)] hover:bg-[var(--sidebar-icon-hover)]"
              }`}
              title="API 설정"
            >
              <Settings className="w-4 h-4" />
            </button>
            {hoveredPanel === "settings" && !activePanel && (
              <div 
                className="fixed top-0 left-[72px] h-screen w-[240px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] shadow-[0_18px_60px_-35px_rgba(0,0,0,0.45)] z-50"
                onMouseEnter={() => setHoveredPanel("settings")}
                onMouseLeave={() => setHoveredPanel(null)}
              >
                <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--sidebar-border)] text-[var(--text-secondary)] text-xs uppercase tracking-[0.3em]">
                  <span>Settings</span>
                </div>
                <div className="h-[calc(100%-56px)] overflow-y-auto px-4 py-5 space-y-4">
                  {renderSettingsPanel()}
                </div>
              </div>
            )}
          </div>
          <div className="relative group">
            <button
              onClick={() => setActivePanel(activePanel === "about" ? null : "about")}
              onMouseEnter={() => setHoveredPanel("about")}
              className={`w-10 h-10 rounded-xl border border-[var(--sidebar-border)] flex items-center justify-center transition-colors ${
                activePanel === "about"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "bg-[var(--sidebar-icon-bg)] text-[var(--sidebar-icon-text)] hover:text-[var(--sidebar-icon-text)] hover:bg-[var(--sidebar-icon-hover)]"
              }`}
              title="정보"
            >
              <Info className="w-4 h-4" />
            </button>
            {hoveredPanel === "about" && !activePanel && (
              <div 
                className="fixed top-0 left-[72px] h-screen w-[240px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] shadow-[0_18px_60px_-35px_rgba(0,0,0,0.45)] z-50"
                onMouseEnter={() => setHoveredPanel("about")}
                onMouseLeave={() => setHoveredPanel(null)}
              >
                <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--sidebar-border)] text-[var(--text-secondary)] text-xs uppercase tracking-[0.3em]">
                  <span>About</span>
                </div>
                <div className="h-[calc(100%-56px)] overflow-y-auto px-4 py-5 space-y-4">
                  {renderAboutPanel()}
                </div>
              </div>
            )}
          </div>
        </nav>

        {activePanel && (
          <div 
            className="absolute top-0 left-[72px] h-full w-[240px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] shadow-[0_18px_60px_-35px_rgba(0,0,0,0.45)] transition-transform duration-200 z-50"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--sidebar-border)] text-[var(--text-secondary)] text-xs uppercase tracking-[0.3em]">
              <span>
                {activePanel === "threads"
                  ? "Threads"
                  : activePanel === "settings"
                  ? "Settings"
                  : "About"}
              </span>
              <button
                onClick={() => setActivePanel(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--accent)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-[calc(100%-56px)] overflow-y-auto px-4 py-5 space-y-4">
              {activePanel === "threads" && (
                <ThreadList
                  onSelectThread={handleThreadClick}
                  selectedThreadId={currentThreadId}
                />
              )}
              {activePanel === "settings" && renderSettingsPanel()}
              {activePanel === "about" && renderAboutPanel()}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <aside
      className="flex flex-col h-screen overflow-hidden flex-shrink-0 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] transition-all duration-200"
      style={{ width: "240px" }}
    >
      <div className="px-4 pt-5 flex items-center justify-end">
        <button
          onClick={toggleCollapse}
          className="text-[var(--text-primary)] hover:text-[var(--accent)] border border-[var(--sidebar-border)] bg-[var(--sidebar-icon-bg)] rounded-lg px-2 py-1 text-sm transition-colors"
          title="접기"
        >
          -
        </button>
      </div>
      <div className="flex-1 overflow-hidden px-4 pt-[120px] pb-6">
        <div className="flex h-full flex-col">
          <div className="space-y-2 flex-shrink-0">
            <div className="text-[11px] text-[var(--text-secondary)] font-semibold uppercase tracking-[0.28em]">
              Threads
            </div>
            <div className="h-px bg-[var(--sidebar-border)]"></div>
          </div>
          <div className="mt-4 mb-4">
            <button
              onClick={handleNewThread}
              className="w-full flex items-center justify-center gap-2 bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 text-[var(--accent)] rounded-lg px-4 py-2.5 transition-colors duration-200 font-semibold text-sm border border-[var(--accent)]/30"
            >
              <Plus className="w-4 h-4" />
              New thread
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
            <ThreadList
              onSelectThread={handleThreadClick}
              selectedThreadId={currentThreadId}
            />
          </div>
          <div className="flex-shrink-0 pt-5 space-y-2">
            <div className="h-px bg-[var(--sidebar-border)]"></div>
            <button
              onClick={() => setShowApiSettings(!showApiSettings)}
              className="w-full flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--sidebar-icon-hover)] px-3.5 py-2.5 rounded-xl transition-colors text-sm border border-[var(--sidebar-border)]"
            >
              <div className="flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                API 설정
              </div>
            </button>
            {showApiSettings && renderSettingsPanel()}
            <button
              onClick={() => setShowAbout(!showAbout)}
              className="w-full flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--sidebar-icon-hover)] px-3.5 py-2.5 rounded-xl transition-colors text-sm border border-[var(--sidebar-border)]"
            >
              <div className="flex items-center">
                <Info className="w-4 h-4 mr-2" />
                About
              </div>
            </button>
            {showAbout && renderAboutPanel()}
          </div>
        </div>
      </div>
    </aside>
  );
}

