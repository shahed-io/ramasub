import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Lovable AI Gateway provider factory.
 * Read LOVABLE_API_KEY inside the server function/route handler and pass it here.
 */
export function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}
