import { logger } from '../utils/logger.js';

export interface ParsedTestCode {
  code: string;
  todos: TODOComment[];
  imports: string[];
}

export interface TODOComment {
  line: number;
  content: string;
  type: 'verify' | 'assertion' | 'mock' | 'integration' | 'other';
}

/**
 * Parse AI response to extract test code and metadata
 */
export function parseTestResponse(response: string): ParsedTestCode {
  let code = response.trim();

  // Remove markdown code fences
  code = code.replace(/^```(?:typescript|javascript|ts|js)?\n?/gm, '');
  code = code.replace(/\n?```$/gm, '');

  // Extract imports
  const imports = extractImports(code);

  // Extract TODO comments
  const todos = extractTODOs(code);

  // Validate code structure (basic check)
  if (!code.includes('describe') && !code.includes('it(') && !code.includes('test(')) {
    logger.warn('Generated code may not be valid test code - missing describe/it blocks');
  }

  return {
    code,
    todos,
    imports,
  };
}

function extractImports(code: string): string[] {
  const imports: string[] = [];
  const importRegex = /^import\s+.*?from\s+['"](.+?)['"];?$/gm;
  let match;

  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

function extractTODOs(code: string): TODOComment[] {
  const todos: TODOComment[] = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const todoMatch = line.match(/\/\/\s*TODO:?\s*(.+)/i);
    if (todoMatch) {
      const content = todoMatch[1].trim();
      const type = categorizeTODO(content);
      todos.push({
        line: index + 1,
        content,
        type,
      });
    }
  });

  return todos;
}

function categorizeTODO(content: string): TODOComment['type'] {
  const lower = content.toLowerCase();

  if (lower.includes('verify') || lower.includes('expected')) {
    return 'verify';
  }
  if (lower.includes('assertion') || lower.includes('assert')) {
    return 'assertion';
  }
  if (lower.includes('mock') || lower.includes('mocking')) {
    return 'mock';
  }
  if (lower.includes('integration') || lower.includes('real service')) {
    return 'integration';
  }

  return 'other';
}

/**
 * Validate that extracted code is valid TypeScript
 */
export function validateTypeScript(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic validation checks
  if (!code.trim()) {
    errors.push('Code is empty');
  }

  // Check for balanced braces
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
  }

  // Check for balanced parentheses
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

