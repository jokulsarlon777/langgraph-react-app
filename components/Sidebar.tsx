"use client";

import { useThreadStore } from "@/store/threadStore";
import { History, Info, Plus, Settings, X, ChevronLeft, ChevronRight, Menu, Search, PanelLeftClose } from "lucide-react";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import ThreadList from "./Sidebar/ThreadList";
import ThreadListSkeleton from "./Sidebar/ThreadListSkeleton";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

interface SidebarProps {
  onNewThread?: () => void | Promise<void>;
  isLoadingThreads?: boolean;
}

type PanelView = "threads" | "settings" | "about" | null;

export default function Sidebar({ onNewThread, isLoadingThreads: externalIsLoading }: SidebarProps) {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const isLoadingThreads = externalIsLoading ?? false;
  const panelRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // 포커스 트랩 적용
  const focusTrapRef = useFocusTrap(activePanel !== null);

  // Escape 키로 패널 닫기
  useKeyboardNavigation({
    onEscape: () => {
      if (activePanel) {
        setActivePanel(null);
      }
    },
    enabled: activePanel !== null,
  });

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

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
    setActivePanel(null);
  }, []);

  // 사이드바 너비 조절 핸들러
  useEffect(() => {
    if (isCollapsed || !resizeHandleRef.current) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 400) {
        setSidebarWidth(newWidth);
        // 로컬 스토리지에 저장
        if (typeof window !== "undefined") {
          localStorage.setItem("sidebarWidth", newWidth.toString());
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    const resizeHandle = resizeHandleRef.current;
    resizeHandle.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      resizeHandle.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isCollapsed, isResizing]);

  // 로컬 스토리지에서 사이드바 너비 불러오기
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedWidth = localStorage.getItem("sidebarWidth");
      if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        if (width >= 200 && width <= 400) {
          setSidebarWidth(width);
        }
      }
    }
  }, []);

  const handlePanelToggle = useCallback((panel: PanelView) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }, []);

  const handleClosePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

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
        <label htmlFor="api-url-input" className="block text-xs text-[var(--text-secondary)] mb-1 font-semibold uppercase tracking-[0.2em]">
          API URL
        </label>
        <input
          id="api-url-input"
          type="text"
          value={localApiUrl}
          onChange={(e) => setLocalApiUrl(e.target.value)}
          className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          placeholder="http://127.0.0.1:2024"
          aria-label="API URL 입력"
        />
      </div>
      <div>
        <label htmlFor="assistant-id-input" className="block text-xs text-[var(--text-secondary)] mb-1 font-semibold uppercase tracking-[0.2em]">
          Assistant ID
        </label>
        <input
          id="assistant-id-input"
          type="text"
          value={localAssistantId}
          onChange={(e) => setLocalAssistantId(e.target.value)}
          className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          placeholder="Deep Researcher"
          aria-label="Assistant ID 입력"
        />
      </div>
      <div>
        <label htmlFor="api-key-input" className="block text-xs text-[var(--text-secondary)] mb-1 font-semibold uppercase tracking-[0.2em]">
          API Key (선택사항)
        </label>
        <input
          id="api-key-input"
          type="password"
          value={localApiKey}
          onChange={(e) => setLocalApiKey(e.target.value)}
          className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
          placeholder="로컬 서버는 필요 없음"
          aria-label="API Key 입력 (선택사항)"
        />
      </div>
      <button
        onClick={handleSaveSettings}
        className="w-full bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white px-4 py-2.5 rounded-[16px] transition-colors text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
        aria-label="설정 저장"
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
        <nav 
          ref={sidebarRef as React.RefObject<HTMLElement>}
          className="h-full w-[72px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col items-center py-5 gap-5 transition-all duration-200"
          role="navigation"
          aria-label="사이드바 네비게이션"
        >
          <button
            onClick={toggleCollapse}
            className="w-10 h-10 rounded-xl border border-transparent text-[var(--sidebar-icon-text)] bg-[var(--sidebar-icon-bg)] flex items-center justify-center hover:bg-[var(--sidebar-icon-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
            aria-label="사이드바 펼치기"
            title="펼치기"
          >
            <span className="text-base font-semibold leading-none" aria-hidden="true">&gt;&gt;</span>
          </button>
          <button
            onClick={handleNewThread}
            className="w-10 h-10 rounded-xl border border-[var(--sidebar-border)] text-[var(--sidebar-icon-text)] bg-[var(--sidebar-icon-bg)] flex items-center justify-center hover:bg-[var(--sidebar-icon-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
            aria-label="새 대화 시작"
            title="새 대화"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
          <div className="relative group">
            <button
              onClick={() => handlePanelToggle("threads")}
              onMouseEnter={() => setHoveredPanel("threads")}
              className={`w-10 h-10 rounded-xl border border-[var(--sidebar-border)] flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 ${
                activePanel === "threads"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "bg-[var(--sidebar-icon-bg)] text-[var(--sidebar-icon-text)] hover:text-[var(--sidebar-icon-text)] hover:bg-[var(--sidebar-icon-hover)]"
              }`}
              aria-label="대화 기록 보기"
              aria-expanded={activePanel === "threads"}
              aria-controls="threads-panel"
              title="대화 기록"
            >
              <History className="w-4 h-4" aria-hidden="true" />
            </button>
            {hoveredPanel === "threads" && !activePanel && (
              <div 
                className="fixed top-0 left-[72px] h-screen w-[240px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] shadow-[0_18px_60px_-35px_rgba(0,0,0,0.45)] z-50"
                onMouseEnter={() => setHoveredPanel("threads")}
                onMouseLeave={() => setHoveredPanel(null)}
                role="dialog"
                aria-label="대화 기록 패널"
              >
                <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--sidebar-border)] text-[var(--text-secondary)] text-xs uppercase tracking-[0.3em]">
                  <span>Threads</span>
                </div>
                <div className="h-[calc(100%-56px)] overflow-y-auto px-4 py-5 space-y-4">
                  {isLoadingThreads ? (
                    <ThreadListSkeleton />
                  ) : (
                    <ThreadList
                      onSelectThread={handleThreadClick}
                      selectedThreadId={currentThreadId}
                      searchQuery={searchQuery}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="relative group">
            <button
              onClick={() => handlePanelToggle("settings")}
              onMouseEnter={() => setHoveredPanel("settings")}
              className={`w-10 h-10 rounded-xl border border-[var(--sidebar-border)] flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 ${
                activePanel === "settings"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "bg-[var(--sidebar-icon-bg)] text-[var(--sidebar-icon-text)] hover:text-[var(--sidebar-icon-text)] hover:bg-[var(--sidebar-icon-hover)]"
              }`}
              aria-label="API 설정 보기"
              aria-expanded={activePanel === "settings"}
              aria-controls="settings-panel"
              title="API 설정"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
            {hoveredPanel === "settings" && !activePanel && (
              <div 
                className="fixed top-0 left-[72px] h-screen w-[240px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] shadow-[0_18px_60px_-35px_rgba(0,0,0,0.45)] z-50"
                onMouseEnter={() => setHoveredPanel("settings")}
                onMouseLeave={() => setHoveredPanel(null)}
                role="dialog"
                aria-label="API 설정 패널"
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
              onClick={() => handlePanelToggle("about")}
              onMouseEnter={() => setHoveredPanel("about")}
              className={`w-10 h-10 rounded-xl border border-[var(--sidebar-border)] flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 ${
                activePanel === "about"
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "bg-[var(--sidebar-icon-bg)] text-[var(--sidebar-icon-text)] hover:text-[var(--sidebar-icon-text)] hover:bg-[var(--sidebar-icon-hover)]"
              }`}
              aria-label="정보 보기"
              aria-expanded={activePanel === "about"}
              aria-controls="about-panel"
              title="정보"
            >
              <Info className="w-4 h-4" aria-hidden="true" />
            </button>
            {hoveredPanel === "about" && !activePanel && (
              <div 
                className="fixed top-0 left-[72px] h-screen w-[240px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] shadow-[0_18px_60px_-35px_rgba(0,0,0,0.45)] z-50"
                onMouseEnter={() => setHoveredPanel("about")}
                onMouseLeave={() => setHoveredPanel(null)}
                role="dialog"
                aria-label="정보 패널"
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
            ref={focusTrapRef}
            className="absolute top-0 left-[72px] h-full w-[240px] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] shadow-[0_18px_60px_-35px_rgba(0,0,0,0.45)] transition-transform duration-200 z-50"
            role="dialog"
            aria-modal="true"
            aria-label={
              activePanel === "threads"
                ? "대화 기록 패널"
                : activePanel === "settings"
                ? "API 설정 패널"
                : "정보 패널"
            }
            id={`${activePanel}-panel`}
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
                onClick={handleClosePanel}
                className="text-[var(--text-secondary)] hover:text-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded p-1 transition-colors"
                aria-label="패널 닫기"
                title="닫기 (Escape)"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="h-[calc(100%-56px)] overflow-y-auto px-4 py-5 space-y-4">
              {activePanel === "threads" && (
                <>
                  <div className="mb-4">
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Thread 검색..."
                        className="flex-1 bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--sidebar-border)] rounded-l-lg rounded-r-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 placeholder-[var(--text-secondary)]"
                        aria-label="Thread 검색"
                      />
                      <div
                        className="flex-shrink-0 h-[17px] w-[17px] flex items-center justify-center bg-[var(--bg-surface)] border border-l-0 border-[var(--sidebar-border)] rounded-r-lg pointer-events-none"
                      >
                        <Search className="w-3.5 h-3.5 text-[var(--text-secondary)]" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                  {isLoadingThreads ? (
                    <ThreadListSkeleton />
                  ) : (
                    <ThreadList
                      onSelectThread={handleThreadClick}
                      selectedThreadId={currentThreadId}
                      searchQuery={searchQuery}
                    />
                  )}
                </>
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
    <div className="relative flex-shrink-0" style={{ width: `${sidebarWidth}px` }}>
      <aside
        ref={sidebarRef as React.RefObject<HTMLElement>}
        className="flex flex-col h-screen overflow-hidden bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] transition-all duration-200"
        style={{ width: `${sidebarWidth}px` }}
        role="complementary"
        aria-label="사이드바"
      >
      <div className="px-4 pt-5 flex items-center justify-end">
        <button
          onClick={toggleCollapse}
          className="w-10 h-10 rounded-xl border border-transparent text-[var(--text-primary)] bg-transparent flex items-center justify-center hover:bg-[var(--sidebar-icon-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
          aria-label="사이드바 접기"
          title="접기"
        >
          <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
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
              className="w-full flex items-center justify-center gap-2 bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 text-[var(--accent)] rounded-lg px-4 py-2.5 transition-colors duration-200 font-semibold text-sm border border-[var(--accent)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
              aria-label="새 대화 시작"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              New thread
            </button>
          </div>
          <div className="mb-4">
            <div className="flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Thread 검색..."
                className="flex-1 bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--sidebar-border)] rounded-l-lg rounded-r-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 placeholder-[var(--text-secondary)]"
                aria-label="Thread 검색"
              />
              <div
                className="flex-shrink-0 h-[17px] w-[17px] flex items-center justify-center bg-[var(--bg-surface)] border border-l-0 border-[var(--sidebar-border)] rounded-r-lg pointer-events-none"
              >
                <Search className="w-3.5 h-3.5 text-[var(--text-secondary)]" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
            {isLoadingThreads ? (
              <ThreadListSkeleton />
            ) : (
              <ThreadList
                onSelectThread={handleThreadClick}
                selectedThreadId={currentThreadId}
                searchQuery={searchQuery}
              />
            )}
          </div>
          <div className="flex-shrink-0 pt-5 space-y-2">
            <div className="h-px bg-[var(--sidebar-border)]"></div>
            <button
              onClick={() => setShowApiSettings(!showApiSettings)}
              className="w-full flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--sidebar-icon-hover)] px-3.5 py-2.5 rounded-xl transition-colors text-sm border border-[var(--sidebar-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
              aria-label="API 설정"
              aria-expanded={showApiSettings}
              aria-controls="api-settings-panel"
            >
              <div className="flex items-center">
                <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
                API 설정
              </div>
            </button>
            {showApiSettings && (
              <div id="api-settings-panel" role="region" aria-label="API 설정 패널">
                {renderSettingsPanel()}
              </div>
            )}
            <button
              onClick={() => setShowAbout(!showAbout)}
              className="w-full flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--sidebar-icon-hover)] px-3.5 py-2.5 rounded-xl transition-colors text-sm border border-[var(--sidebar-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
              aria-label="정보"
              aria-expanded={showAbout}
              aria-controls="about-panel-expanded"
            >
              <div className="flex items-center">
                <Info className="w-4 h-4 mr-2" aria-hidden="true" />
                About
              </div>
            </button>
            {showAbout && (
              <div id="about-panel-expanded" role="region" aria-label="정보 패널">
                {renderAboutPanel()}
              </div>
            )}
          </div>
        </div>
      </div>
      </aside>
      {/* 사이드바 너비 조절 핸들 */}
      <div
        ref={resizeHandleRef}
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[var(--accent)]/50 transition-colors z-10 ${
          isResizing ? "bg-[var(--accent)]" : "bg-transparent"
        }`}
        aria-label="사이드바 너비 조절"
        role="separator"
        aria-orientation="vertical"
      />
    </div>
  );
}

