/**
 * Interface for test framework adapters
 */
export interface FrameworkAdapter {
  getFrameworkName(): string;
  getImports(): string;
  getMockFunction(): string;
  getSpyFunction(): string;
  getMockFn(): string;
  getTestStructure(describeName: string, tests: string[]): string;
  getTestTemplate(testName: string, testBody: string): string;
  getAsyncTestTemplate(testName: string, testBody: string): string;
  getBeforeEachHook(body: string): string;
  getAfterEachHook(body: string): string;
  getBeforeAllHook(body: string): string;
  getAfterAllHook(body: string): string;
  formatMock(mockPath: string, implementation?: string): string;
  formatSpy(object: string, method: string, implementation?: string): string;
}

