---
name: react-best-practices
description: Vercel에서 제공하는 React 및 Next.js 성능 최적화 베스트 프랙티스 가이드 (한국어)
---

# React 베스트 프랙티스 (React Best Practices)

이 스킬은 Vercel의 10년 이상의 React 및 Next.js 최적화 노하우를 바탕으로 작성되었습니다. 주요 목표는 성능 저하의 근본 원인을 파악하고 해결하는 것입니다.

## 1. 비동기 워터폴 제거 (Eliminating Async Waterfalls) [CRITICAL]

데이터 요청이 순차적으로 일어나서 불필요한 대기 시간이 발생하는 것을 방지합니다.

- **원칙**: 서로 의존성이 없는 비동기 작업은 최대한 병렬로 실행하세요.
- **방법**: `Promise.all()`을 사용하거나, 데이터가 필요한 시점 직전까지 `await`을 늦추세요.

```javascript
// 잘못된 예 (워터폴 발생)
const user = await fetchUser();
const posts = await fetchPosts(user.id); // user가 올 때까지 대기
const settings = await fetchSettings(); // posts가 올 때까지 대기 (의존성 없음에도 불구하고)

// 올바른 예 (병렬 실행)
const user = await fetchUser();
const [posts, settings] = await Promise.all([
  fetchPosts(user.id),
  fetchSettings()
]);
```

## 2. 번들 크기 최적화 (Bundle Size Optimization) [CRITICAL]

클라이언트가 다운로드해야 하는 자바스크립트 양을 줄입니다.

- **원칙**: 사용하지 않는 코드는 로드하지 마세요.
- **방법**: 
  - Barrel files (`index.ts`에서 모든 것을 export하는 방식) 사용을 피하세요.
  - 무거운 컴포넌트는 `next/dynamic` (또는 `React.lazy`)으로 동적 임포트하세요.
  - 외부 라이브러리는 필요한 시점에만 로드하세요.

## 3. 서버 측 성능 (Server-Side Performance) [HIGH]

서버에서 수행되는 작업의 효율성을 높입니다.

- **방법**: 데이터베이스 쿼리를 최적화하고, 가능한 경우 서버 사이드 캐싱을 활용하세요. 불필요한 서버 렌더링을 피하세요.

## 4. 클라이언트 측 데이터 페칭 (Client-Side Data Fetching) [MEDIUM-HIGH]

브라우저에서 데이터를 가져올 때의 효율성을 개선합니다.

- **방법**: SWR이나 TanStack Query와 같은 라이브러리를 사용하여 캐싱, 재검증, 중복 요청 제거를 수행하세요.

## 5. 리렌더링 최적화 (Re-render Optimization) [MEDIUM]

불필요한 리액트 컴포넌트 업데이트를 방지합니다.

- **방법**: 
  - 상태(State)를 트리 하단으로 내리세요 (Colocate state).
  - 무거운 연산은 `useMemo`로 감싸세요.
  - 함수 정의는 `useCallback`으로 메모이제이션하세요 (자식 컴포넌트가 `React.memo`를 사용할 때 특히 중요).
  - `useState(() => initialValue)`를 사용하여 초기 상태 설정 시 무거운 연산이 매 렌더링마다 실행되는 것을 방지하세요.

## 6. 렌더링 성능 (Rendering Performance) [MEDIUM]

브라우저가 화면을 그리는 속도를 높입니다.

- **방법**: 거대한 리스트는 가상화(Virtualization)를 적용하고, 레이아웃 시프트(CLS)를 방지하기 위해 이미지 크기를 지정하세요.

## 7. JavaScript 성능 (JavaScript Performance) [LOW-MEDIUM]

순수 자바스크립트 로직의 실행 속도를 개선합니다.

- **방법**: 루프 내에서의 불필요한 객체 생성을 피하고, 효율적인 자료구조를 선택하세요.

## 8. 고급 패턴 (Advanced Patterns) [LOW]

- **방법**: 컴포넌트 합성(Composition)을 통해 Props Drilling을 해결하고 유연성을 높이세요.

---
이 가이드를 준수하여 더 빠르고 효율적인 React 애플리케이션을 구축하세요.
