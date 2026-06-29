import { defineConfig } from 'vitest/config'

// One runner for both tiers: tight unit tests next to the code (src/**/*.test.ts) and
// behaviour-level Gherkin feature tests (features/**/*.steps.ts) that drive the app
// layer against fake-indexeddb. `npm test` runs everything; `npm run test:features`
// filters to the feature layer.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'features/**/*.steps.ts'],
    setupFiles: ['./test/setup.ts'],
  },
})
