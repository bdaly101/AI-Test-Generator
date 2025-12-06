import { CodeAnalysis } from '../../core/code-analyzer.js';

export interface TestContext {
  diffContent: string;
  fullFileContent: string;
  language: 'typescript' | 'javascript';
  framework: 'vitest' | 'jest';
  existingTests?: string;
  codeAnalysis?: CodeAnalysis;
}

/**
 * Build the prompt for unit test generation
 */
export function buildUnitTestPrompt(context: TestContext): string {
  const { diffContent, fullFileContent, language, framework, existingTests, codeAnalysis } = context;

  const frameworkInfo = framework === 'vitest' 
    ? 'Vitest (use vi.mock() and vi.spyOn() for mocking)'
    : 'Jest (use jest.mock() and jest.spyOn() for mocking)';

  let analysisSection = '';
  if (codeAnalysis) {
    const functions = codeAnalysis.functions
      .filter(f => f.isExported || codeAnalysis.exports.some(e => e.name === f.name))
      .map(f => `  - ${f.name}(${f.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}) => ${f.returnType}`)
      .join('\n');

    if (functions) {
      analysisSection = `## Functions to Test
${functions}

`;
    }
  }

  return `## Task
Generate unit tests for the following code changes.

## Changed Code
\`\`\`${language}
${diffContent}
\`\`\`

## Full File Context
\`\`\`${language}
${fullFileContent}
\`\`\`

${analysisSection}## Existing Tests (if any)
${existingTests || 'No existing tests found'}

## Requirements
1. Framework: ${frameworkInfo}
2. Cover all new/modified functions
3. Include edge cases for: null, undefined, empty values, boundary conditions
4. Add TODO comments where you're uncertain about expected values
5. Mock external dependencies using ${framework === 'vitest' ? 'vi.mock()' : 'jest.mock()'}
6. Use descriptive test names following the pattern: "should [expected behavior] when [condition]"

## Output Format
Return ONLY the test file content, no explanations. Use TypeScript.
Start with the necessary imports.
Group related tests in describe blocks.
Each test should be in an it() block.`;
}

