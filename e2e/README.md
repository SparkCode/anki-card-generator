# E2E Testing with Playwright

This directory contains end-to-end tests using Playwright to automate browser interactions with the Anki Card Generator application.

## Available Tests

1. **Basic Screenshot Test** (`basic.spec.ts`)
   - Opens the application
   - Takes a screenshot of the homepage
   - Verifies the app loaded correctly

2. **API Flow Test** (`api-flow.spec.ts`)
   - Configures API keys from environment variables
   - Enters a word and example sentence
   - Generates a flashcard
   - Takes a screenshot of the result

## Running the Tests

### Basic Test

Run all tests:

```bash
npm run e2e
```

Run with UI:

```bash
npm run e2e:ui
```

Run in debug mode:

```bash
npm run e2e:debug
```

### API Flow Test

This test requires an OpenAI API key. You can run it using:

```bash
# Option 1: Use the helper script
OPENAI_API_KEY=your_key ./run-api-flow-test.sh

# Option 2: Run directly
OPENAI_API_KEY=your_key npm run e2e:api-flow
```

## Viewing Results

- **Screenshots**: Check the `e2e/screenshots` directory
- **HTML Report**: Run `npx playwright show-report` to view the full report

## Troubleshooting

- **Test Timeouts**: If the API response takes too long, the test will timeout. Check the `reading-card-timeout.png` screenshot to see what happened.
- **Missing API Keys**: Ensure your OpenAI API key is correctly set as an environment variable.
- **Element Not Found**: The test uses robust selectors, but if the UI changes significantly, selectors may need to be updated. 