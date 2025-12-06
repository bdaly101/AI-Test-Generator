# AI Test Generator — Development Roadmap & Cursor Guide



> **Purpose**: Automatically generate Vitest/Jest unit tests and Supabase Edge Function integration tests from git diffs. Outputs to `__tests__/generated/` with TODO comments for manual review.



---



## 1. Project Overview



### What We're Building



A CLI tool and GitHub Action that:

1. Reads git diffs (staged, committed, or PR-based)

2. Analyzes changed code using an LLM (Claude API)

3. Generates relevant test files (Vitest/Jest unit tests, Supabase integration tests)

4. Outputs to `__tests__/generated/` with `TODO:` markers where human judgment is needed

5. Integrates with GitHub Actions for automated PR workflows



### Tech Stack



| Layer | Technology |

|-------|------------|

| Runtime | Node.js 20+ (ESM) |

| Language | TypeScript 5.x |

| CLI Framework | Commander.js |

| AI Provider | Anthropic Claude API (claude-sonnet-4-20250514) |

| Git Operations | simple-git |

| Test Frameworks | Vitest (primary), Jest (fallback) |

| Supabase | @supabase/supabase-js, edge runtime types |

| CI/CD | GitHub Actions |



---



## 2. Architecture



```

ai-test-generator/

├── src/

│   ├── index.ts                 # CLI entry point

│   ├── cli/

│   │   ├── commands/

│   │   │   ├── generate.ts      # Main generate command

│   │   │   ├── init.ts          # Initialize config

│   │   │   └── analyze.ts       # Analyze without generating

│   │   └── options.ts           # CLI option definitions

│   ├── core/

│   │   ├── diff-parser.ts       # Parse git diffs into structured data

│   │   ├── code-analyzer.ts     # Extract context from changed files

│   │   ├── test-generator.ts    # Orchestrate AI test generation

│   │   └── file-writer.ts       # Write generated tests to disk

│   ├── ai/

│   │   ├── client.ts            # Claude API client wrapper

│   │   ├── prompts/

│   │   │   ├── system.ts        # System prompts for test generation

│   │   │   ├── unit-test.ts     # Unit test generation prompts

│   │   │   └── integration.ts   # Supabase integration test prompts

│   │   └── parser.ts            # Parse AI responses into test code

│   ├── frameworks/

│   │   ├── detector.ts          # Detect Vitest vs Jest

│   │   ├── vitest-adapter.ts    # Vitest-specific generation

│   │   └── jest-adapter.ts      # Jest-specific generation

│   ├── supabase/

│   │   ├── edge-function.ts     # Edge function detection & analysis

│   │   └── integration-template.ts

│   ├── github/

│   │   ├── pr-comment.ts        # Post suggestions as PR comments

│   │   └── branch-commit.ts     # Commit to bot/test-suggestions

│   ├── config/

│   │   ├── loader.ts            # Load .aitestrc config

│   │   └── schema.ts            # Config validation schema

│   └── utils/

│       ├── logger.ts

│       ├── git.ts               # Git utilities

│       └── fs.ts                # File system helpers

├── templates/

│   ├── vitest-unit.hbs          # Handlebars templates

│   ├── jest-unit.hbs

│   └── supabase-integration.hbs

├── .github/

│   └── workflows/

│       └── ai-test-generator.yml

├── package.json

├── tsconfig.json

├── vitest.config.ts

└── .aitestrc.example.json

```



---



## 3. Implementation Phases



### Phase 1: Core Infrastructure (Week 1)



#### 1.1 Project Setup



```bash

# Cursor prompt:

# "Initialize a new TypeScript ESM project with:

# - Node 20+, TypeScript 5.x strict mode

# - Vitest for testing

# - ESLint + Prettier

# - Commander.js for CLI

# Create package.json with bin entry pointing to dist/index.js"

```



**Files to create:**

- `package.json` — dependencies, scripts, bin config

- `tsconfig.json` — strict ESM config

- `vitest.config.ts` — test configuration

- `.eslintrc.cjs` — linting rules

- `.prettierrc` — formatting



#### 1.2 CLI Foundation



```typescript

// src/index.ts

// Cursor prompt:

// "Create CLI entry with Commander.js that has:

// - 'generate' command (default) with options for --staged, --branch, --pr

// - 'init' command to create .aitestrc config

// - 'analyze' command for dry-run analysis

// - Global options: --verbose, --config, --output-dir"

```



**Key Commands:**

```bash

npx ai-test-gen generate              # Generate from staged changes

npx ai-test-gen generate --branch main # Compare against branch

npx ai-test-gen generate --pr 123     # Generate for PR #123

npx ai-test-gen init                  # Create config file

npx ai-test-gen analyze               # Analyze without generating

```



#### 1.3 Git Diff Parser



```typescript

// src/core/diff-parser.ts

// Cursor prompt:

// "Create a diff parser using simple-git that:

// 1. Gets diff for staged changes, branch comparison, or specific commits

// 2. Parses unified diff format into structured objects

// 3. Extracts: file path, change type (added/modified/deleted), hunks with line numbers

// 4. Filters to only .ts, .tsx, .js, .jsx files

// 5. Excludes test files, node_modules, dist"

```



**Data structure:**

```typescript

interface ParsedDiff {

  files: DiffFile[];

  stats: { additions: number; deletions: number; filesChanged: number };

}



interface DiffFile {

  path: string;

  changeType: 'added' | 'modified' | 'deleted' | 'renamed';

  hunks: DiffHunk[];

  language: 'typescript' | 'javascript';

}



interface DiffHunk {

  oldStart: number;

  oldLines: number;

  newStart: number;

  newLines: number;

  content: string;

  addedLines: string[];

  removedLines: string[];

}

```



---



### Phase 2: AI Integration (Week 2)



#### 2.1 Claude API Client



```typescript

// src/ai/client.ts

// Cursor prompt:

// "Create a Claude API client wrapper that:

// 1. Uses @anthropic-ai/sdk

// 2. Implements retry logic with exponential backoff

// 3. Handles rate limiting gracefully

// 4. Supports streaming for long responses

// 5. Validates API key from env or config

// 6. Uses claude-sonnet-4-20250514 model by default"

```



#### 2.2 System Prompts



```typescript

// src/ai/prompts/system.ts

// Cursor prompt:

// "Create system prompts for test generation that instruct Claude to:

// 1. Analyze code changes and understand the intent

// 2. Generate comprehensive test cases covering:

//    - Happy path scenarios

//    - Edge cases and boundary conditions

//    - Error handling paths

// 3. Use describe/it/expect syntax

// 4. Add TODO comments for assertions needing human review

// 5. Include setup/teardown when needed

// 6. Mock external dependencies appropriately"

```



**System prompt structure:**

```typescript

export const SYSTEM_PROMPT = `You are an expert test engineer. Given code changes (git diff), generate comprehensive tests.



## Output Format

- Generate valid TypeScript test files

- Use the specified test framework (Vitest or Jest)

- Include imports at the top

- Group related tests in describe blocks

- Add TODO comments where manual verification is needed



## Test Coverage Requirements

1. Cover all new/modified functions

2. Include happy path tests

3. Add edge case tests (null, undefined, empty, boundary values)

4. Test error handling paths

5. Mock external dependencies



## TODO Comment Convention

Use these markers:

- // TODO: Verify expected value - when you're uncertain of the exact expected output

- // TODO: Add assertion - when the test needs human-defined assertions

- // TODO: Mock needed - when external service mocking is required

- // TODO: Integration test - when this needs real service testing

`;

```



#### 2.3 Response Parser



```typescript

// src/ai/parser.ts

// Cursor prompt:

// "Create a parser that extracts test code from Claude's response:

// 1. Handle markdown code blocks (```typescript)

// 2. Validate the extracted code is valid TypeScript

// 3. Extract multiple test files if generated

// 4. Parse TODO comments into structured metadata

// 5. Handle partial/incomplete responses gracefully"

```



---



### Phase 3: Test Generation Engine (Week 3)



#### 3.1 Code Analyzer



```typescript

// src/core/code-analyzer.ts

// Cursor prompt:

// "Create a code analyzer that extracts context from changed files:

// 1. Parse TypeScript AST using ts-morph

// 2. Extract function signatures, parameters, return types

// 3. Identify exported vs internal functions

// 4. Detect dependencies and imports

// 5. Find existing tests for the same module

// 6. Extract JSDoc comments and type information

// 7. Identify if file is a Supabase Edge Function"

```



**Analysis output:**

```typescript

interface CodeAnalysis {

  functions: FunctionInfo[];

  classes: ClassInfo[];

  exports: ExportInfo[];

  imports: ImportInfo[];

  existingTests: string[];

  isEdgeFunction: boolean;

  dependencies: string[];

}

```



#### 3.2 Framework Detector



```typescript

// src/frameworks/detector.ts

// Cursor prompt:

// "Create a test framework detector that:

// 1. Checks package.json for vitest or jest

// 2. Looks for vitest.config.ts or jest.config.js

// 3. Analyzes existing test files for import patterns

// 4. Returns framework type and config path

// 5. Defaults to Vitest if neither detected"

```



#### 3.3 Test Generator Orchestrator



```typescript

// src/core/test-generator.ts

// Cursor prompt:

// "Create the main test generation orchestrator that:

// 1. Takes parsed diff and code analysis as input

// 2. Groups changes by file/module

// 3. Determines test type needed (unit vs integration)

// 4. Builds context-aware prompts for Claude

// 5. Generates tests in parallel where possible

// 6. Combines results into test files

// 7. Handles Supabase Edge Functions specially"

```



**Generation flow:**

```typescript

async function generateTests(options: GenerateOptions): Promise<GeneratedTests> {

  // 1. Parse git diff

  const diff = await parseDiff(options);

  

  // 2. Analyze each changed file

  const analyses = await Promise.all(

    diff.files.map(file => analyzeCode(file))

  );

  

  // 3. Detect test framework

  const framework = await detectFramework();

  

  // 4. Generate tests for each file

  const tests = await Promise.all(

    analyses.map(analysis => generateFileTests(analysis, framework))

  );

  

  // 5. Write to output directory

  await writeTests(tests, options.outputDir);

  

  return { tests, stats: computeStats(tests) };

}

```



---



### Phase 4: Supabase Integration (Week 4)



#### 4.1 Edge Function Detection



```typescript

// src/supabase/edge-function.ts

// Cursor prompt:

// "Create Supabase Edge Function detection that:

// 1. Checks if file is in supabase/functions/ directory

// 2. Detects Deno imports and serve() pattern

// 3. Extracts request/response types

// 4. Identifies database operations (supabase client usage)

// 5. Detects authentication requirements

// 6. Maps to integration test requirements"

```



#### 4.2 Integration Test Templates



```typescript

// src/supabase/integration-template.ts

// Cursor prompt:

// "Create integration test templates for Supabase Edge Functions:

// 1. Setup/teardown for Supabase client

// 2. Test authenticated vs unauthenticated requests

// 3. Test different HTTP methods

// 4. Mock Supabase client responses

// 5. Test database operations with test data

// 6. Include environment variable handling"

```



**Template structure:**

```typescript

// templates/supabase-integration.hbs

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createClient } from '@supabase/supabase-js';



describe('{{functionName}} Edge Function', () => {

  let supabase: ReturnType<typeof createClient>;

  

  beforeAll(() => {

    supabase = createClient(

      process.env.SUPABASE_URL!,

      process.env.SUPABASE_ANON_KEY!

    );

  });



  {{#each testCases}}

  it('{{description}}', async () => {

    // TODO: Add test data setup

    const response = await supabase.functions.invoke('{{../functionName}}', {

      body: {{json requestBody}},

      {{#if requiresAuth}}

      headers: { Authorization: `Bearer ${process.env.TEST_USER_TOKEN}` }

      {{/if}}

    });

    

    expect(response.error).toBeNull();

    // TODO: Verify response data

    expect(response.data).toBeDefined();

  });

  {{/each}}

});

```



---



### Phase 5: GitHub Integration (Week 5)



#### 5.1 PR Comment System



```typescript

// src/github/pr-comment.ts

// Cursor prompt:

// "Create GitHub PR comment integration that:

// 1. Uses @octokit/rest for GitHub API

// 2. Posts test suggestions as review comments

// 3. Groups suggestions by file

// 4. Uses collapsible sections for large outputs

// 5. Includes 'Apply Suggestion' buttons where possible

// 6. Updates existing comments on re-run"

```



**Comment format:**

```markdown

## 🧪 AI Test Suggestions



<details>

<summary><strong>src/utils/formatter.ts</strong> — 3 tests suggested</summary>



\`\`\`typescript

// __tests__/generated/utils/formatter.test.ts

describe('formatDate', () => {

  it('should format ISO date to readable string', () => {

    // TODO: Verify expected format

    expect(formatDate('2024-01-15')).toBe('January 15, 2024');

  });

});

\`\`\`



</details>



---

*Generated by AI Test Generator • [View all suggestions](link)*

```



#### 5.2 Branch Commit System



```typescript

// src/github/branch-commit.ts

// Cursor prompt:

// "Create a system that commits generated tests to a separate branch:

// 1. Create/checkout bot/test-suggestions branch

// 2. Write generated test files

// 3. Commit with descriptive message

// 4. Push to remote

// 5. Optionally create PR from suggestion branch

// 6. Handle merge conflicts gracefully"

```



#### 5.3 GitHub Action Workflow



```yaml

# .github/workflows/ai-test-generator.yml

# Cursor prompt:

# "Create a GitHub Action workflow that:

# 1. Triggers on PR open/sync events

# 2. Installs and runs ai-test-generator

# 3. Either posts comments or commits to branch based on config

# 4. Caches node_modules for speed

# 5. Uses secrets for API keys

# 6. Fails gracefully without blocking PR"



name: AI Test Generator



on:

  pull_request:

    types: [opened, synchronize]



jobs:

  generate-tests:

    runs-on: ubuntu-latest

    permissions:

      contents: write

      pull-requests: write

    

    steps:

      - uses: actions/checkout@v4

        with:

          fetch-depth: 0  # Full history for diff

      

      - uses: actions/setup-node@v4

        with:

          node-version: '20'

          cache: 'npm'

      

      - name: Install dependencies

        run: npm ci

      

      - name: Install AI Test Generator

        run: npm install -g ai-test-generator

      

      - name: Generate Tests

        env:

          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

        run: |

          ai-test-gen generate \

            --pr ${{ github.event.pull_request.number }} \

            --mode comment \

            --verbose

      

      - name: Commit to suggestions branch (alternative)

        if: ${{ env.COMMIT_MODE == 'branch' }}

        run: |

          ai-test-gen generate \

            --pr ${{ github.event.pull_request.number }} \

            --mode branch \

            --branch-name "bot/test-suggestions-${{ github.event.pull_request.number }}"

```



---



### Phase 6: Configuration & Polish (Week 6)



#### 6.1 Configuration System



```typescript

// src/config/schema.ts

// Cursor prompt:

// "Create a configuration schema using Zod that supports:

// 1. Test framework preference (vitest/jest/auto)

// 2. Output directory customization

// 3. File patterns to include/exclude

// 4. AI model selection and parameters

// 5. GitHub integration settings

// 6. Custom prompt overrides

// 7. TODO comment style preferences"

```



**Config file (`.aitestrc.json`):**

```json

{

  "$schema": "https://ai-test-gen.dev/schema.json",

  "framework": "vitest",

  "outputDir": "__tests__/generated",

  "include": ["src/**/*.ts", "src/**/*.tsx"],

  "exclude": ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**"],

  "ai": {

    "model": "claude-sonnet-4-20250514",

    "temperature": 0.3,

    "maxTokens": 4096

  },

  "github": {

    "mode": "comment",

    "updateExisting": true,

    "createPR": false

  },

  "supabase": {

    "enabled": true,

    "functionsDir": "supabase/functions"

  },

  "todos": {

    "style": "inline",

    "markers": ["TODO", "FIXME", "MANUAL"]

  }

}

```



#### 6.2 File Writer with TODO Tracking



```typescript

// src/core/file-writer.ts

// Cursor prompt:

// "Create a file writer that:

// 1. Writes generated tests to outputDir maintaining source structure

// 2. Adds header comment with generation metadata

// 3. Tracks TODO comments and outputs summary

// 4. Creates index file listing all generated tests

// 5. Handles file conflicts (overwrite/skip/merge)

// 6. Formats output with Prettier if available"

```



**Output file header:**

```typescript

/**

 * @generated by AI Test Generator

 * @source src/utils/formatter.ts

 * @date 2024-01-15T10:30:00Z

 * @todos 3 items requiring manual review

 * 

 * Run `npx ai-test-gen todos` to list all pending TODOs

 */

```



---



## 4. Key Prompts for Claude API



### Unit Test Generation Prompt



```typescript

export function buildUnitTestPrompt(context: TestContext): string {

  return `

## Task

Generate unit tests for the following code changes.



## Changed Code

\`\`\`${context.language}

${context.diffContent}

\`\`\`



## Full File Context

\`\`\`${context.language}

${context.fullFileContent}

\`\`\`



## Existing Tests (if any)

${context.existingTests || 'No existing tests found'}



## Requirements

1. Framework: ${context.framework} (use ${context.framework === 'vitest' ? 'vi' : 'jest'} for mocking)

2. Cover all new/modified functions

3. Include edge cases for: null, undefined, empty values, boundary conditions

4. Add TODO comments where you're uncertain about expected values

5. Mock external dependencies using ${context.framework === 'vitest' ? 'vi.mock()' : 'jest.mock()'}



## Output Format

Return ONLY the test file content, no explanations. Use TypeScript.

`;

}

```



### Supabase Integration Test Prompt



```typescript

export function buildSupabaseTestPrompt(context: EdgeFunctionContext): string {

  return `

## Task

Generate integration tests for this Supabase Edge Function.



## Edge Function Code

\`\`\`typescript

${context.functionCode}

\`\`\`



## Function Analysis

- Name: ${context.functionName}

- HTTP Methods: ${context.methods.join(', ')}

- Requires Auth: ${context.requiresAuth}

- Database Operations: ${context.dbOperations.join(', ')}



## Requirements

1. Test all HTTP methods the function handles

2. Test authenticated and unauthenticated scenarios

3. Test success and error responses

4. Mock database responses where appropriate

5. Add TODO comments for:

   - Test data that needs real values

   - Assertions that need verification

   - Environment-specific configuration



## Output Format

Return a complete test file using Vitest. Include setup/teardown.

`;

}

```



---



## 5. Testing the Generator Itself



```typescript

// Cursor prompt:

// "Create tests for the AI Test Generator itself:

// 1. Unit tests for diff parser with sample diffs

// 2. Unit tests for code analyzer with sample TypeScript

// 3. Integration tests for CLI commands

// 4. Mock Claude API responses for AI tests

// 5. Snapshot tests for generated test output

// 6. E2E test with real git repo"

```



**Test structure:**

```

__tests__/

├── unit/

│   ├── diff-parser.test.ts

│   ├── code-analyzer.test.ts

│   ├── response-parser.test.ts

│   └── framework-detector.test.ts

├── integration/

│   ├── cli-generate.test.ts

│   ├── cli-init.test.ts

│   └── github-integration.test.ts

├── e2e/

│   └── full-workflow.test.ts

├── fixtures/

│   ├── sample-diffs/

│   ├── sample-code/

│   └── mock-responses/

└── __snapshots__/

```



---



## 6. Error Handling Matrix



| Scenario | Handling |

|----------|----------|

| API key missing | Prompt for key or show setup instructions |

| Rate limited | Exponential backoff with progress indicator |

| Invalid diff | Skip file with warning, continue others |

| Parse error in response | Retry with simplified prompt |

| Git not available | Error with installation instructions |

| No changes detected | Info message, exit cleanly |

| Network failure | Retry 3x, then fail with cached partial results |

| Existing test conflict | Configurable: skip/overwrite/merge |



---



## 7. Development Commands



```bash

# Development

npm run dev              # Watch mode with tsx

npm run build            # Build for production

npm run test             # Run tests

npm run test:watch       # Watch mode for tests

npm run lint             # Lint code

npm run typecheck        # TypeScript check



# CLI Testing

npm run cli -- generate --staged

npm run cli -- generate --branch main

npm run cli -- init



# Release

npm run release          # Bump version, build, publish

```



---



## 8. Dependencies



```json

{

  "dependencies": {

    "@anthropic-ai/sdk": "^0.52.0",

    "@octokit/rest": "^20.0.0",

    "commander": "^12.0.0",

    "simple-git": "^3.22.0",

    "ts-morph": "^22.0.0",

    "zod": "^3.22.0",

    "handlebars": "^4.7.8",

    "chalk": "^5.3.0",

    "ora": "^8.0.0"

  },

  "devDependencies": {

    "@types/node": "^20.0.0",

    "typescript": "^5.4.0",

    "vitest": "^1.3.0",

    "tsx": "^4.7.0",

    "eslint": "^8.57.0",

    "prettier": "^3.2.0"

  }

}

```



---



## 9. Quick Start for Cursor



Copy these prompts in sequence to build the project:



### Step 1: Initialize

```

Create a new TypeScript ESM project called "ai-test-generator" with the architecture defined in the roadmap. Set up package.json with CLI bin entry, tsconfig.json with strict mode, and basic folder structure.

```



### Step 2: CLI Setup

```

Implement the CLI using Commander.js with generate, init, and analyze commands. Include options for --staged, --branch, --pr, --verbose, --config, and --output-dir.

```



### Step 3: Diff Parser

```

Create the git diff parser using simple-git. Parse unified diffs into structured objects with file paths, change types, and hunks. Filter to only TypeScript/JavaScript files.

```



### Step 4: AI Integration

```

Implement the Claude API client with retry logic and rate limiting. Create system prompts for test generation that produce Vitest-compatible output with TODO markers.

```



### Step 5: Test Generator

```

Build the test generation orchestrator that combines diff parsing, code analysis, and AI generation. Output tests to __tests__/generated/ directory.

```



### Step 6: Supabase Support

```

Add Supabase Edge Function detection and integration test generation. Detect functions in supabase/functions/ and generate appropriate integration tests.

```



### Step 7: GitHub Actions

```

Create GitHub integration for PR comments and branch commits. Include the GitHub Action workflow file.

```



---



## 10. Success Metrics



- [ ] CLI generates valid, runnable tests

- [ ] 80%+ of generated tests pass on first run

- [ ] TODO comments accurately identify uncertain assertions

- [ ] Supabase Edge Functions detected and tested appropriately

- [ ] GitHub Action completes in under 2 minutes

- [ ] Config file properly customizes behavior

- [ ] Documentation complete and accurate



---



*Built with ❤️ for developer productivity*

