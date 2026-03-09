import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'danger';
};

export const Button = ({ className, variant = 'primary', ...props }: ButtonProps) => (
  <button
    className={cn(
      'rounded-md px-4 py-2 text-white cursor-pointer',
      variant === 'primary' && 'bg-primary hover:bg-primary/80',
      variant === 'danger' && 'bg-red hover:bg-red/80',
      className
    )}
    {...props}
  />
);
