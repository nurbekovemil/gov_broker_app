import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'h-6 w-6', md: 'h-10 w-10', lg: 'h-14 w-14' }[size];
  return <Loader2 className={cn('animate-spin text-primary', s, className)} aria-hidden />;
}
