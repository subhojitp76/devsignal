/**
 * Dual-LLM Service: Supports Google Gemini API and Local Ollama / LM Studio
 * Provides unified interface with timeout protection and robust error reporting.
 */

export async function testLlmConnection(aiConfig) {
  const { provider, geminiApiKey, geminiModel, ollamaBaseUrl, ollamaModel } = aiConfig;

  if (provider === 'gemini') {
    if (!geminiApiKey || geminiApiKey.trim() === '') {
      throw new Error('Gemini API Key is missing. Please enter your API key in AI Config.');
    }
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel || 'gemini-3.8-flash'}:generateContent?key=${geminiApiKey.trim()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with the exact word: CONNECTED' }] }]
        })
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: Failed to connect to Gemini API`);
      }
      return { success: true, message: 'Successfully connected to Google Gemini API!' };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error('Gemini API connection timed out after 10s.');
      throw err;
    }
  } else {
    // Local Ollama / LM Studio
    const baseUrl = (ollamaBaseUrl || 'http://localhost:1234').replace(/\/+$/, '');
    // In browser, route through Vite proxy to eliminate CORS preflight OPTIONS rejection
    const isBrowser = typeof window !== 'undefined' && window.location?.origin;
    const endpoint = isBrowser ? '/api/local-llm/chat/completions' : `${baseUrl}/v1/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-target-url': baseUrl
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: ollamaModel || 'google/gemma-4-12b-qat',
          messages: [{ role: 'user', content: 'Respond with the single word: CONNECTED' }],
          max_tokens: 15
        })
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Local LLM returned HTTP ${response.status}. Make sure your model is loaded.`);
      }

      const data = await response.json().catch(() => ({}));
      const activeModel = data.model || ollamaModel || 'Local Model';
      return { success: true, message: `Successfully connected to Local LLM with model "${activeModel}"!` };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error(`Connection timed out after 10s. Ensure your local server is running at ${baseUrl}`);
      }
      throw new Error(`Cannot reach Local LLM at ${baseUrl}: ${err.message}. Ensure LM Studio (port 1234) or Ollama (port 11434) local server is started.`);
    }
  }
}

/**
 * Fetches the live list of supported, non-deprecated generateContent models directly from Google's API
 */
export async function fetchLiveGeminiModels(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Please enter your Gemini API Key first.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${res.status}: Failed to fetch models`);
    }

    const data = await res.json();
    if (!data.models || !Array.isArray(data.models)) return [];

    // Filter only active text generation models, eliminating embeddings, vision-only, and known deprecated lines
    const activeModels = data.models
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => {
        const id = m.name.replace(/^models\//, '');
        return {
          id,
          name: m.displayName || id,
          description: m.description || ''
        };
      })
      // Purge non-text models and discontinued legacy generations
      .filter(m =>
        !m.id.includes('embedding') &&
        !m.id.includes('aqa') &&
        !m.id.includes('imagen') &&
        !m.id.includes('gemini-1.0') &&
        !m.id.includes('gemini-1.5') &&
        !m.id.includes('gemini-2.0')
      );

    return activeModels;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Fetching models timed out. Please check your network or key.');
    throw err;
  }
}

/**
 * Fetches the live list of models loaded or available in LM Studio / Ollama
 */
export async function fetchLocalModels(baseUrl = 'http://localhost:1234') {
  const cleanUrl = (baseUrl || 'http://localhost:1234').replace(/\/+$/, '');
  const isBrowser = typeof window !== 'undefined' && window.location?.origin;
  const endpoint = isBrowser ? '/api/local-llm/models' : `${cleanUrl}/v1/models`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'x-target-url': cleanUrl
      }
    });
    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Failed to fetch local models from ${cleanUrl}`);
    }
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }
    return data.data.map(m => ({
      id: m.id,
      name: m.id
    }));
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error(`Fetching local models timed out after 6s. Ensure server is active at ${cleanUrl}.`);
    }
    throw err;
  }
}

/**
 * Universal text generation through active LLM provider
 */
export async function generateLlmCompletion({ prompt, systemInstruction = '', aiConfig }) {
  const { provider, geminiApiKey, geminiModel, ollamaBaseUrl, ollamaModel, timeoutSeconds = 90 } = aiConfig;
  const isLocal = provider === 'ollama';
  const effectiveTimeout = timeoutSeconds && timeoutSeconds >= 120 ? timeoutSeconds : (isLocal ? 180 : 45);
  const controller = new AbortController();
  const timeoutMs = effectiveTimeout * 1000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (provider === 'gemini') {
      if (!geminiApiKey) {
        throw new Error('Please configure your Gemini API Key in the AI Settings (top-right gear icon) or switch to Local Ollama.');
      }
      const model = geminiModel || 'gemini-3.8-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey.trim()}`;

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction ? systemInstruction + '\n\n' : ''}${prompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 6000
        }
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(payload)
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const msg = errorJson.error?.message || `Gemini API returned status ${res.status}`;
        throw new Error(msg);
      }

      const data = await res.json();
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textOutput) throw new Error('No response returned from Gemini API.');
      return textOutput;

    } else {
      // Local Ollama / LM Studio
      const baseUrl = (ollamaBaseUrl || 'http://localhost:1234').replace(/\/+$/, '');
      const isBrowser = typeof window !== 'undefined' && window.location?.origin;
      const endpoint = isBrowser ? '/api/local-llm/chat/completions' : `${baseUrl}/v1/chat/completions`;

      const messages = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-target-url': baseUrl
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: ollamaModel || 'google/gemma-4-12b-qat',
          messages,
          temperature: 0.2,
          max_tokens: 26214
        })
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Local LLM error (${res.status}): ${errText || 'Failed to generate completion'}`);
      }

      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      let textOutput = msg?.content;
      if (!textOutput && msg?.reasoning_content) {
        textOutput = msg.reasoning_content;
      }
      // If reasoning model wrapped thinking tags, extract content after thinking tags
      if (textOutput && textOutput.includes('</think>')) {
        const parts = textOutput.split('</think>');
        const afterThink = parts[parts.length - 1].trim();
        if (afterThink) {
          textOutput = afterThink;
        }
      }
      if (!textOutput) throw new Error('No content returned from Local LLM.');
      return textOutput;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutSeconds}s. Try increasing timeout in AI Config or switching models.`);
    }
    throw error;
  }
}
