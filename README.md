# AI-Test-Generator

CLI tool & GitHub Action that generates Vitest/Jest tests from git diffs using Claude AI. Analyzes code changes, creates unit tests and Supabase Edge Function integration tests, outputs to `__tests__/generated/` with TODO markers for review.

## Features

- 🤖 **AI-Powered Test Generation**: Uses Claude AI (claude-3-5-sonnet) to generate comprehensive tests
- 📝 **Multiple Input Sources**: Generate tests from staged changes, branch diffs, or pull requests
- 🧪 **Framework Support**: Auto-detects and supports both Vitest and Jest
- 🔧 **Code Analysis**: Uses ts-morph for TypeScript AST parsing to understand code structure
- ⚡ **Supabase Support**: Detects Edge Functions and generates integration tests
- 📊 **Coverage Gap Analysis**: Analyze command to find files without tests
- 🚀 **GitHub Integration**: Post tests as PR comments or auto-commit to branches
- ✅ **TODO Tracking**: Marks uncertain assertions with TODO comments for review

## Installation

```bash
npm install -g ai-test-generator
```

Or use locally in a project:

```bash
npm install --save-dev ai-test-generator
```

## Quick Start

### 1. Initialize Configuration

```bash
ai-test-generator init
```

This creates a `.aitestrc.json` file with default settings.

### 2. Set Environment Variables

```bash
export ANTHROPIC_API_KEY="your-api-key"
export GITHUB_TOKEN="your-github-token"  # Optional, for GitHub operations
```

### 3. Generate Tests

From staged changes:
```bash
git add .
ai-test-generator generate --staged
```

From branch diff:
```bash
ai-test-generator generate --branch main
```

From a pull request:
```bash
ai-test-generator generate --pr 123 --owner yourorg --repo yourrepo --comment
```

### 4. Analyze Coverage Gaps

```bash
ai-test-generator analyze --staged
ai-test-generator analyze --branch main --verbose
```

## Configuration

The `.aitestrc.json` file supports the following options:

```json
{
  "$schema": "https://ai-test-gen.dev/schema.json",
  "framework": "auto",
  "outputDir": "__tests__/generated",
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**"],
  "ai": {
    "model": "claude-3-5-sonnet-20241022",
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

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `framework` | `'vitest' \| 'jest' \| 'auto'` | `'auto'` | Test framework (auto-detects from project) |
| `outputDir` | `string` | `'__tests__/generated'` | Directory for generated tests |
| `include` | `string[]` | `['src/**/*.ts']` | File patterns to include |
| `exclude` | `string[]` | `['**/*.test.ts']` | File patterns to exclude |
| `ai.model` | `string` | `'claude-3-5-sonnet-20241022'` | Claude AI model |
| `ai.temperature` | `number` | `0.3` | AI response temperature |
| `ai.maxTokens` | `number` | `4096` | Max tokens per response |
| `supabase.enabled` | `boolean` | `true` | Enable Supabase Edge Function detection |
| `github.mode` | `'comment' \| 'branch' \| 'none'` | `'comment'` | GitHub integration mode |

### Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)
- `GITHUB_TOKEN`: GitHub personal access token (required for GitHub operations)

## Commands

### `init`

Initialize configuration file.

```bash
ai-test-generator init [options]
```

Options:
- `-f, --force`: Overwrite existing configuration

### `generate`

Generate tests from git diffs.

```bash
ai-test-generator generate [options]
```

Options:
- `--staged`: Generate tests from staged changes
- `--branch <branch>`: Generate tests from changes compared to a branch
- `--pr <number>`: Generate tests from a pull request
- `--owner <owner>`: GitHub repository owner (required for --pr)
- `--repo <repo>`: GitHub repository name (required for --pr)
- `--comment`: Add tests as a PR comment (requires --pr)
- `--commit`: Commit generated tests to a new branch

### `analyze`

Analyze codebase for test coverage gaps without generating tests.

```bash
ai-test-generator analyze [options]
```

Options:
- `--staged`: Analyze staged changes
- `--branch <branch>`: Analyze changes compared to a branch
- `--output <format>`: Output format (`json` or `text`, default: `text`)
- `--verbose`: Show detailed analysis

## GitHub Action

Use AI Test Generator in your GitHub workflows:

```yaml
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
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Generate tests
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npx ai-test-generator generate \
            --pr ${{ github.event.pull_request.number }} \
            --owner ${{ github.repository_owner }} \
            --repo ${{ github.event.repository.name }} \
            --comment
```

## Project Structure

```
src/
├── cli/
│   ├── commands/
│   │   ├── generate.ts      # Generate command
│   │   ├── init.ts          # Init command
│   │   └── analyze.ts       # Analyze command
│   └── index.ts             # CLI entry point
├── core/
│   ├── diff-parser.ts       # Git diff parsing
│   ├── code-analyzer.ts     # TypeScript AST analysis
│   ├── test-generator.ts    # Test file formatting
│   └── file-writer.ts       # Test file writing with headers
├── ai/
│   ├── claude-client.ts     # Claude API with retry logic
│   ├── parser.ts            # Response parsing & TODO extraction
│   └── prompts/
│       ├── system.ts        # System prompts
│       ├── unit-test.ts     # Unit test prompts
│       └── integration.ts   # Integration test prompts
├── frameworks/
│   ├── detector.ts          # Framework auto-detection
│   ├── vitest-adapter.ts    # Vitest-specific generation
│   └── jest-adapter.ts      # Jest-specific generation
├── supabase/
│   ├── edge-function.ts     # Edge Function detection
│   └── integration-template.ts
├── github/
│   ├── pr-comment.ts        # PR comment functionality
│   └── branch-commit.ts     # Branch and commit operations
├── config/
│   ├── schema.ts            # Zod config validation
│   └── loader.ts            # Config file loader
└── utils/
    ├── logger.ts            # Logging utilities
    ├── git.ts               # Git utilities
    └── fs.ts                # File system helpers
```

## Development

```bash
# Clone the repository
git clone https://github.com/bdaly101/AI-Test-Generator.git
cd AI-Test-Generator

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run locally
node dist/cli/index.js --help

# Development mode with watch
npm run dev
```

## Integration with Dev Lifecycle

AI-Test-Generator integrates with the dev lifecycle automation:

1. **Pre-commit**: Run `ai-test-generator generate --staged` to generate tests for changed files
2. **CI/CD**: GitHub Actions workflow runs on PR open/sync
3. **Code Review**: Tests appear as PR comments for review
4. **Coverage**: Use `analyze` command to find coverage gaps

## License

ISC
