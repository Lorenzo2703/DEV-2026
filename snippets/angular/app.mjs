import { Component } from '@angular/core';

export class App {
  title = 'Deployment checklist';
}

Component({
  selector: 'app-root',
  template: '<main><h1>{{ title }}</h1><p>Verify your build before publishing.</p></main>',
})(App);
