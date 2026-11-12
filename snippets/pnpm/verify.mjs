import assert from 'node:assert/strict';
import { createGreeting } from '@dev-2026/shared';

assert.equal(createGreeting('pnpm'), 'Hello, pnpm!');
console.log('pnpm workspace dependency verified.');
