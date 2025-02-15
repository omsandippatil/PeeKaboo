'use server';

import fs from 'fs';
import path from 'path';


export interface RedditResult {
  title: string;
  subreddit: string;
  snippet: string;
  link?: string;
  engagement_metrics?: {
    upvote_ratio: number;
    comment_count: number;
    awards: number;
  };
}

export interface PainPoint {
  issue: string;
  frequency: number; // 0-100
  impact_score: number; // 0-100
  verbatim_quotes: string[];
  suggested_solutions: string[];
}

export interface NicheCommunity {
  segment: string;
  demographic_indicators: string[];
  discussion_themes: string[];
  engagement_level: number; // 0-100
  influence_score: number; // 0-100
  key_influencers: string[];
}

export interface SentimentAnalysis {
  overall_sentiment: number; // -100 to 100
  emotional_triggers: {
    trigger: string;
    intensity: number; // 0-100
    context: string;
    activation_phrases: string[];
  }[];
  brand_perception: {
    positive_attributes: string[];
    negative_attributes: string[];
    neutral_observations: string[];
  };
}

export interface MarketingInsight {
  overview: string;
  recurring_pain_points: PainPoint[];
  niche_communities: NicheCommunity[];
  sentiment_analysis: SentimentAnalysis;
  psychographic_insights: {
    motivation_factors: string[];
    decision_drivers: string[];
    adoption_barriers: string[];
  };
  competitive_intelligence: {
    market_positioning: string;
    share_of_voice: number;
    competitive_advantages: string[];
    threat_assessment: string;
  };
}

export const fetchMarketingInsights = async (
  query: string
): Promise<{ results: RedditResult[]; insights: MarketingInsight } | null> => {
  try {
    const redditClientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID;
    const redditClientSecret = process.env.NEXT_PUBLIC_REDDIT_CLIENT_SECRET;
    const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

    if (!redditClientId || !redditClientSecret || !groqApiKey) {
      throw new Error("API keys are missing. Check environment variables.");
    }

    // Reddit Authentication
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

    // Enhanced Reddit Search with Broader Coverage
    const subreddits = [
      'technology', 'products', 'business', 'marketing',
      'startups', 'entrepreneurship', 'productmanagement',
      'B2B', 'SaaS', 'digitalmarketing'
    ];
    const results: RedditResult[] = [];

    for (const subreddit of subreddits.slice(0, 5)) {
      const searchResponse = await fetch(
        `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&limit=20&sort=relevance&t=year`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'MarketingInsights/2.0',
          },
        }
      );

      if (!searchResponse.ok) continue;

      const searchData = await searchResponse.json();
      
      const subredditResults = searchData.data.children
        .filter((post: any) => post.data.selftext)
        .map((post: any) => ({
          title: post.data.title,
          subreddit: post.data.subreddit,
          snippet: post.data.selftext.slice(0, 300) + "...",
          link: post.data.url,
          engagement_metrics: {
            upvote_ratio: post.data.upvote_ratio,
            comment_count: post.data.num_comments,
            awards: post.data.total_awards_received
          }
        }));

      results.push(...subredditResults);
    }

    if (results.length === 0) {
      throw new Error("Insufficient data from Reddit Search API.");
    }

    // Enhanced Groq API Analysis Context
    const context = `You are an advanced market research analyst specializing in digital ethnography and consumer behavior. Analyze these Reddit discussions to provide sophisticated marketing insights in JSON format:
    {
      "overview": "Comprehensive HTML-formatted analysis of market dynamics and consumer behavior patterns",
      "recurring_pain_points": [
        {
          "issue": "Specific pain point identified",
          "frequency": "Occurrence frequency (0-100)",
          "impact_score": "Business impact score (0-100)",
          "verbatim_quotes": ["Direct user quotes illustrating the pain point"],
          "suggested_solutions": ["Actionable recommendations"]
        }
      ],
      "niche_communities": [
        {
          "segment": "Identified market segment",
          "demographic_indicators": ["Observable demographic patterns"],
          "discussion_themes": ["Recurring conversation topics"],
          "engagement_level": "Community participation score (0-100)",
          "influence_score": "Market influence rating (0-100)",
          "key_influencers": ["Notable community members or thought leaders"]
        }
      ],
      "sentiment_analysis": {
        "overall_sentiment": "Aggregate sentiment score (-100 to 100)",
        "emotional_triggers": [
          {
            "trigger": "Identified emotional catalyst",
            "intensity": "Impact strength (0-100)",
            "context": "HTML-formatted situational analysis",
            "activation_phrases": ["Key phrases that activate this emotion"]
          }
        ],
        "brand_perception": {
          "positive_attributes": ["Favorable brand associations"],
          "negative_attributes": ["Areas of concern"],
          "neutral_observations": ["Unbiased market observations"]
        }
      },
      "psychographic_insights": {
        "motivation_factors": ["Key purchasing drivers"],
        "decision_drivers": ["Critical factors in decision making"],
        "adoption_barriers": ["Obstacles to product/service adoption"]
      },
      "competitive_intelligence": {
        "market_positioning": "HTML-formatted competitive landscape analysis",
        "share_of_voice": "Relative market presence (0-100)",
        "competitive_advantages": ["Distinct market advantages"],
        "threat_assessment": "HTML-formatted competitive risk analysis"
      }
    }

    Tiktok is banned in India.
    Give me Creative ideas only, not Generic Ideas.
    And use Complex Marketing Language.
    Ensure detailed HTML formatting for all text fields.
    Focus on actionable insights, psychological factors, and market dynamics.
    Give 6 pain points, 3 niche communities, and 3 emotional triggers.`;

    const insightResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-r1-distill-qwen-32b",
        messages: [
          { role: "system", content: context },
          { role: "user", content: JSON.stringify(results.slice(0, 10)) },
        ],
        temperature: 0.7,
        max_tokens: 4500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!insightResponse.ok) {
      throw new Error(`Groq API error: ${insightResponse.status}`);
    }

    const insightData = await insightResponse.json();
    const insights: MarketingInsight = JSON.parse(insightData.choices[0].message.content);
    return { results, insights };
  } catch (error) {
    console.error("Error in fetchMarketingInsights:", error);
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
