'use server';

import fs from 'fs';
import path from 'path';


export interface RedditResult {
  title: string;
  subreddit: string;
  snippet: string;
  link?: string;
}

export interface Trend {
  title: string;
  description: string;
  percentage: number;
}

export interface Competitor {
  name: string;
  strength: string;
  score: number;
}

export interface AnalyticsSummary {
  overview: string;
  trends: Trend[];
  competitors: Competitor[];
  opportunities: string[];
}

export const fetchRedditResults = async (
  query: string
): Promise<{ results: RedditResult[]; summary: AnalyticsSummary } | null> => {
  try {
    const redditClientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID;
    const redditClientSecret = process.env.NEXT_PUBLIC_REDDIT_CLIENT_SECRET;
    const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

    if (!redditClientId || !redditClientSecret || !groqApiKey) {
      throw new Error("API keys are missing. Check environment variables.");
    }

    // Fetch Reddit Authentication Token
    const authResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${redditClientId}:${redditClientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      throw new Error(`Reddit Authentication error: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Fetch Reddit Search Results
    const subreddits = ['technology', 'products', 'business', 'marketing'];
    const results: RedditResult[] = [];

    for (const subreddit of subreddits.slice(0, 2)) {
      const searchResponse = await fetch(
        `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&limit=5&sort=relevance&t=year`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'RedditAnalytics/1.0',
          },
        }
      );

      if (!searchResponse.ok) continue;

      const searchData = await searchResponse.json();
      
      const subredditResults = searchData.data.children
        .filter((post: any) => post.data.selftext)
        .map((post: any) => ({
          title: post.data.title || "No title available",
          subreddit: post.data.subreddit || subreddit,
          snippet: post.data.selftext.slice(0, 200) + "...",
          link: post.data.url || "#",
        }));

      results.push(...subredditResults);
    }

    if (results.length === 0) {
      throw new Error("No results found from Reddit Search API.");
    }

    // Groq API Analysis Context
    const context = `You are a social media research specialist. Analyze these Reddit search results and provide a structured analysis in JSON format:
    {
      "overview": "A brief HTML-formatted overview analyzing community discussions and trends",
      "trends": [
        {
          "title": "Community trend or discussion pattern",
          "description": "HTML-formatted description of the trend's significance",
          "percentage": number (0-100 indicating trend strength)
        }
      ],
      "competitors": [
        {
          "name": "Competing brand/community",
          "strength": "HTML-formatted analysis of their social media presence",
          "score": number (0-100 based on discussion impact)
        }
      ],
      "opportunities": [
        "HTML-formatted community engagement or content strategy suggestion"
      ]
    }
    Ensure all text fields contain properly formatted HTML.
    Focus on community sentiment, discussion themes, and engagement strategies.
    Limit to 3 trends, 3 competitors, and 3 opportunities.`;

    const summaryResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          { role: "system", content: context },
          { role: "user", content: JSON.stringify(results.slice(0, 5)) },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!summaryResponse.ok) {
      throw new Error(`Groq API error: ${summaryResponse.status}`);
    }

    const summaryData = await summaryResponse.json();
    const content = summaryData.choices[0].message.content;

    // Validate JSON before parsing
    const summary: AnalyticsSummary = JSON.parse(content);
    return { results, summary };
  } catch (error) {
    console.error("Error in fetchRedditResults:", error);
    return null;
  }
};

export const exportRedditResults = async (query: string) => {
  const redditData = await fetchRedditResults(query);
  if (!redditData) {
    console.error("No data to export.");
    return;
  }

  const filePath = path.join(process.cwd(), `reddit_results_${Date.now()}.json`);
  
  fs.writeFile(filePath, JSON.stringify(redditData, null, 2), (err) => {
    if (err) {
      console.error("Error writing file:", err);
    } else {
      console.log(`Reddit results exported successfully: ${filePath}`);
    }
  });
};
