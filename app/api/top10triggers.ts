import { useState } from 'react';

export interface Trigger {
  heading: string;
  description: string;
  fullDescription?: string;
  emotionalTrigger?: string;
  marketImpact?: number;
}

export interface TriggersResult {
  triggers: Trigger[];
  generatedAt: number;
  queryContext: string;
}

export const useGoogleSearchStore = () => {
  const [triggersData, setTriggersData] = useState<TriggersResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateTopTriggers = async (query: string): Promise<TriggersResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

      if (!groqApiKey) {
        throw new Error("Groq API key is missing");
      }

      // Enhanced prompt for more detailed trigger generation
      const context = `You are a world-class marketing strategist and psychological insight expert. 

      For the given search query, generate 10 powerful marketing triggers that go beyond surface-level insights. Each trigger should provide:
      
      1. A crisp, memorable 1-2 word heading
      2. A concise description (20-30 words)
      3. A deeper psychological or emotional trigger
      4. Potential market impact score (0-100)
      
      Requirements:
      - Be innovative and psychologically insightful
      - Connect deeply with human emotions and motivations
      - Provide actionable marketing perspectives
      - Ensure triggers are relevant to the search query
      
      Desired JSON Format:
      {
        "triggers": [
          {
            "heading": "Psychological Trigger Headline",
            "description": "Concise explanation of the trigger's marketing potential",
            "fullDescription": "Extended, nuanced explanation of the psychological mechanism",
            "emotionalTrigger": "Core emotional driver behind the trigger",
            "marketImpact": 75
          }
        ],
        "generatedAt": 1234567890,
        "queryContext": "Original search query context"
      }`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "mixtral-8x7b-32768",
          messages: [
            { role: "system", content: context },
            { 
              role: "user", 
              content: `Generate advanced marketing triggers for: "${query}". 
              Provide deep psychological insights, potential market impact, and innovative marketing strategies.` 
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.8,
          max_tokens: 1200,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const responseData: { choices: Array<{ message: { content: string } }> } = await response.json();
      const content = responseData.choices[0].message.content;

      // Parse and validate the JSON
      const parsedTriggers: TriggersResult = JSON.parse(content);

      // Validate the structure
      if (!parsedTriggers.triggers || !Array.isArray(parsedTriggers.triggers) || parsedTriggers.triggers.length !== 10) {
        throw new Error("Invalid triggers format");
      }

      // Add query context and generation timestamp if not provided
      parsedTriggers.queryContext = query;
      parsedTriggers.generatedAt = Date.now();

      // Update state
      setTriggersData(parsedTriggers);
      setIsLoading(false);

      return parsedTriggers;
    } catch (error) {
      console.error("Error generating triggers:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      setIsLoading(false);
      return null;
    }
  };

  // Clear triggers data
  const clearTriggersData = () => {
    setTriggersData(null);
  };

  return {
    generateTopTriggers,
    triggersData,
    clearTriggersData,
    isLoading,
    error
  };
};

// Utility function for direct trigger fetching
export const fetchTopTriggers = async (query: string): Promise<TriggersResult | null> => {
  const store = useGoogleSearchStore();
  return await store.generateTopTriggers(query);
};
