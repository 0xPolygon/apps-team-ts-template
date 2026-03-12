import type { HTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col items-center gap-4 rounded-lg border border-grey-light bg-surface p-8 shadow-card',
      className
    )}
    {...props}
  />
);
