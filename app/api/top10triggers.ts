import { useState } from 'react';
import { fetchGoogleResults } from '@/app/api/googleAnalyticsApi';
import { fetchRedditResults } from '@/app/api/redditAnalysis';
import { fetchAndProcessQuoraData } from '@/app/api/quoraAnalytics';


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

export const useTriggerStore = () => {
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

      // Fetch responses from all three sources
      const [googleResults, redditResults, otherResults] = await Promise.all([
        fetchGoogleResults(query),
        fetchRedditResults(query),
        fetchAndProcessQuoraData(query),
      ]);

      if (!googleResults || !redditResults || !otherResults) {
        throw new Error("One or more data sources failed to fetch results.");
      }

      // Combine all results into a single content structure
      const combinedResults = {
        google: googleResults,
        reddit: redditResults,
        other: otherResults,
      };

      // Enhanced prompt for trigger generation
      const context = `You are a world-class marketing strategist and psychological insight expert. 

      Using the provided data from Google, Reddit, and other sources, generate 10 powerful marketing triggers that go beyond surface-level insights. Each trigger should provide:
      
      1. A crisp, memorable 1-2 word heading
      2. A concise description (20-30 words)
      3. A deeper psychological or emotional trigger
      4. Potential market impact score (0-100)
      
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
              content: `Generate advanced marketing triggers based on the following data: ${JSON.stringify(combinedResults)}. 
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

      if (!parsedTriggers.triggers || !Array.isArray(parsedTriggers.triggers) || parsedTriggers.triggers.length !== 10) {
        throw new Error("Invalid triggers format");
      }

      parsedTriggers.queryContext = query;
      parsedTriggers.generatedAt = Date.now();

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

export const fetchTopTriggers = async (query: string): Promise<TriggersResult | null> => {
  const store = useTriggerStore();
  return await store.generateTopTriggers(query);
};
