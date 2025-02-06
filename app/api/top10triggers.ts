// app/api/top10triggers.ts

import { NextRequest, NextResponse } from 'next/server';
import { QuoraAnalysisService } from './quoraAnalytics';
import { fetchRedditResults } from './redditAnalysis';
import { fetchGoogleAnalytics } from './googleAnalyticsApi';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: 'API key is missing' },
        { status: 500 }
      );
    }

    // Fetch data from all sources concurrently
    const [quoraData, redditData, gaData] = await Promise.all([
      QuoraAnalysisService.analyzeQuoraData(query),
      fetchRedditResults(query),
      fetchGoogleAnalytics(query)
    ]);

    // Prepare the context for analysis
    const context = `You are a world-class marketing strategist and psychological insight expert. 

    Analyze these data sources to generate comprehensive marketing triggers:

    QUORA INSIGHTS:
    ${quoraData.data?.analysis || ''}

    REDDIT INSIGHTS:
    ${JSON.stringify(redditData?.summary || {})}

    GOOGLE ANALYTICS INSIGHTS:
    ${JSON.stringify(gaData || {})}

    Generate 10 powerful marketing triggers that synthesize insights from all sources. Each trigger should:
    
    1. Have a crisp, memorable 1-2 word heading
    2. Include a concise description (20-30 words)
    3. Identify the deeper psychological or emotional trigger
    4. Provide a market impact score (0-100)
    5. List contributing data sources
    6. Include a confidence score (0-100) based on cross-source validation
    
    Requirements:
    - Synthesize insights from all available sources
    - Prioritize triggers supported by multiple sources
    - Focus on actionable psychological insights
    - Consider both quantitative metrics and qualitative feedback
    
    Return in JSON format:
    {
      "triggers": [
        {
          "heading": "Trigger Name",
          "description": "Concise trigger description",
          "fullDescription": "Detailed explanation with source-specific insights",
          "emotionalTrigger": "Core emotional driver",
          "marketImpact": 75,
          "sources": ["Quora", "Reddit", "GoogleAnalytics"],
          "confidence": 85
        }
      ],
      "sourceSummaries": {
        "quora": "Key insights summary",
        "reddit": "Key insights summary",
        "googleAnalytics": "Key metrics summary"
      }
    }`;

    // Generate combined analysis using Groq
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
            content: `Generate marketing triggers for: "${query}" by analyzing all provided data sources.` 
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const analysisData = await response.json();
    const content = JSON.parse(analysisData.choices[0].message.content);

    return NextResponse.json({
      success: true,
      data: {
        ...content,
        generatedAt: Date.now(),
        queryContext: query
      }
    });

  } catch (error) {
    console.error("Top triggers analysis error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
