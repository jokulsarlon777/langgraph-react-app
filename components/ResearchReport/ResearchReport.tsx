"use client";

import { useMemo, useState, memo } from "react";
import ReportHeader from "./ReportHeader";
import ReportOverview from "./ReportOverview";
import ReportSection from "./ReportSection";
import VirtualizedReportSections from "./VirtualizedReportSections";
import SourcesList from "./SourcesList";
import TypingIndicator from "../TypingIndicator";
import type { ReportSectionData, ReportSource } from "./types";
import styles from "./ResearchReport.module.css";

export interface ResearchReportData {
  title: string;
  subtitle: string;
  status: "loading" | "completed" | "error";
  duration: number;
  overview: string;
  sections: ReportSectionData[];
  sources: ReportSource[];
}

interface ResearchReportProps {
  data: ResearchReportData;
  isStreaming?: boolean;
}

// 가상 스크롤을 사용할 섹션 개수 임계값
const VIRTUALIZATION_THRESHOLD = 10;

function ResearchReportComponent({
  data,
  isStreaming = false,
}: ResearchReportProps) {
  const [expandedSources, setExpandedSources] = useState(false);

  const hasSections = useMemo(
    () => Array.isArray(data.sections) && data.sections.length > 0,
    [data.sections]
  );

  const shouldUseVirtualization = useMemo(
    () => data.sections.length >= VIRTUALIZATION_THRESHOLD,
    [data.sections.length]
  );

  return (
    <div className={styles.researchReport}>
      <ReportHeader
        title={data.title}
        subtitle={data.subtitle}
        status={data.status}
        duration={data.duration}
        sectionCount={data.sections.length}
      />

      <div className={styles.reportContent}>
        <ReportOverview content={data.overview} />

        {hasSections && (
          <>
            {shouldUseVirtualization ? (
              <VirtualizedReportSections
                sections={data.sections}
                isStreaming={isStreaming}
                className={styles.reportSections}
              />
            ) : (
              <div className={styles.reportSections}>
                {data.sections.map((section, index) => (
                  <ReportSection key={section.id ?? index} section={section} index={index} />
                ))}
              </div>
            )}
          </>
        )}

        {/* 스트리밍 중 타이핑 인디케이터 */}
        {isStreaming && data.sections.length === 0 && (
          <TypingIndicator />
        )}

        <SourcesList
          sources={data.sources}
          isExpanded={expandedSources}
          onToggle={() => setExpandedSources((prev) => !prev)}
        />
      </div>
    </div>
  );
}

ResearchReportComponent.displayName = "ResearchReport";

const ResearchReport = memo(ResearchReportComponent);

export default ResearchReport;
