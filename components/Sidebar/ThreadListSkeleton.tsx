"use client";

import styles from "./ThreadList.module.css";

/**
 * Thread 목록 로딩 스켈레톤 컴포넌트
 */
export default function ThreadListSkeleton() {
  return (
    <div className={styles.threadList}>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={`${styles.threadItem} animate-pulse`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="h-4 bg-[var(--bg-surface)] rounded w-3/4 mb-2" />
          <div className="flex items-center gap-2">
            <div className="h-3 bg-[var(--bg-surface)] rounded w-16" />
            <div className="h-3 bg-[var(--bg-surface)] rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

