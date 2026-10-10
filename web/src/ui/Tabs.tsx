import type { ReactNode } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import './tokens.css';
import './ui.css';

export interface TabDef {
  value: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: TabDef[];
  children?: ReactNode;
}

export function Tabs({ value, onValueChange, tabs, children }: TabsProps) {
  return (
    <TabsPrimitive.Root
      className="ui-tabs"
      value={value}
      onValueChange={onValueChange}
    >
      <TabsPrimitive.List className="ui-tabs-list">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className="ui-tabs-trigger"
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="ui-tabs-count">{tab.count}</span>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}
