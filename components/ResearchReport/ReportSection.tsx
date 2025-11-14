"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import Card from "../shared/Card";
import Divider from "../shared/Divider";
import MetricCard from "./MetricCard";
import type { ReportSectionData } from "./types";
import styles from "./ReportSection.module.css";

interface ReportSectionProps {
  section: ReportSectionData;
  index: number;
}

const ReportSection: React.FC<ReportSectionProps> = ({ section, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={styles.sectionCard}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
      >
        <div className={styles.sectionTitleGroup}>
          <span className={styles.sectionNumber}>{index + 1}</span>
          <h3 className={styles.sectionTitle}>{section.title}</h3>
        </div>
        <span className={`${styles.sectionToggle} ${isExpanded ? styles.open : ""}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <>
          <Divider />
          <div className={styles.sectionMarkdown}>
            <ReactMarkdown>{section.content}</ReactMarkdown>
          </div>

          {section.metrics && section.metrics.length > 0 && (
            <>
              <Divider />
              <div className={styles.metricsGrid}>
                {section.metrics.map((metric, metricIndex) => (
                  <MetricCard key={metricIndex} {...metric} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
};

export default ReportSection;
