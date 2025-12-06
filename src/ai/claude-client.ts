import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

export interface TestGenerationRequest {
  diff: string;
  testFramework: 'vitest' | 'jest';
  includeEdgeFunctionTests: boolean;
  systemPrompt?: string;
  userPrompt?: string;
}

export interface TestGenerationResponse {
  tests: string;
  reasoning: string;
}

export interface ClaudeClientOptions {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  retryDelay?: number;
  maxTokens?: number;
  temperature?: number;
}

export class ClaudeClient {
  private client: Anthropic;
  private model: string;
  private maxRetries: number;
  private retryDelay: number;
  private maxTokens: number;
  private temperature: number;

  constructor(options: ClaudeClientOptions) {
    if (!options.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model || 'claude-3-5-sonnet-20241022';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.maxTokens = options.maxTokens || 4096;
    this.temperature = options.temperature ?? 0.3;
  }

  async generateTests(request: TestGenerationRequest): Promise<TestGenerationResponse> {
    const systemPrompt = request.systemPrompt || this.buildSystemPrompt(request.testFramework, request.includeEdgeFunctionTests);
    const userPrompt = request.userPrompt || this.buildUserPrompt(request.diff);

    return this.executeWithRetry(async () => {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
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
    });
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a rate limit error
        const isRateLimit = this.isRateLimitError(lastError);
        const isRetryable = this.isRetryableError(lastError);

        if (!isRetryable || attempt === this.maxRetries) {
          throw lastError;
        }

        // Calculate exponential backoff delay
        const delay = isRateLimit
          ? this.retryDelay * Math.pow(2, attempt) * 2 // Longer delay for rate limits
          : this.retryDelay * Math.pow(2, attempt);

        logger.warn(
          `Request failed (attempt ${attempt + 1}/${this.maxRetries + 1}): ${lastError.message}. Retrying in ${delay}ms...`
        );

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Unknown error occurred');
  }

  private isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('too many requests')
    );
  }

  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      this.isRateLimitError(error) ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
