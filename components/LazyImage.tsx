"use client";

import { useState, useEffect, useRef, memo } from "react";

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 지연 로딩 이미지 컴포넌트
 * Intersection Observer를 사용하여 뷰포트에 들어올 때만 로드
 */
const LazyImage = memo(function LazyImage({
  src,
  alt = "",
  className = "",
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

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
        rootMargin: "50px", // 뷰포트 50px 전에 미리 로드
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {!isInView ? (
        <div className="w-full h-48 bg-[var(--bg-elevated)] animate-pulse flex items-center justify-center">
          <span className="text-[var(--text-secondary)] text-sm">로딩 중...</span>
        </div>
      ) : hasError ? (
        <div className="w-full h-48 bg-[var(--bg-elevated)] flex items-center justify-center border border-[var(--panel-border)] rounded-lg">
          <span className="text-[var(--text-secondary)] text-sm">이미지를 불러올 수 없습니다</span>
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-[var(--bg-elevated)] animate-pulse flex items-center justify-center">
              <span className="text-[var(--text-secondary)] text-sm">로딩 중...</span>
            </div>
          )}
          <img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full h-auto transition-opacity duration-300 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
          />
        </>
      )}
    </div>
  );
});

LazyImage.displayName = "LazyImage";

export default LazyImage;

