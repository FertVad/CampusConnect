import React from 'react';
import ModalPortal from '@/features/modals/components/ModalPortal';
import { useFocusTrap } from '@/features/modals/hooks/useFocusTrap';
import portalStyles from '@/features/modals/styles/ModalPortal.module.css';
import styles from '../styles/DayDetailsModal.module.css';

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

const DayDetailsModal: React.FC<DayDetailsModalProps> = ({ isOpen, onClose, children }) => {
  const focusTrapRef = useFocusTrap(isOpen);

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} className={portalStyles.portal}>
      <div ref={focusTrapRef} className={styles.modal}>
        {children}
      </div>
    </ModalPortal>
  );
};

export default DayDetailsModal;
