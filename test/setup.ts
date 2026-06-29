// Global Vitest setup. `fake-indexeddb/auto` installs an in-memory IndexedDB on the
// global scope so Dexie (and our app-layer use-cases) run unchanged in Node — this is
// what lets the Gherkin feature tests exercise the real persistence code paths just
// below the React layer, with no browser.
import 'fake-indexeddb/auto'
