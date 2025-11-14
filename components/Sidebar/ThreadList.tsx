"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { useThreadStore } from "@/store/threadStore";
import styles from "./ThreadList.module.css";

interface ThreadListProps {
  selectedThreadId?: string | null;
  onSelectThread: (threadId: string) => void;
}

export default function ThreadList({
  selectedThreadId = null,
  onSelectThread,
}: ThreadListProps) {
  const { threads } = useThreadStore();

  const orderedThreads = useMemo(() => {
    return Object.entries(threads)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => {
        const dateA = new Date(a.created_at ?? 0).getTime();
        const dateB = new Date(b.created_at ?? 0).getTime();
        return dateB - dateA;
      });
  }, [threads]);

  if (orderedThreads.length === 0) {
    return <p className={styles.threadEmpty}>대화 기록이 없습니다.</p>;
  }

  return (
    <div className={styles.threadList}>
      {orderedThreads.map((thread) => {
        const created = thread.created_at
          ? format(new Date(thread.created_at), "MM/dd HH:mm")
          : "";
        const isActive = selectedThreadId === thread.id;

        return (
          <button
            key={thread.id}
            type="button"
            className={`${styles.threadItem} ${isActive ? styles.active : ""}`}
            onClick={() => onSelectThread(thread.id)}
          >
            <div className={styles.threadTitle}>{thread.title || "New thread"}</div>
            <div className={styles.threadMeta}>
              <span>{created}</span>
              <span className={styles.threadDivider}>•</span>
              <span>{thread.message_count}개의 메시지</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
