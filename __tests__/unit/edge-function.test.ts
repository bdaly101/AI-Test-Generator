import { describe, it, expect, vi } from 'vitest';
import { EdgeFunctionDetector } from '../../src/supabase/edge-function.js';

vi.mock('../../src/utils/fs.js', () => ({
  readFile: vi.fn((path) => {
    if (path.includes('edge-function')) {
      return `
import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  if (req.method === 'GET') {
    const { data } = await supabase.from('users').select('*');
    return new Response(JSON.stringify(data));
  }

  if (req.method === 'POST') {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }
    const body = await req.json();
    await supabase.from('users').insert(body);
    return new Response('OK');
  }
});
`;
    }
    return '';
  }),
}));

describe('EdgeFunctionDetector', () => {
  let detector: EdgeFunctionDetector;

  beforeEach(() => {
    detector = new EdgeFunctionDetector();
  });

  describe('analyze', () => {
    it('should detect Supabase Edge Function from path', () => {
      const result = detector.analyze('supabase/functions/my-function/index.ts');

      expect(result.isEdgeFunction).toBe(true);
      expect(result.functionName).toBe('my-function');
    });

    it('should detect HTTP methods', () => {
      const result = detector.analyze('edge-function.ts');

      expect(result.methods).toContain('GET');
      expect(result.methods).toContain('POST');
    });

    it('should detect authentication requirements', () => {
      const result = detector.analyze('edge-function.ts');

      expect(result.requiresAuth).toBe(true);
    });

    it('should detect database operations', () => {
      const result = detector.analyze('edge-function.ts');

      expect(result.dbOperations).toContain('select');
      expect(result.dbOperations).toContain('insert');
    });

    it('should return false for non-edge functions', () => {
      const content = `export function hello() { return 'world'; }`;
      const result = detector.analyze('src/utils.ts', content);

      expect(result.isEdgeFunction).toBe(false);
    });
  });
});

