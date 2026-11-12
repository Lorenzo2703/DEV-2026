import assert from 'node:assert/strict';
import { welcome } from './message';

assert.equal(welcome(' developer '), 'Welcome, developer!');
assert.throws(() => welcome(' '), /Name must not be empty/);
console.log('Bun example passed.');
