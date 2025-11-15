import type { Metadata } from "next";
import "./globals.css";
import Toast from "@/components/Toast";

export const metadata: Metadata = {
  title: "AI Research Agent",
  description: "LangGraph 기반 심층 리서치 에이전트",
  icons: {
    icon: "🔬",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full overflow-hidden">
        {children}
        <Toast />
      </body>
    </html>
  );
}
