"use client";

import ReactMarkdown from "react-markdown";
import Card from "../shared/Card";
import styles from "./ReportOverview.module.css";

interface ReportOverviewProps {
  content: string;
}

export default function ReportOverview({ content }: ReportOverviewProps) {
  return (
    <Card className={styles.overviewCard}>
      <div className={styles.overviewHeader}>
        <h2 className={styles.overviewTitle}>개요</h2>
        <span className={styles.overviewIcon} role="img" aria-label="summary">
          📝
        </span>
      </div>
      <div className={styles.overviewMarkdown}>
        <ReactMarkdown>{content || "요약 정보가 없습니다."}</ReactMarkdown>
      </div>
    </Card>
  );
}
