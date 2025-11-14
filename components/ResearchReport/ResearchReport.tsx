"use client";

import { useMemo, useState } from "react";
import ReportHeader from "./ReportHeader";
import ReportOverview from "./ReportOverview";
import ReportSection from "./ReportSection";
import SourcesList from "./SourcesList";
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
}

export default function ResearchReport({ data }: ResearchReportProps) {
  const [expandedSources, setExpandedSources] = useState(false);

  const hasSections = useMemo(
    () => Array.isArray(data.sections) && data.sections.length > 0,
    [data.sections]
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
          <div className={styles.reportSections}>
            {data.sections.map((section, index) => (
              <ReportSection key={section.id ?? index} section={section} index={index} />
            ))}
          </div>
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
