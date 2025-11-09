# LangGraph React App

LangGraph API와 통신하는 React 기반 프론트엔드 애플리케이션

이 앱은 open_deep_research LangGraph 백엔드와 완벽하게 통신하여
사내 데이터 조회 및 검색을 위한 AI Agent 인터페이스를 제공합니다.

## 주요 기능

- Thread별 대화 내역 관리
- 왼쪽 사이드바에서 Thread 목록 확인 및 선택
- Thread별 메타데이터(제목, 생성시간, 메시지 수) 표시
- 실시간 처리 과정 로그 표시
- ChatGPT 스타일의 다크 모드 UI

## 기술 스택

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (상태 관리)
- @langchain/langgraph-sdk
- React Markdown

## 설치 및 실행

1. 의존성 설치:
```bash
npm install
```

2. 환경 변수 설정:
```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 편집하여 LangGraph 서버 URL과 Assistant ID를 설정하세요.

3. 개발 서버 실행:
```bash
npm run dev
```

4. 브라우저에서 `http://localhost:3000` 접속

## 환경 변수

- `NEXT_PUBLIC_LANGGRAPH_URL`: LangGraph 서버 URL (기본값: http://127.0.0.1:2024)
- `NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID`: Assistant ID (기본값: Deep Researcher)
- `NEXT_PUBLIC_LANGGRAPH_API_KEY`: API 키 (선택사항, 로컬 서버는 필요 없음)

## 사용 방법

1. + New thread 버튼으로 새 대화 시작
2. Thread 클릭하여 대화 전환
3. 질문 입력하여 응답 확인
4. 사이드바의 API 설정에서 서버 URL 및 Assistant ID 변경 가능

## 프로젝트 구조

```
langgraph-react-app/
├── app/
│   ├── layout.tsx      # 루트 레이아웃
│   ├── page.tsx        # 메인 페이지
│   └── globals.css     # 전역 스타일
├── components/
│   ├── Sidebar.tsx     # 사이드바 컴포넌트
│   ├── ChatMessage.tsx # 채팅 메시지 컴포넌트
│   └── ChatInput.tsx   # 채팅 입력 컴포넌트
├── lib/
│   └── langgraph.ts    # LangGraph 클라이언트 및 유틸리티
└── store/
    └── threadStore.ts  # Zustand 스토어 (Thread 상태 관리)
```
