"use client";

import Card from "../shared/Card";
import Divider from "../shared/Divider";
import type { ReportSource } from "./types";
import styles from "./SourcesList.module.css";

interface SourcesListProps {
  sources: ReportSource[];
  onToggle: () => void;
  isExpanded: boolean;
}

export default function SourcesList({ sources, onToggle, isExpanded }: SourcesListProps) {
  return (
    <Card className={styles.sourcesCard}>
      <button type="button" className={styles.sourcesHeader} onClick={onToggle}>
        <h3 className={styles.sourcesTitle}>📚 참고 자료 ({sources.length})</h3>
        <span className={`${styles.sourcesToggle} ${isExpanded ? styles.open : ""}`}>▼</span>
      </button>
      {isExpanded && (
        <>
          <Divider />
          <div className={styles.sourcesList}>
            {sources.length > 0 ? (
              sources.map((source, index) => <SourceItem key={index} source={source} />)
            ) : (
              <p className={styles.sourcesEmpty}>표시할 소스가 없습니다.</p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

interface SourceItemProps {
  source: ReportSource;
}

function SourceItem({ source }: SourceItemProps) {
  const domain = new URL(source.url).hostname;
  return (
    <div className={styles.sourceItem}>
      <div className={styles.sourceFavicon}>
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          alt={domain}
          className={styles.favicon}
        />
      </div>
      <div className={styles.sourceBody}>
        <div className={styles.sourceTitle}>{source.title || domain}</div>
        <div className={styles.sourceUrl}>{domain}</div>
      </div>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.sourceLinkBtn}
      >
        ↗
      </a>
    </div>
  );
}
