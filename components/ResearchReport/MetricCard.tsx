"use client";

import styles from "./MetricCard.module.css";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: string;
}

export default function MetricCard({ label, value, unit, icon }: MetricCardProps) {
  return (
    <div className={styles.metricCard}>
      {icon && (
        <div className={styles.metricIcon} aria-hidden>
          {icon}
        </div>
      )}
      <div className={styles.metricBody}>
        <span className={styles.metricLabel}>{label}</span>
        <div className={styles.metricValue}>
          {value}
          {unit && <span className={styles.metricUnit}>{unit}</span>}
        </div>
      </div>
    </div>
  );
}
