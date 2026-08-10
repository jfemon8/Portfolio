import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[inset_0_0.0625rem_0_var(--glass-highlight)] hover:brightness-110 hover:shadow-[inset_0_0.0625rem_0_var(--glass-highlight),0_0_3.75rem_-0.75rem_hsl(var(--ring)/0.55)]',
        secondary:
          'glass-thin text-secondary-foreground hover:border-primary/40',
        outline:
          'glass-thin text-foreground hover:border-primary/60 hover:text-primary',
        ghost:
          'border border-transparent text-muted-foreground hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg)] hover:text-foreground hover:backdrop-blur-md hover:backdrop-saturate-150 hover:backdrop-brightness-105',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[inset_0_0.0625rem_0_var(--glass-highlight)] hover:brightness-110 hover:shadow-[inset_0_0.0625rem_0_var(--glass-highlight),0_0_3.75rem_-0.75rem_hsl(var(--destructive)/0.5)]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      // Mobile heights meet the ~44px touch-target minimum; sm: (640px+) steps back to the compact size.
      size: {
        sm: 'h-11 px-3 sm:h-9',
        md: 'h-11 px-5 sm:h-10',
        lg: 'h-12 px-7 text-base',
        icon: 'h-11 w-11 sm:h-10 sm:w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { buttonVariants };
