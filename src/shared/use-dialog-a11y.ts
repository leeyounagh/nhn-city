"use client";
// 모달 다이얼로그 접근성 훅. 반환한 ref를 모달 패널에 달면 ESC 닫기·포커스 트랩·열기 전 포커스 저장→닫을 때 복원·body 스크롤 잠금을 처리한다.
// 패널 엘리먼트엔 role="dialog" aria-modal="true" aria-labelledby(제목 id) tabIndex={-1}를 함께 준다.
import { useEffect, useRef } from "react";

export function useDialogA11y(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  // onClose가 렌더마다 새 함수여도 아래 effect가 재실행되지 않도록 ref로 최신값을 참조한다.
  // (render 중이 아니라 effect 안에서 갱신 — React 규칙 준수.)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null)
        : [];

    // 초기 포커스: 패널 내 첫 포커스 가능 요소, 없으면 패널 자신.
    (focusables()[0] ?? node)?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === node)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return ref;
}
