import { EdgeFunctionAnalysis } from './edge-function.js';

export interface IntegrationTestTemplate {
  generate(analysis: EdgeFunctionAnalysis): string;
}

export class SupabaseIntegrationTemplate implements IntegrationTestTemplate {
  generate(analysis: EdgeFunctionAnalysis): string {
    const { functionName, methods, requiresAuth, dbOperations } = analysis;

    const imports = this.getImports();
    const setup = this.getSetup(functionName);
    const testCases = this.generateTestCases(functionName, methods, requiresAuth, dbOperations);

    return `${imports}

${setup}

${testCases}
`;
  }

  private getImports(): string {
    return `import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';`;
  }

  private getSetup(functionName: string): string {
    return `describe('${functionName} Edge Function', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    // TODO: Environment-specific config
    supabase = createClient(
      process.env.SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_ANON_KEY || 'your-anon-key'
    );
  });

  afterAll(() => {
    // TODO: Cleanup test data if needed
  });`;
  }

  private generateTestCases(
    functionName: string,
    methods: string[],
    requiresAuth: boolean,
    dbOperations: string[]
  ): string {
    const testCases: string[] = [];

    for (const method of methods) {
      testCases.push(this.generateMethodTests(functionName, method, requiresAuth, dbOperations));
    }

    return testCases.join('\n\n') + '\n});';
  }

  private generateMethodTests(
    functionName: string,
    method: string,
    requiresAuth: boolean,
    dbOperations: string[]
  ): string {
    const methodLower = method.toLowerCase();
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);

    let tests = `  describe('${method} requests', () => {`;

    if (requiresAuth) {
      tests += `
    it('should handle authenticated ${methodLower} request', async () => {
      // TODO: Add test data setup
      const response = await supabase.functions.invoke('${functionName}', {
        method: '${method}',
        ${hasBody ? 'body: { /* TODO: Add request body */ },' : ''}
        headers: {
          Authorization: \`Bearer \${process.env.TEST_USER_TOKEN || 'test-token'}\`,
        },
      });

      expect(response.error).toBeNull();
      // TODO: Verify response data
      expect(response.data).toBeDefined();
    });

    it('should reject unauthenticated ${methodLower} request', async () => {
      const response = await supabase.functions.invoke('${functionName}', {
        method: '${method}',
        ${hasBody ? 'body: {},' : ''}
      });

      // TODO: Verify expected error response
      expect(response.error).toBeDefined();
    });`;
    } else {
      tests += `
    it('should handle ${methodLower} request', async () => {
      // TODO: Add test data setup
      const response = await supabase.functions.invoke('${functionName}', {
        method: '${method}',
        ${hasBody ? 'body: { /* TODO: Add request body */ },' : ''}
      });

      expect(response.error).toBeNull();
      // TODO: Verify response data
      expect(response.data).toBeDefined();
    });`;
    }

    if (dbOperations.length > 0) {
      tests += `
    it('should handle ${methodLower} request with database operations', async () => {
      // TODO: Mock database responses
      // TODO: Add test data setup
      const response = await supabase.functions.invoke('${functionName}', {
        method: '${method}',
        ${hasBody ? 'body: { /* TODO: Add request body */ },' : ''}
        ${requiresAuth ? "headers: { Authorization: `Bearer ${process.env.TEST_USER_TOKEN || 'test-token'}` }," : ''}
      });

      expect(response.error).toBeNull();
      // TODO: Verify database operations were performed correctly
      expect(response.data).toBeDefined();
    });`;
    }

    tests += '\n  });';
    return tests;
  }
}

