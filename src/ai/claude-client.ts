import Anthropic from '@anthropic-ai/sdk';

export interface TestGenerationRequest {
  diff: string;
  testFramework: 'vitest' | 'jest';
  includeEdgeFunctionTests: boolean;
}

export interface TestGenerationResponse {
  tests: string;
  reasoning: string;
}

export class ClaudeClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateTests(request: TestGenerationRequest): Promise<TestGenerationResponse> {
    const systemPrompt = this.buildSystemPrompt(request.testFramework, request.includeEdgeFunctionTests);
    const userPrompt = this.buildUserPrompt(request.diff);

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        system: systemPrompt,
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseResponse(content.text);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate tests: ${error.message}`);
      }
      throw error;
    }
  }

  private buildSystemPrompt(testFramework: string, includeEdgeFunctionTests: boolean): string {
    const edgeFunctionNote = includeEdgeFunctionTests
      ? ' Also generate integration tests for Supabase Edge Functions when applicable.'
      : '';

    return `You are an expert test generator. Your task is to analyze code changes from git diffs and generate comprehensive ${testFramework} tests.

Guidelines:
- Generate tests that cover the changed code thoroughly
- Include unit tests for all new functions and methods
- Add edge cases and error scenarios
- Use descriptive test names that explain what is being tested
- Add TODO comments for areas that need manual review${edgeFunctionNote}
- Output only valid ${testFramework} test code
- Use modern ${testFramework} syntax and best practices
- Organize tests logically with describe/test blocks

Format your response as:
REASONING: <brief explanation of test strategy>
---
TESTS:
<the actual test code>`;
  }

  private buildUserPrompt(diff: string): string {
    return `Please generate tests for the following code changes:

\`\`\`diff
${diff}
\`\`\`

Generate comprehensive tests following the guidelines provided.`;
  }

  private parseResponse(response: string): TestGenerationResponse {
    // Split by the separator
    const parts = response.split('---');
    
    let reasoning = '';
    let tests = '';

    if (parts.length >= 2) {
      // Extract reasoning (remove "REASONING:" prefix)
      reasoning = parts[0].replace(/^REASONING:\s*/i, '').trim();
      
      // Extract tests (remove "TESTS:" prefix if present)
      tests = parts[1].replace(/^TESTS:\s*/i, '').trim();
    } else {
      // Fallback: treat entire response as tests
      tests = response.trim();
      reasoning = 'Generated tests based on code changes';
    }

    // Remove markdown code fences if present
    tests = tests.replace(/^```(?:typescript|javascript|ts|js)?\n/gm, '').replace(/\n```$/gm, '');

    return { tests, reasoning };
  }
}
