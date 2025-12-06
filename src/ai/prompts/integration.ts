export interface EdgeFunctionContext {
  functionCode: string;
  functionName: string;
  methods: string[];
  requiresAuth: boolean;
  dbOperations: string[];
  filePath: string;
}

/**
 * Build the prompt for Supabase Edge Function integration test generation
 */
export function buildSupabaseTestPrompt(context: EdgeFunctionContext): string {
  const { functionCode, functionName, methods, requiresAuth, dbOperations } = context;

  const methodsList = methods.length > 0 ? methods.join(', ') : 'GET';
  const authSection = requiresAuth
    ? `- Requires authentication
- Test both authenticated and unauthenticated scenarios`
    : '- No authentication required';

  const dbSection = dbOperations.length > 0
    ? `- Database operations: ${dbOperations.join(', ')}
- Mock database responses for unit tests
- Use real database for integration tests (with test data)`
    : '- No database operations detected';

  return `## Task
Generate integration tests for this Supabase Edge Function.

## Edge Function Code
\`\`\`typescript
${functionCode}
\`\`\`

## Function Analysis
- Name: ${functionName}
- HTTP Methods: ${methodsList}
${authSection}
${dbSection}

## Requirements
1. Test all HTTP methods the function handles
2. Test authenticated and unauthenticated scenarios (if applicable)
3. Test success and error responses
4. Mock database responses where appropriate
5. Add TODO comments for:
   - Test data that needs real values
   - Assertions that need verification
   - Environment-specific configuration

## Output Format
Return a complete test file using Vitest. Include setup/teardown.
Use createClient from @supabase/supabase-js.
Structure tests with describe blocks for each HTTP method.
Include beforeAll/afterAll hooks for Supabase client setup if needed.`;
}

