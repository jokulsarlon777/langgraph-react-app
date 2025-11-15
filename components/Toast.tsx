"use client";

import { Toaster } from "react-hot-toast";

/**
 * Toast 알림 컴포넌트
 * 전역 Toast 설정을 관리합니다.
 */
export default function Toast() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "var(--panel-bg)",
          color: "var(--text-primary)",
          border: "1px solid var(--panel-border)",
          borderRadius: "12px",
          padding: "12px 16px",
          fontSize: "14px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        },
        success: {
          iconTheme: {
            primary: "var(--accent)",
            secondary: "#fff",
          },
          style: {
            borderLeft: "4px solid var(--accent)",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
          style: {
            borderLeft: "4px solid #ef4444",
          },
        },
        loading: {
          iconTheme: {
            primary: "var(--accent)",
            secondary: "#fff",
          },
        },
      }}
    />
  );
}

