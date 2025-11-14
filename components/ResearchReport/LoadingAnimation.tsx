"use client";

import styles from "./LoadingAnimation.module.css";

export default function LoadingAnimation() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingAnimation}>
        <div className={styles.loadingSpinner} aria-hidden />
      </div>
    </div>
  );
}
