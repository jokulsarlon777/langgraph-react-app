"use client";

import styles from "./Badge.module.css";

type BadgeVariant = "blue" | "green" | "orange" | "red";

interface BadgeProps {
  variant?: BadgeVariant;
  text: string;
}

export default function Badge({ variant = "blue", text }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{text}</span>;
}
