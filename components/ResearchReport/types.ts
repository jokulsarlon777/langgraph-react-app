export interface ReportMetric {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
}

export interface ReportSectionData {
  id?: string;
  title: string;
  content: string;
  metrics?: ReportMetric[];
}

export interface ReportSource {
  title: string;
  url: string;
}
