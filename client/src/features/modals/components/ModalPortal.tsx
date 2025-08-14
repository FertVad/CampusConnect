import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';

interface ModalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const ModalPortal: React.FC<ModalPortalProps> = ({
  isOpen,
  onClose,
  children,
  className
}) => {
  const portalRoot = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Создать или найти portal root
    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
    portalRoot.current = root;
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Background scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Escape key handling
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !portalRoot.current) return null;

  return createPortal(
    <div className={className}>
      {children}
    </div>,
    portalRoot.current
  );
};

export default ModalPortal;
