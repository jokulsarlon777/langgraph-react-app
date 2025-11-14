"use client";

import Badge from "../shared/Badge";
import styles from "./ReportHeader.module.css";

const STATUS_CONFIG = {
  completed: { label: "분석 완료", variant: "green" as const },
  loading: { label: "분석 중…", variant: "blue" as const },
  error: { label: "오류 발생", variant: "red" as const },
};

interface ReportHeaderProps {
  title: string;
  subtitle: string;
  status: "loading" | "completed" | "error";
  duration: number;
  sectionCount: number;
}

export default function ReportHeader({
  title,
  subtitle,
  status,
  duration,
  sectionCount,
}: ReportHeaderProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.completed;
  const formattedDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className={styles.reportHeader}>
      <div className={styles.headerTop}>
        <div className={styles.headerTitles}>
          <h1 className={styles.reportTitle}>{title}</h1>
          <p className={styles.reportSubtitle}>{subtitle}</p>
        </div>
        <Badge variant={config.variant} text={config.label} />
      </div>

      <div className={styles.headerMeta}>
        <span className={styles.metaItem}>⏱️ {Math.max(duration, 1)}초</span>
        <span className={styles.metaDivider}>•</span>
        <span className={styles.metaItem}>🧠 세션 {sectionCount}개</span>
        <span className={styles.metaDivider}>•</span>
        <span className={styles.metaItem}>📅 {formattedDate}</span>
      </div>
    </header>
  );
}
