import '@angular/compiler';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bootstrapApplication } from '@angular/platform-browser';
import { renderApplication } from '@angular/platform-server';
import { App } from './app.mjs';

test('renders the component in an Angular application', async () => {
  const html = await renderApplication((context) => bootstrapApplication(App, {}, context), {
    document: '<!doctype html><html lang="en"><body><app-root></app-root></body></html>',
    url: 'http://localhost/',
    allowedHosts: ['localhost'],
  });
  assert.match(html, /<h1>Deployment checklist<\/h1>/);
  assert.match(html, /Verify your build before publishing/);
});
