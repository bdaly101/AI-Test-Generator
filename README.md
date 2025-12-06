# AI-Test-Generator

CLI tool & GitHub Action that generates Vitest/Jest tests from git diffs using Claude AI. Analyzes code changes, creates unit tests and Supabase Edge Function integration tests, outputs to `__tests__/generated/` with TODO markers for review. Supports PR comments or auto-commit to suggestion branches.

## Features

- 🤖 **AI-Powered Test Generation**: Uses Claude AI to generate comprehensive tests
- 📝 **Multiple Input Sources**: Generate tests from staged changes, branch diffs, or pull requests
- 🧪 **Framework Support**: Supports both Vitest and Jest
- 🔧 **Configurable**: Easy configuration via `.aitestrc.json`
- 🚀 **GitHub Integration**: Post tests as PR comments or auto-commit to branches
- ⚡ **TypeScript ESM**: Built with modern TypeScript and ES modules

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

## Configuration

The `.aitestrc.json` file supports the following options:

```json
{
  "testFramework": "vitest",
  "outputDir": "__tests__/generated",
  "model": "claude-3-5-sonnet-20241022",
  "includeEdgeFunctionTests": false,
  "autoCommit": false,
  "branchPrefix": "test-gen"
}
```

### Configuration Options

- **testFramework**: Test framework to use (`vitest` or `jest`)
- **outputDir**: Directory where generated tests will be saved
- **model**: Claude AI model to use
- **includeEdgeFunctionTests**: Generate integration tests for Supabase Edge Functions
- **autoCommit**: Automatically commit generated tests to a new branch
- **branchPrefix**: Prefix for auto-generated branches

Environment variables take precedence over config file values:
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

## GitHub Action

Use AI Test Generator in your GitHub workflows:

```yaml
name: Generate Tests

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
│   │   ├── generate.ts    # Generate command implementation
│   │   └── init.ts        # Init command implementation
│   └── index.ts           # CLI entry point
├── core/
│   ├── diff-parser.ts     # Git diff parsing with simple-git
│   └── test-generator.ts  # Test file formatting and output
├── ai/
│   └── claude-client.ts   # Claude API integration
├── github/
│   ├── pr-comment.ts      # PR comment functionality
│   └── branch-commit.ts   # Branch and commit operations
└── config/
    ├── schema.ts          # Zod schema for config validation
    └── loader.ts          # Config file loader
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

# Run locally
node dist/cli/index.js --help
```

## License

ISC
