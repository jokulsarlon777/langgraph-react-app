"use client";

import { useState, useEffect, useRef, memo } from "react";
import { ExternalLink } from "lucide-react";

interface LazyUrlPreviewProps {
  url: string;
  className?: string;
}

/**
 * 지연 로딩 URL 미리보기 컴포넌트
 * Intersection Observer를 사용하여 뷰포트에 들어올 때만 메타데이터 로드
 */
const LazyUrlPreview = memo(function LazyUrlPreview({
  url,
  className = "",
}: LazyUrlPreviewProps) {
  const [preview, setPreview] = useState<{
    title?: string;
    description?: string;
    image?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "100px", // 뷰포트 100px 전에 미리 로드
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isInView || preview || isLoading || hasError) return;

    const fetchPreview = async () => {
      setIsLoading(true);
      try {
        // 간단한 URL 미리보기 (실제로는 서버 API를 통해 메타데이터를 가져와야 함)
        const domain = new URL(url).hostname.replace(/^www\./, "");
        setPreview({
          title: domain,
          description: url,
        });
      } catch (error) {
        console.error("Failed to fetch URL preview:", error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [isInView, url, preview, isLoading, hasError]);

  return (
    <div ref={containerRef} className={className}>
      {isLoading ? (
        <div className="border border-[var(--panel-border)] rounded-lg p-4 bg-[var(--bg-elevated)] animate-pulse">
          <div className="h-4 bg-[var(--bg-surface)] rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-[var(--bg-surface)] rounded w-full"></div>
        </div>
      ) : preview ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block border border-[var(--panel-border)] rounded-lg p-4 bg-[var(--bg-elevated)] hover:border-[var(--accent)] transition-colors"
        >
          {preview.image && (
            <img
              src={preview.image}
              alt={preview.title}
              className="w-full h-32 object-cover rounded mb-2"
              loading="lazy"
            />
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-[var(--text-primary)] truncate">
                {preview.title}
              </h4>
              {preview.description && (
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mt-1">
                  {preview.description}
                </p>
              )}
            </div>
            <ExternalLink className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0 mt-1" />
          </div>
        </a>
      ) : hasError ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block border border-[var(--panel-border)] rounded-lg p-4 bg-[var(--bg-elevated)] hover:border-[var(--accent)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-[var(--text-primary)] break-all">{url}</span>
          </div>
        </a>
      ) : null}
    </div>
  );
});

LazyUrlPreview.displayName = "LazyUrlPreview";

export default LazyUrlPreview;

