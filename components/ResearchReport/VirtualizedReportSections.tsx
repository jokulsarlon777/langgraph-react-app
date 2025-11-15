"use client";

import { memo, useRef, useEffect, useCallback, useState } from "react";
import { List } from "react-window";
import ReportSection from "./ReportSection";
import type { ReportSectionData } from "./types";

interface VirtualizedReportSectionsProps {
  sections: ReportSectionData[];
  isStreaming: boolean;
  className?: string;
}

/**
 * 가상 스크롤링 리포트 섹션 리스트 컴포넌트
 * react-window를 사용하여 대량의 섹션을 효율적으로 렌더링
 */
const VirtualizedReportSections = memo(function VirtualizedReportSections({
  sections,
  isStreaming,
  className = "",
}: VirtualizedReportSectionsProps) {
  const listRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(0);
  const itemHeightsRef = useRef<Map<number, number>>(new Map());

  // 컨테이너 높이 계산 - 부모 컨테이너의 높이 사용
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        // 부모 요소의 높이를 사용
        const parent = containerRef.current.parentElement;
        if (parent) {
          const rect = parent.getBoundingClientRect();
          const height = rect.height || window.innerHeight - 400; // 헤더와 여백 고려
          setListHeight(Math.max(height, 400)); // 최소 높이 보장
        } else {
          // 부모가 없으면 뷰포트 높이 사용
          setListHeight(window.innerHeight - 400);
        }
      }
    };

    // 초기 높이 설정
    updateHeight();

    // ResizeObserver를 사용하여 부모 크기 변경 감지
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
      resizeObserver.disconnect();
    };
  }, []);

  // 아이템 높이 가져오기 (기본값 300px)
  const getItemSize = useCallback(
    (index: number) => {
      return itemHeightsRef.current.get(index) || 300;
    },
    []
  );

  // 아이템 높이 설정
  const setItemSize = useCallback((index: number, size: number) => {
    if (itemHeightsRef.current.get(index) !== size) {
      itemHeightsRef.current.set(index, size);
      if (listRef.current && typeof listRef.current.resetAfterIndex === "function") {
        listRef.current.resetAfterIndex(index);
      }
    }
  }, []);

  // 스트리밍 중이거나 새 섹션이 추가되면 맨 아래로 스크롤
  useEffect(() => {
    if (listRef.current && sections.length > 0) {
      // 스트리밍 중이거나 새 섹션이 추가되었을 때만 자동 스크롤
      if (isStreaming) {
        // 약간의 지연을 두어 DOM 업데이트 후 스크롤
        const timeoutId = setTimeout(() => {
          if (listRef.current && typeof listRef.current.scrollToItem === "function") {
            listRef.current.scrollToItem(sections.length - 1, "end");
          }
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [sections.length, isStreaming]);

  // 각 섹션 아이템 렌더링 함수
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const section = sections[index];
      if (!section) return null;

      return (
        <div style={style}>
          <div
            ref={(el) => {
              if (el) {
                const height = el.offsetHeight;
                setItemSize(index, height);
              }
            }}
          >
            <ReportSection section={section} index={index} />
          </div>
        </div>
      );
    },
    [sections, setItemSize]
  );

  // 섹션이 없을 때
  if (sections.length === 0) {
    return (
      <div ref={containerRef} className={`flex-1 ${className}`}>
        <div className="flex items-center justify-center h-full">
          <p className="text-[var(--text-secondary)]">섹션이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full ${className}`} style={{ minHeight: "400px" }}>
      {listHeight > 0 ? (
        <List
          ref={listRef}
          height={listHeight}
          itemCount={sections.length}
          itemSize={getItemSize}
          width="100%"
          overscan={3} // 뷰포트 밖 3개 아이템 미리 렌더링 (react-window 2.x에서는 overscanCount 대신 overscan 사용)
        >
          {Row}
        </List>
      ) : (
        // 높이가 계산되기 전까지 일반 렌더링
        <div className="space-y-4">
          {sections.map((section, index) => (
            <ReportSection key={section.id ?? index} section={section} index={index} />
          ))}
        </div>
      )}
    </div>
  );
});

VirtualizedReportSections.displayName = "VirtualizedReportSections";

export default VirtualizedReportSections;

