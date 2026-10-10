import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import './tokens.css';
import './ui.css';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Dialog({ open, onOpenChange, title, children, footer }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-dialog-overlay" />
        <DialogPrimitive.Content
          className="ui-dialog"
          aria-describedby={undefined}
        >
          <div className="ui-dialog-head">
            <DialogPrimitive.Title className="ui-dialog-title">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="ui-dialog-close" aria-label="Đóng">
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </DialogPrimitive.Close>
          </div>
          <div className="ui-dialog-body">{children}</div>
          {footer && <div className="ui-dialog-foot">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
