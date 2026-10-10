import { useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import './tokens.css';
import './ui.css';

export interface MenuItemDef {
  id: string;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export interface MenuProps {
  trigger: ReactNode;
  items: MenuItemDef[];
  label: string;
  align?: 'start' | 'end';
}

export function Menu({ trigger, items, label, align = 'start' }: MenuProps) {
  const [open, setOpen] = useState(false);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const menuItems = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(
        '[role="menuitemradio"],[role="menuitemcheckbox"],[role="menuitem"]'
      )
    );
    if (!menuItems.length) return;
    e.preventDefault();
    const idx = menuItems.indexOf(document.activeElement as HTMLElement);
    let next = 0;
    if (idx === -1) {
      next = e.key === 'ArrowDown' ? 0 : menuItems.length - 1;
    } else {
      next =
        e.key === 'ArrowDown'
          ? (idx + 1) % menuItems.length
          : (idx - 1 + menuItems.length) % menuItems.length;
    }
    menuItems[next]?.focus();
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="ui-menu-trigger"
          aria-haspopup="menu"
          aria-label={label}
        >
          {trigger}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="ui-menu"
          role="menu"
          aria-label={label}
          align={align}
          sideOffset={4}
          collisionPadding={8}
          onKeyDown={onKeyDown}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`ui-menu-item${item.danger ? ' ui-menu-item-danger' : ''}`}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
