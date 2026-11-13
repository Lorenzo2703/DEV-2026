import { createElement } from 'react';

export function Button({ children, variant = 'default', ...props }) {
  const styles = variant === 'outline' ? 'border px-4 py-2' : 'bg-slate-900 px-4 py-2 text-white';
  return createElement('button', { type: 'button', ...props, className: styles }, children);
}
