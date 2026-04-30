'use client';

import { useState } from 'react';
import { apiClientFetch } from '@/lib/api-client';

export function useCaseGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'use-cases' | 'test-cases' | 'risks' | 'finalizing' | 'success'>('idle');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);

  const generate = async (file: File | null, instructions?: string) => {
    setIsGenerating(true);
    setError(null);
    setOutput('');
    setPhase('analyzing');
    setProjectId(null);
    setProjectName(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      if (instructions && instructions.trim().length > 0) {
        formData.append('instructions', instructions.trim());
      }

      // Use a controller to prevent indefinite hangs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2-minute timeout

      const response = await apiClientFetch('/api/generate', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('You hit your daily limit, please try again.');
        }

        try {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to generate: ${response.statusText}`);
        } catch {
          throw new Error(`Failed to generate: ${response.statusText}`);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let fullText = '';
      let capturedProjectId: string | null = null;
      let capturedProjectName: string | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          fullText += chunk;
          setOutput(fullText);

          // Parse signals sent by the backend
          if (!capturedProjectId) {
            const idMatch = fullText.match(/SIGNAL:PROJECT_ID:([a-f0-9A-F]{24})/);
            if (idMatch?.[1]) {
              capturedProjectId = idMatch[1];
              setProjectId(capturedProjectId);
            }
          }

          if (!capturedProjectName) {
            const nameMatch = fullText.match(/SIGNAL:PROJECT_NAME:([^\n]+)/);
            if (nameMatch?.[1]) {
              capturedProjectName = nameMatch[1].trim();
              setProjectName(capturedProjectName);
            }
          }

          // Parse error signal sent by the backend
          const errorMatch = fullText.match(/"signal"\s*:\s*"error"[^}]*"message"\s*:\s*"([^"]+)"/);
          if (errorMatch?.[1]) {
            throw new Error(errorMatch[1]);
          }

          // Phase detection based on JSON keys appearing in the stream
          if (fullText.includes('"bugReports"')) {
            setPhase('risks');
          } else if (fullText.includes('"testCases"')) {
            setPhase('test-cases');
          } else if (fullText.includes('"useCases"')) {
            setPhase('use-cases');
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Stream finished — move to finalizing while DB writes complete
      setPhase('finalizing');

      // If we didn't capture a project ID, the generation failed (e.g. rate limit during discovery)
      if (!capturedProjectId) {
        throw new Error("Generation failed: No project was created. You may have hit an API rate limit or the document was invalid.");
      }

      setPhase('success');
    } catch (err: any) {
      let message = 'An unexpected error occurred';
      if (err.name === 'AbortError') {
        message = 'The request timed out. Please try again.';
      } else if (err instanceof Error) {
        message = err.message;
      }

      setError(message);
      setOutput('');
      setPhase('idle');
      console.error('[useCaseGenerator] Error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generate,
    isGenerating,
    output,
    phase,
    error,
    projectId,
    projectName,
  };
}
