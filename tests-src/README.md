# Test Suite for New Source Directory (src)

This directory contains Jest test suites for the new refactored source code in the `src/` directory.

## Structure

- `setup.js` - Global test setup with localStorage, sessionStorage, and DOM mocks
- `*.test.js` - Individual module test files

## Running Tests

### Run all tests (both old and new)
```bash
npm run test
```

### Run only new src tests
```bash
npm run tests
```

### Run only old src-old tests
```bash
npm run tests-old
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Files

- `app.test.js` - Main application module
- `athletes.test.js` - Athlete management
- `analytics.test.js` - Analytics functionality
- `athlete-detail.test.js` - Athlete detail views
- `calendar.test.js` - Calendar functionality
- `config.test.js` - Configuration management
- `dashboard.test.js` - Dashboard functionality
- `dynamic-selects.test.js` - Dynamic select components
- `email-service.test.js` - Email service
- `imageGenerator.test.js` - Image generation
- `index.test.js` - Main entry point
- `lang.test.js` - Language and internationalization
- `new-athlete.test.js` - New athlete creation
- `new-session.test.js` - New session creation
- `session-detail.test.js` - Session details
- `session-settings.test.js` - Session settings
- `sessions.test.js` - Session management
- `shooting.test.js` - Shooting functionality
- `settings.test.js` - General settings
- `target-manager.test.js` - Target management
- `theme-manager.test.js` - Theme management
- `utils.test.js` - Utility functions
- `voice-shot-input.test.js` - Voice input handling
- `integration.test.js` - Integration tests
