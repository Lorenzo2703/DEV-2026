import { createElement } from 'react';
import { Button } from './button.mjs';

export function ReviewAction({ disabled }) {
  return createElement(Button, { variant: 'outline', disabled }, 'Review deployment');
}
