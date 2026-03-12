import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'danger';
};

export const Button = ({ className, variant = 'primary', ...props }: ButtonProps) => (
  <button
    className={cn(
      'rounded-md px-4 py-2 cursor-pointer transition-colors',
      variant === 'primary' && 'bg-primary/20 text-foreground hover:bg-primary/30',
      variant === 'danger' && 'bg-red/20 text-red hover:bg-red/30',
      className
    )}
    {...props}
  />
);
