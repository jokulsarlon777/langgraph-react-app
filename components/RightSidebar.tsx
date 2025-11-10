"use client";

import { useMemo, useState } from "react";
import { Link, ListTree, History } from "lucide-react";

interface ReferenceItem {
  url: string;
}

interface ActivityItem {
  type: "user" | "assistant" | "log";
  content: string;
  timestamp: string;
}

interface RightSidebarProps {
  references: ReferenceItem[];
  activity: ActivityItem[];
  processLogs: string[];
}

export default function RightSidebar({
  references,
  activity,
  processLogs,
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<"sources" | "activity">("sources");

  const formattedReferences = useMemo(() => {
    return references.map((item) => {
      try {
        const url = new URL(item.url);
        return {
          url: item.url,
          hostname: url.hostname.replace(/^www\./, ""),
          display: item.url,
        };
      } catch (error) {
        return {
          url: item.url,
          hostname: "",
          display: item.url,
        };
      }
    });
  }, [references]);

  const activityItems = useMemo(() => {
    return activity.map((item, index) => {
      const icon =
        item.type === "user" ? "🙋" : item.type === "assistant" ? "🤖" : "🛠️";
      const label =
        item.type === "user"
          ? "User"
          : item.type === "assistant"
          ? "AI"
          : "Tool";
      return {
        ...item,
        id: `${item.type}-${index}-${item.timestamp}`,
        icon,
        label,
        preview:
          item.content.length > 120
            ? `${item.content.slice(0, 120)}...`
            : item.content,
      };
    });
  }, [activity]);

  return (
    <aside className="flex flex-col h-screen bg-white border-l border-[#dcdce2]">
      <div className="px-5 py-6 border-b border-[#e2e2e8] bg-[var(--bg-surface)]">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-[0.5em] text-[#888892]">Insights</div>
          <h2 className="text-[1.15rem] font-semibold text-[var(--text-primary)]">
            Reference & Activity
          </h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 bg-white p-1 rounded-[18px] border border-[#e0e4f6]">
          <button
            onClick={() => setActiveTab("sources")}
            className={`flex items-center justify-center gap-2 py-2 px-5 text-sm font-medium rounded-[14px] transition-all ${
              activeTab === "sources"
                ? "bg-[#f0f0f3] text-[var(--text-primary)] shadow-sm border border-[#d4d4da]"
                : "text-[#5c5c66] hover:bg-[#f5f5f7]"
            }`}
          >
            <Link className="w-4 h-4" />
            Sources
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center justify-center gap-2 py-2 px-5 text-sm font-medium rounded-[14px] transition-all ${
              activeTab === "activity"
                ? "bg-[#f0f0f3] text-[var(--text-primary)] shadow-sm border border-[#d4d4da]"
                : "text-[#5c5c66] hover:bg-[#f5f5f7]"
            }`}
          >
            <History className="w-4 h-4" />
            Activity
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 bg-[var(--bg-root)]">
        {activeTab === "sources" ? (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#616168] uppercase tracking-[0.35em]">
              <ListTree className="w-4 h-4" />
              SOURCES ({formattedReferences.length})
            </div>
            {formattedReferences.length > 0 ? (
              <div className="space-y-3">
                {formattedReferences.map((ref) => (
                  <a
                    key={ref.url}
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block bg-white border border-[#dfe0e6] rounded-[20px] px-4 py-3 shadow-md hover:border-[var(--accent)]/45 hover:shadow-lg transition-all"
                  >
                    <div className="text-xs uppercase tracking-[0.25em] text-[#8489a9]">
                      {ref.hostname || "link"}
                    </div>
                    <div className="text-sm text-[var(--text-primary)] break-words">
                      {ref.display}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-[#d3d3da] rounded-[20px] p-6 text-center">
                <p className="text-sm text-[#6b6b73] leading-relaxed">
                  아직 수집된 레퍼런스 링크가 없습니다. AI 응답에 포함된 URL이
                  자동으로 표시됩니다.
                </p>
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#616168] uppercase tracking-[0.2em]">
              <History className="w-4 h-4" />
              Activity Timeline
            </div>
            <div className="space-y-3">
              {activityItems.length > 0 ? (
                activityItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-[#dfe0e6] rounded-[20px] px-4 py-3 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#6b6b73]">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <div className="text-[11px] text-[#8a8a92]">
                        {new Date(item.timestamp).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="text-sm text-[var(--text-primary)] leading-6 mt-2 whitespace-pre-wrap break-words">
                      {item.preview || "(내용 없음)"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white border border-dashed border-[#d3d3da] rounded-[20px] p-6 text-center">
                  <p className="text-sm text-[#6b6b73] leading-relaxed">
                    아직 대화가 없습니다. 메시지를 입력해 활동 기록을 확인해보세요.
                  </p>
                </div>
              )}
            </div>
            {processLogs.length > 0 && (
              <div className="bg-white border border-[#dfe0e6] rounded-[22px] p-4 space-y-2 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-[#7c82a4]">
                  Process Logs
                </div>
                <div className="text-xs text-[#656b8d] space-y-2 max-h-48 overflow-y-auto">
                  {processLogs.slice(-15).map((log, index) => (
                    <div key={`${log}-${index}`}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </aside>
  );
}
