import { parseJsonResponse, getClient, complete } from '../client';

// Mock @google/generative-ai before import
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn().mockResolvedValue({
    response: {
      text: () => '{"key": "value"}',
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
      },
    },
  });

  const mockGetGenerativeModel = jest.fn().mockReturnValue({
    generateContent: mockGenerateContent,
  });

  function MockGoogleGenerativeAI() {
    return { getGenerativeModel: mockGetGenerativeModel };
  }

  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    __mockGetGenerativeModel: mockGetGenerativeModel,
    __mockGenerateContent: mockGenerateContent,
  };
});

describe('parseJsonResponse', () => {
  it('parses clean JSON string', () => {
    const result = parseJsonResponse<{ name: string }>('{"name": "test"}');
    expect(result).toEqual({ name: 'test' });
  });

  it('strips ```json fenced code blocks', () => {
    const input = '```json\n{"count": 42}\n```';
    const result = parseJsonResponse<{ count: number }>(input);
    expect(result).toEqual({ count: 42 });
  });

  it('strips ``` fenced code blocks without language tag', () => {
    const input = '```\n{"items": [1, 2, 3]}\n```';
    const result = parseJsonResponse<{ items: number[] }>(input);
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it('handles whitespace around fenced blocks', () => {
    const input = '  ```json\n  {"ok": true}  \n```  ';
    const result = parseJsonResponse<{ ok: boolean }>(input);
    expect(result).toEqual({ ok: true });
  });

  it('parses JSON with only opening fence (partial fence)', () => {
    // Starts with ``` but no closing -- should still handle the opening
    const input = '```json\n{"partial": true}';
    const result = parseJsonResponse<{ partial: boolean }>(input);
    expect(result).toEqual({ partial: true });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseJsonResponse('not json at all')).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => parseJsonResponse('')).toThrow();
  });

  it('parses nested objects', () => {
    const input = '{"user": {"id": 1, "tags": ["a", "b"]}}';
    const result = parseJsonResponse<{ user: { id: number; tags: string[] } }>(input);
    expect(result.user.id).toBe(1);
    expect(result.user.tags).toEqual(['a', 'b']);
  });
});

describe('getClient', () => {
  it('returns a GoogleGenerativeAI instance', () => {
    const client = getClient();
    expect(client).toBeDefined();
    expect(typeof client.getGenerativeModel).toBe('function');
  });

  it('returns the same singleton on repeated calls', () => {
    const a = getClient();
    const b = getClient();
    expect(a).toBe(b);
  });
});

describe('complete', () => {
  it('returns a structured AICompletionResult', async () => {
    const result = await complete({
      model: 'sonnet',
      systemPrompt: 'You are a test assistant',
      userMessage: 'Hello',
    });

    expect(result).toEqual({
      content: '{"key": "value"}',
      model: 'gemini-2.5-flash',
      inputTokens: 10,
      outputTokens: 5,
      cacheHit: false,
    });
  });

  it('passes correct config to getGenerativeModel', async () => {
    const { __mockGetGenerativeModel } = jest.requireMock('@google/generative-ai');

    await complete({
      model: 'haiku',
      systemPrompt: 'system',
      userMessage: 'user',
      maxTokens: 2048,
    });

    expect(__mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash',
      systemInstruction: 'system',
      generationConfig: {
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });
  });

  it('uses default maxTokens of 4096', async () => {
    const { __mockGetGenerativeModel } = jest.requireMock('@google/generative-ai');

    await complete({
      model: 'sonnet',
      systemPrompt: 'system',
      userMessage: 'user',
    });

    const lastCall = __mockGetGenerativeModel.mock.calls.at(-1)?.[0];
    expect(lastCall.generationConfig.maxOutputTokens).toBe(4096);
  });

  it('handles missing usageMetadata gracefully', async () => {
    const { __mockGenerateContent } = jest.requireMock('@google/generative-ai');
    __mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => '"ok"',
        usageMetadata: undefined,
      },
    });

    const result = await complete({
      model: 'sonnet',
      systemPrompt: 'sys',
      userMessage: 'msg',
    });

    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
  });
});
