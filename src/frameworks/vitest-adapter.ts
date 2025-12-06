import { FrameworkAdapter } from './types.js';

export class VitestAdapter implements FrameworkAdapter {
  getFrameworkName(): string {
    return 'vitest';
  }

  getImports(): string {
    return `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';`;
  }

  getMockFunction(): string {
    return 'vi.mock';
  }

  getSpyFunction(): string {
    return 'vi.spyOn';
  }

  getMockFn(): string {
    return 'vi.fn';
  }

  getTestStructure(describeName: string, tests: string[]): string {
    return `describe('${describeName}', () => {
${tests.map(test => `  ${test}`).join('\n\n')}
});`;
  }

  getTestTemplate(testName: string, testBody: string): string {
    return `it('${testName}', () => {
    ${testBody}
  });`;
  }

  getAsyncTestTemplate(testName: string, testBody: string): string {
    return `it('${testName}', async () => {
    ${testBody}
  });`;
  }

  getBeforeEachHook(body: string): string {
    return `beforeEach(() => {
    ${body}
  });`;
  }

  getAfterEachHook(body: string): string {
    return `afterEach(() => {
    ${body}
  });`;
  }

  getBeforeAllHook(body: string): string {
    return `beforeAll(() => {
    ${body}
  });`;
  }

  getAfterAllHook(body: string): string {
    return `afterAll(() => {
    ${body}
  });`;
  }

  formatMock(mockPath: string, implementation?: string): string {
    if (implementation) {
      return `vi.mock('${mockPath}', () => (${implementation}));`;
    }
    return `vi.mock('${mockPath}');`;
  }

  formatSpy(object: string, method: string, implementation?: string): string {
    if (implementation) {
      return `vi.spyOn(${object}, '${method}').mockImplementation(${implementation});`;
    }
    return `vi.spyOn(${object}, '${method}');`;
  }
}

