import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8100',
    // Los specs viven en e2e/src (no en la carpeta cypress/ por defecto).
    specPattern: 'e2e/src/**/*.cy.ts',
    supportFile: 'e2e/support/e2e.ts',
    fixturesFolder: 'e2e/fixtures',
    screenshotsFolder: 'e2e/screenshots',
    videosFolder: 'e2e/videos',
    video: false,
    viewportWidth: 390,
    viewportHeight: 844,
    defaultCommandTimeout: 8000,
    // Los componentes de Ionic (ion-input, ion-select...) usan Shadow DOM.
    includeShadowDom: true,
  },
});
