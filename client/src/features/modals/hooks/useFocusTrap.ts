import { useEffect, useRef } from 'react';

export const useFocusTrap = (isOpen: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Сохранить текущий focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus на modal
    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements?.length) {
      (focusableElements[0] as HTMLElement).focus();
    }

    // Trap focus внутри modal
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !focusableElements?.length) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);

    return () => {
      // Восстановить focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
      document.removeEventListener('keydown', handleTab);
    };
  }, [isOpen]);

  return containerRef;
};
