import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app'; // O './app/app.component' según el nombre que generó la CLI

bootstrapApplication(App, appConfig).catch((err) => console.error(err));