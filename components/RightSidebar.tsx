"use client";

import { useMemo, useState } from "react";
import { Link, ListTree, History } from "lucide-react";
import styles from "./RightSidebar.module.css";

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
    <aside className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleGroup}>
            <span className={styles.eyebrow}>Insights</span>
            <h2 className={styles.title}>Reference & Activity</h2>
          </div>
        </div>

        <div className={styles.tabGroup} role="tablist" aria-label="인사이트 탭">
          <button
            onClick={() => setActiveTab("sources")}
            className={`${styles.tabButton} ${
              activeTab === "sources" ? styles.tabButtonActive : ""
            }`}
            role="tab"
            aria-selected={activeTab === "sources"}
            aria-controls="sources-panel"
            id="sources-tab"
            aria-label="소스 탭"
          >
            <Link className={styles.tabIcon} aria-hidden="true" />
            Sources
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`${styles.tabButton} ${
              activeTab === "activity" ? styles.tabButtonActive : ""
            }`}
            role="tab"
            aria-selected={activeTab === "activity"}
            aria-controls="activity-panel"
            id="activity-tab"
            aria-label="활동 탭"
          >
            <History className={styles.tabIcon} aria-hidden="true" />
            Activity
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {activeTab === "sources" ? (
          <section 
            className={styles.section}
            role="tabpanel"
            id="sources-panel"
            aria-labelledby="sources-tab"
          >
            <div className={styles.sectionLabel}>
              SOURCES ({formattedReferences.length})
            </div>
            {formattedReferences.length > 0 ? (
              <ul className={styles.sourceList} role="list">
                {formattedReferences.map((ref) => (
                  <li key={ref.url} className={styles.sourceItem} role="listitem">
                    <span className={styles.sourceDomain} aria-label="도메인">{ref.hostname || "link"}</span>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.sourceLink}
                      aria-label={`${ref.hostname || "링크"} 열기 (새 탭)`}
                    >
                      {ref.display}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyCard} role="status" aria-live="polite">
                아직 수집된 레퍼런스 링크가 없습니다. AI 응답에 포함된 URL이 자동으로
                표시됩니다.
              </div>
            )}
          </section>
        ) : (
          <section 
            className={styles.section}
            role="tabpanel"
            id="activity-panel"
            aria-labelledby="activity-tab"
          >
            <div className={styles.sectionLabel}>Activity Timeline</div>
            {activityItems.length > 0 ? (
              <div className={styles.activityList} role="list">
                {activityItems.map((item) => (
                  <div key={item.id} className={styles.activityItem} role="listitem">
                    <div className={styles.activityHeader}>
                      <span aria-label={`${item.label} 활동`}>
                        {item.icon} {item.label}
                      </span>
                      <time 
                        className={styles.activityTime}
                        dateTime={item.timestamp}
                        aria-label={`활동 시간: ${new Date(item.timestamp).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}`}
                      >
                        {new Date(item.timestamp).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </time>
                    </div>
                    <div className={styles.activityBody}>{item.preview || "(내용 없음)"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyCard} role="status" aria-live="polite">
                아직 대화가 없습니다. 메시지를 입력해 활동 기록을 확인해보세요.
              </div>
            )}

            {processLogs.length > 0 && (
              <div className={styles.processCard}>
                <div className={styles.processTitle}>Process Logs</div>
                <div className={styles.processList}>
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
