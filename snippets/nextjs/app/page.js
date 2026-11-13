import { createElement } from 'react';

export default function Page() {
  return createElement(
    'main',
    null,
    createElement('h1', null, 'Deployment checklist'),
    createElement('p', null, 'Verify your build before publishing.'),
  );
}
