import { FrameworkAdapter } from './types.js';

export class JestAdapter implements FrameworkAdapter {
  getFrameworkName(): string {
    return 'jest';
  }

  getImports(): string {
    return `import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';`;
  }

  getMockFunction(): string {
    return 'jest.mock';
  }

  getSpyFunction(): string {
    return 'jest.spyOn';
  }

  getMockFn(): string {
    return 'jest.fn';
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
      return `jest.mock('${mockPath}', () => (${implementation}));`;
    }
    return `jest.mock('${mockPath}');`;
  }

  formatSpy(object: string, method: string, implementation?: string): string {
    if (implementation) {
      return `jest.spyOn(${object}, '${method}').mockImplementation(${implementation});`;
    }
    return `jest.spyOn(${object}, '${method}');`;
  }
}

