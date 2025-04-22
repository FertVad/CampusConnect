import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SaveButtonProps {
  onClick: () => void;
  isSaving: boolean;
  disabled?: boolean;
  className?: string;
  showIcon?: boolean;
}

export function SaveButton({
  onClick,
  isSaving,
  disabled = false,
  className = '',
  showIcon = true
}: SaveButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isSaving}
      className={className}
    >
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Сохранение...
        </>
      ) : (
        <>
          {showIcon && <span className="mr-2">💾</span>}
          Сохранить
        </>
      )}
    </Button>
  );
}