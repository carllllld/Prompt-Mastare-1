import OpenAI from 'openai';

interface OptimizationMetrics {
  promptLength: number;
  responseTime: number;
  tokenCount: number;
  successRate: number;
  qualityScore: number;
  costPerRequest: number;
}

interface OptimizationResult {
  optimizedPrompt: string;
  metrics: OptimizationMetrics;
  improvements: string[];
  costSavings: number;
  performanceGain: number;
}

export class AIPipelineOptimizer {
  private openai: OpenAI;
  private metrics: Map<string, OptimizationMetrics[]> = new Map();
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Optimera AI prompts för maximal prestanda
   */
  async optimizePrompt(prompt: string, context: 'hemnet' | 'booli'): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    // Analysera nuvarande prompt
    const currentMetrics = this.analyzePrompt(prompt);
    
    // Generera optimerad version
    const optimizedPrompt = await this.generateOptimizedPrompt(prompt, context);
    
    // Mät prestanda
    const optimizedMetrics = await this.measurePerformance(optimizedPrompt, context);
    
    // Beräkna förbättringar
    const improvements = this.identifyImprovements(currentMetrics, optimizedMetrics);
    const costSavings = this.calculateCostSavings(currentMetrics, optimizedMetrics);
    const performanceGain = this.calculatePerformanceGain(currentMetrics, optimizedMetrics);
    
    // Spara metrics
    this.saveMetrics(context, optimizedMetrics);
    
    return {
      optimizedPrompt,
      metrics: optimizedMetrics,
      improvements,
      costSavings,
      performanceGain
    };
  }

  /**
   * Analysera prompt egenskaper
   */
  private analyzePrompt(prompt: string): OptimizationMetrics {
    return {
      promptLength: prompt.length,
      responseTime: 0, // Mäts senare
      tokenCount: this.estimateTokenCount(prompt),
      successRate: 0, // Mäts senare
      qualityScore: 0, // Mäts senare
      costPerRequest: this.calculateCost(prompt)
    };
  }

  /**
   * Generera optimerad prompt
   */
  private async generateOptimizedPrompt(originalPrompt: string, context: 'hemnet' | 'booli'): Promise<string> {
    const optimizationPrompt = `
Optimera följande AI prompt för ${context === 'hemnet' ? 'Hemnet' : 'Booli'}:

MÅL:
1. Minska längd med 30-50%
2. Behåll alla regler och instruktioner
3. Förbättra AI compliance
4. Minska token usage

ORIGINAL PROMPT:
${originalPrompt}

OPTIMERA:
1. Kondensera till kärninstruktioner
2. Gruppera relaterade regler
3. Använd "sandwich technique" (viktiga regler först och sist)
4. Ta bort onödig upprepning
5. Använd korta, direkta kommandon

Returnera ENDAST den optimerade prompten, ingen extra text.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: optimizationPrompt }],
        temperature: 0.1,
        max_tokens: 1000
      });

      return response.choices[0]?.message?.content || originalPrompt;
    } catch (error) {
      console.error('Failed to optimize prompt:', error);
      return originalPrompt;
    }
  }

  /**
   * Mät prestanda för optimerad prompt
   */
  private async measurePerformance(prompt: string, context: 'hemnet' | 'booli'): Promise<OptimizationMetrics> {
    const startTime = Date.now();
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.25,
        max_tokens: 800
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        promptLength: prompt.length,
        responseTime,
        tokenCount: response.usage?.total_tokens || 0,
        successRate: 1.0,
        qualityScore: this.calculateQualityScore(response.choices[0]?.message?.content || ''),
        costPerRequest: this.calculateCost(prompt)
      };
    } catch (error) {
      const endTime = Date.now();
      
      return {
        promptLength: prompt.length,
        responseTime: endTime - startTime,
        tokenCount: 0,
        successRate: 0.0,
        qualityScore: 0.0,
        costPerRequest: this.calculateCost(prompt)
      };
    }
  }

  /**
   * Identifiera förbättringar
   */
  private identifyImprovements(current: OptimizationMetrics, optimized: OptimizationMetrics): string[] {
    const improvements: string[] = [];
    
    if (optimized.promptLength < current.promptLength) {
      const reduction = ((current.promptLength - optimized.promptLength) / current.promptLength * 100).toFixed(1);
      improvements.push(`Promptlängd minskad med ${reduction}%`);
    }
    
    if (optimized.responseTime < current.responseTime) {
      const improvement = ((current.responseTime - optimized.responseTime) / current.responseTime * 100).toFixed(1);
      improvements.push(`Svarstid förbättrad med ${improvement}%`);
    }
    
    if (optimized.tokenCount < current.tokenCount) {
      const reduction = ((current.tokenCount - optimized.tokenCount) / current.tokenCount * 100).toFixed(1);
      improvements.push(`Token usage minskad med ${reduction}%`);
    }
    
    if (optimized.qualityScore > current.qualityScore) {
      const improvement = ((optimized.qualityScore - current.qualityScore) / current.qualityScore * 100).toFixed(1);
      improvements.push(`Kvalitetsscore förbättrad med ${improvement}%`);
    }
    
    return improvements;
  }

  /**
   * Beräkna kostnadsbesparingar
   */
  private calculateCostSavings(current: OptimizationMetrics, optimized: OptimizationMetrics): number {
    const currentCost = current.costPerRequest;
    const optimizedCost = optimized.costPerRequest;
    return ((currentCost - optimizedCost) / currentCost * 100);
  }

  /**
   * Beräkna prestandavinst
   */
  private calculatePerformanceGain(current: OptimizationMetrics, optimized: OptimizationMetrics): number {
    const timeImprovement = (current.responseTime - optimized.responseTime) / current.responseTime;
    const qualityImprovement = (optimized.qualityScore - current.qualityScore) / Math.max(current.qualityScore, 0.1);
    const successImprovement = (optimized.successRate - current.successRate) / Math.max(current.successRate, 0.1);
    
    return ((timeImprovement + qualityImprovement + successImprovement) / 3) * 100;
  }

  /**
   * Uppskapa token count
   */
  private estimateTokenCount(text: string): number {
    // Grov uppskattning: 1 token ≈ 4 tecken
    return Math.ceil(text.length / 4);
  }

  /**
   * Beräkna kostnad
   */
  private calculateCost(prompt: string): number {
    const inputTokens = this.estimateTokenCount(prompt);
    const outputTokens = 400; // Uppskattad output
    
    // GPT-4 priser (uppdaterade 2024)
    const inputCost = (inputTokens / 1000) * 0.03; // $0.03 per 1K input tokens
    const outputCost = (outputTokens / 1000) * 0.06; // $0.06 per 1K output tokens
    
    return inputCost + outputCost;
  }

  /**
   * Beräkna kvalitetsscore
   */
  private calculateQualityScore(response: string): number {
    let score = 0.5; // Baseline
    
    // Positiva indikatorer
    if (response.length > 50 && response.length < 500) score += 0.1;
    if (/^\d+\s+[A-ZÅÄÖa-zåäö]+/.test(response)) score += 0.1; // Börjar med adress
    if (!/(Välkommen|erbjuder|fantastisk|perfekt)/.test(response)) score += 0.1;
    if (/\d+\s*kvm/.test(response)) score += 0.1;
    if (response.split('.').length >= 2 && response.split('.').length <= 5) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  /**
   * Spara metrics för analys
   */
  private saveMetrics(context: string, metrics: OptimizationMetrics): void {
    if (!this.metrics.has(context)) {
      this.metrics.set(context, []);
    }
    
    const contextMetrics = this.metrics.get(context)!;
    contextMetrics.push(metrics);
    
    // Behåll bara senaste 100 mätningar
    if (contextMetrics.length > 100) {
      contextMetrics.shift();
    }
  }

  /**
   * Hämta prestanda-statistik
   */
  getPerformanceStats(context: 'hemnet' | 'booli'): {
    avgResponseTime: number;
    avgTokenCount: number;
    avgCost: number;
    successRate: number;
    totalRequests: number;
  } | null {
    const contextMetrics = this.metrics.get(context);
    if (!contextMetrics || contextMetrics.length === 0) {
      return null;
    }

    const totalRequests = contextMetrics.length;
    const avgResponseTime = contextMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const avgTokenCount = contextMetrics.reduce((sum, m) => sum + m.tokenCount, 0) / totalRequests;
    const avgCost = contextMetrics.reduce((sum, m) => sum + m.costPerRequest, 0) / totalRequests;
    const successRate = contextMetrics.reduce((sum, m) => sum + m.successRate, 0) / totalRequests;

    return {
      avgResponseTime,
      avgTokenCount,
      avgCost,
      successRate,
      totalRequests
    };
  }

  /**
   * Batch-optimera flera prompts
   */
  async batchOptimize(prompts: Array<{ prompt: string; context: 'hemnet' | 'booli' }>): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];
    
    // Processa parallellt för snabbhet
    const promises = prompts.map(({ prompt, context }) => 
      this.optimizePrompt(prompt, context)
    );
    
    try {
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    } catch (error) {
      console.error('Batch optimization failed:', error);
      
      // Fallback till sekventiell processing
      for (const { prompt, context } of prompts) {
        try {
          const result = await this.optimizePrompt(prompt, context);
          results.push(result);
        } catch (err) {
          console.error('Failed to optimize prompt:', err);
        }
      }
    }
    
    return results;
  }

  /**
   * Generera prestandarapport
   */
  generatePerformanceReport(): string {
    const hemnetStats = this.getPerformanceStats('hemnet');
    const booliStats = this.getPerformanceStats('booli');
    
    let report = '# AI Pipeline Prestandarapport\n\n';
    
    if (hemnetStats) {
      report += '## Hemnet Statistik\n';
      report += `- Genomsnittlig svarstid: ${hemnetStats.avgResponseTime.toFixed(0)}ms\n`;
      report += `- Genomsnittlig token count: ${hemnetStats.avgTokenCount.toFixed(0)}\n`;
      report += `- Genomsnittlig kostnad: $${hemnetStats.avgCost.toFixed(4)}\n`;
      report += `- Success rate: ${(hemnetStats.successRate * 100).toFixed(1)}%\n`;
      report += `- Total requests: ${hemnetStats.totalRequests}\n\n`;
    }
    
    if (booliStats) {
      report += '## Booli Statistik\n';
      report += `- Genomsnittlig svarstid: ${booliStats.avgResponseTime.toFixed(0)}ms\n`;
      report += `- Genomsnittlig token count: ${booliStats.avgTokenCount.toFixed(0)}\n`;
      report += `- Genomsnittlig kostnad: $${booliStats.avgCost.toFixed(4)}\n`;
      report += `- Success rate: ${(booliStats.successRate * 100).toFixed(1)}%\n`;
      report += `- Total requests: ${booliStats.totalRequests}\n\n`;
    }
    
    const totalCost = (hemnetStats?.avgCost || 0) * (hemnetStats?.totalRequests || 0) + 
                     (booliStats?.avgCost || 0) * (booliStats?.totalRequests || 0);
    
    report += `## Total Kostnad\n`;
    report += `$${totalCost.toFixed(2)} för ${(hemnetStats?.totalRequests || 0) + (booliStats?.totalRequests || 0)} requests\n`;
    
    return report;
  }
}
