import { describe, it, expect } from 'vitest';
import { parseTestResponse, validateTypeScript } from '../../src/ai/parser.js';

describe('parseTestResponse', () => {
  it('should parse clean test code', () => {
    const response = `import { describe, it, expect } from 'vitest';

describe('MyFunction', () => {
  it('should return true', () => {
    expect(true).toBe(true);
  });
});`;

    const result = parseTestResponse(response);

    expect(result.code).toContain("describe('MyFunction'");
    expect(result.imports).toContain('vitest');
  });

  it('should strip markdown code fences', () => {
    const response = `\`\`\`typescript
import { describe, it, expect } from 'vitest';

describe('Test', () => {
  it('works', () => {
    expect(1).toBe(1);
  });
});
\`\`\``;

    const result = parseTestResponse(response);

    expect(result.code).not.toContain('```');
    expect(result.code).toContain("describe('Test'");
  });

  it('should extract TODO comments', () => {
    const response = `import { describe, it, expect } from 'vitest';

describe('MyFunction', () => {
  it('should return expected value', () => {
    // TODO: Verify expected value
    expect(result).toBe(expected);
  });

  it('should handle edge case', () => {
    // TODO: Add assertion
    // TODO: Mock needed
  });
});`;

    const result = parseTestResponse(response);

    expect(result.todos).toHaveLength(3);
    expect(result.todos[0].type).toBe('verify');
    expect(result.todos[1].type).toBe('assertion');
    expect(result.todos[2].type).toBe('mock');
  });

  it('should categorize TODO types correctly', () => {
    const response = `
// TODO: Verify expected value
// TODO: Add assertion
// TODO: Mock needed
// TODO: Integration test
// TODO: Something else`;

    const result = parseTestResponse(response);

    expect(result.todos[0].type).toBe('verify');
    expect(result.todos[1].type).toBe('assertion');
    expect(result.todos[2].type).toBe('mock');
    expect(result.todos[3].type).toBe('integration');
    expect(result.todos[4].type).toBe('other');
  });
});

describe('validateTypeScript', () => {
  it('should validate balanced braces', () => {
    const validCode = `function test() {
  if (true) {
    return 1;
  }
}`;

    const result = validateTypeScript(validCode);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect unbalanced braces', () => {
    const invalidCode = `function test() {
  if (true) {
    return 1;
}`;

    const result = validateTypeScript(invalidCode);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('braces'))).toBe(true);
  });

  it('should detect unbalanced parentheses', () => {
    const invalidCode = `function test(a, b {
  return a + b;
}`;

    const result = validateTypeScript(invalidCode);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('parentheses'))).toBe(true);
  });

  it('should reject empty code', () => {
    const result = validateTypeScript('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Code is empty');
  });
});

