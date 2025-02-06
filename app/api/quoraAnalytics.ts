interface QuoraAnswer {
  content: string;
  author: {
    name: string;
    surname?: string;
    profile_url: string;
    credentials: string;
    followers?: number;
    profileImage?: string;
  };
  post_url: string;
  upvotes: number;
  comments?: number;
  timestamp: string;
}

interface QuoraAPIResponse {
  data: Array<any>;
  pageInfo?: {
    hasNextPage?: boolean;
    endCursor?: string;
  };
}

interface AnalysisResult {
  success: boolean;
  data?: {
    analysis: string;
    sources: QuoraAnswer[];
    timestamp: string;
  };
  error?: string;
}

export class QuoraAnalysisService {
  private static readonly TIMEOUT = 30000; // 30 seconds timeout
  private static readonly RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
  private static readonly GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

  /**
   * Fetch with timeout wrapper
   */
  private static async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
      }
      throw error;
    }
  }

  /**
   * Main analysis method
   */
  public static async analyzeQuoraData(query: string): Promise<AnalysisResult> {
    try {
      // Validate inputs and API keys
      if (!query.trim()) {
        return { success: false, error: 'Query cannot be empty' };
      }
      
      if (!this.RAPIDAPI_KEY || !this.GROQ_API_KEY) {
        return { success: false, error: 'API keys not configured' };
      }

      // Fetch Quora answers
      const answers = await this.searchQuoraAnswers(query);
      if (answers.length === 0) {
        return { success: false, error: 'No relevant Quora answers found' };
      }

      // Prepare content for analysis
      const relevantContent = answers
        .map((answer) => answer.content.trim())
        .filter(Boolean)
        .join('\n\n');

      if (!relevantContent) {
        return { success: false, error: 'No valid content to analyze' };
      }

      // Generate analysis
      const analysis = await this.generateAnalysis(query, relevantContent);

      return {
        success: true,
        data: {
          analysis,
          sources: answers,
          timestamp: new Date().toISOString(),
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Analysis error:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Search Quora answers
   */
  private static async searchQuoraAnswers(query: string): Promise<QuoraAnswer[]> {
    const url = new URL('https://quora-scraper.p.rapidapi.com/search_answers');
    url.searchParams.append('query', query);
    url.searchParams.append('language', 'en');
    url.searchParams.append('time', 'all_times');

    try {
      const response = await this.fetchWithTimeout(
        url.toString(),
        {
          method: 'GET',
          headers: {
            'x-rapidapi-key': this.RAPIDAPI_KEY || '',
            'x-rapidapi-host': 'quora-scraper.p.rapidapi.com',
          },
        },
        this.TIMEOUT
      );

      if (!response.ok) {
        throw new Error(`Quora API error: ${response.status}`);
      }

      const data: QuoraAPIResponse = await response.json();
      
      if (!data?.data || !Array.isArray(data.data)) {
        throw new Error('Invalid Quora API response format');
      }

      return data.data.map(this.parseQuoraAnswer);

    } catch (error) {
      console.error('Quora search error:', error);
      throw new Error(
        `Failed to fetch Quora answers: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Parse Quora answer
   */
  private static parseQuoraAnswer(item: any): QuoraAnswer {
    return {
      content: QuoraAnalysisService.sanitizeText(item.content || ''),
      author: {
        name: item.author?.name || 'Anonymous',
        surname: item.author?.surname,
        profile_url: item.author?.url || '',
        credentials: String(item.author?.credentials || ''),
        followers: QuoraAnalysisService.parseNumber(item.author?.followers),
        profileImage: item.author?.profileImage,
      },
      post_url: item.url || '',
      upvotes: QuoraAnalysisService.parseNumber(item.upvotes),
      comments: QuoraAnalysisService.parseNumber(item.comments),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate analysis using Groq API
   */
  private static async generateAnalysis(query: string, content: string): Promise<string> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    
    const payload = {
      model: 'mixtral-8x7b-32768',
      messages: [
        {
          role: 'system',
          content: `You are an expert at analyzing Quora discussions. Analyze the following answers about "${query}" focusing on key themes, insights, and patterns.`,
        },
        {
          role: 'user',
          content: content,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    };

    try {
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
        this.TIMEOUT
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          `Groq API error (${response.status}): ${
            errorData ? JSON.stringify(errorData) : response.statusText
          }`
        );
      }

      const data = await response.json();
      const analysis = data?.choices?.[0]?.message?.content;

      if (!analysis) {
        throw new Error('No analysis generated from Groq API');
      }

      return analysis;

    } catch (error) {
      console.error('Groq API error:', error);
      throw new Error(
        `Analysis generation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Utility: Parse number values
   */
  private static parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value.replace(/[^0-9-]/g, ''), 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Utility: Sanitize and truncate text
   */
  private static sanitizeText(text: string, maxLength: number = 1000): string {
    if (!text) return '';
    
    // Remove excess whitespace and normalize
    let sanitized = text
      .replace(/\s+/g, ' ')
      .trim();
    
    // Truncate if necessary
    if (sanitized.length <= maxLength) return sanitized;
    
    const truncated = sanitized.substring(0, maxLength);
    return truncated.substring(0, truncated.lastIndexOf(' ')) + '...';
  }
}

export const fetchAndProcessQuoraData = async (query: string): Promise<AnalysisResult | null> => {
  try {
    // Use the QuoraAnalysisService to analyze the query
    const result = await QuoraAnalysisService.analyzeQuoraData(query);

    // If the analysis was successful, return the result
    if (result.success) {
      return result;
    } else {
      // If the analysis failed, log the error and return null
      console.error('Failed to analyze Quora data:', result.error);
      return null;
    }
  } catch (error) {
    // Handle any unexpected errors
    console.error('Error in fetchAndProcessQuoraData:', error);
    return null;
  }
}
