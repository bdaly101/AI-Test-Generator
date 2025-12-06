import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectFramework } from '../../src/frameworks/detector.js';
import * as fs from 'fs';

vi.mock('fs');

describe('detectFramework', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return vitest when explicitly specified', async () => {
    const result = await detectFramework('/test', 'vitest');

    expect(result.framework).toBe('vitest');
    expect(result.detected).toBe(true);
  });

  it('should return jest when explicitly specified', async () => {
    const result = await detectFramework('/test', 'jest');

    expect(result.framework).toBe('jest');
    expect(result.detected).toBe(true);
  });

  it('should detect vitest from package.json', async () => {
    vi.mocked(fs.existsSync).mockImplementation((path: any) => {
      return path.toString().includes('package.json');
    });

    vi.mocked(fs.readFileSync).mockImplementation(() =>
      JSON.stringify({
        devDependencies: {
          vitest: '^1.0.0',
        },
      })
    );

    const result = await detectFramework('/test', 'auto');

    expect(result.framework).toBe('vitest');
    expect(result.detected).toBe(true);
  });

  it('should detect jest from package.json', async () => {
    vi.mocked(fs.existsSync).mockImplementation((path: any) => {
      return path.toString().includes('package.json');
    });

    vi.mocked(fs.readFileSync).mockImplementation(() =>
      JSON.stringify({
        devDependencies: {
          jest: '^29.0.0',
        },
      })
    );

    const result = await detectFramework('/test', 'auto');

    expect(result.framework).toBe('jest');
    expect(result.detected).toBe(true);
  });

  it('should default to vitest when neither framework is detected', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await detectFramework('/test', 'auto');

    expect(result.framework).toBe('vitest');
    expect(result.detected).toBe(false);
  });
});

