interface CacheEntry {
  prompt: string;
  response: string;
  timestamp: number;
  usageCount: number;
  lastUsed: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  memoryUsage: number;
  entries: number;
}

export class PromptCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private defaultTtl: number;
  private stats: CacheStats;

  constructor(maxSize: number = 1000, defaultTtl: number = 30 * 60 * 1000) { // 30 minuter
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      memoryUsage: 0,
      entries: 0
    };
    
    // Cleanup varje timme
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Generera cache key från prompt
   */
  private generateKey(prompt: string, context: string): string {
    // Normalisera prompt för cache
    const normalized = prompt
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    
    // Skapa hash (enkel implementation)
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `${context}_${hash}_${normalized.length}`;
  }

  /**
   * Hämta från cache
   */
  get(prompt: string, context: string): string | null {
    const key = this.generateKey(prompt, context);
    const entry = this.cache.get(key);
    
    this.stats.totalRequests++;
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Kontrollera TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Uppdatera usage
    entry.usageCount++;
    entry.lastUsed = Date.now();
    
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.response;
  }

  /**
   * Spara till cache
   */
  set(prompt: string, response: string, context: string, ttl?: number): void {
    const key = this.generateKey(prompt, context);
    
    // Kontrollera om vi behöver evicta
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastUsed();
    }
    
    const entry: CacheEntry = {
      prompt,
      response,
      timestamp: Date.now(),
      usageCount: 1,
      lastUsed: Date.now(),
      ttl: ttl || this.defaultTtl
    };
    
    this.cache.set(key, entry);
    this.updateMemoryUsage();
  }

  /**
   * Evicta minst använda entry
   */
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null;
    let leastUsedEntry: CacheEntry | null = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!leastUsedEntry || 
          entry.usageCount < leastUsedEntry.usageCount ||
          (entry.usageCount === leastUsedEntry.usageCount && entry.lastUsed < leastUsedEntry.lastUsed)) {
        leastUsedKey = key;
        leastUsedEntry = entry;
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  /**
   * Rensa utgångna entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    
    this.updateMemoryUsage();
  }

  /**
   * Uppdatera hit rate
   */
  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.hits / this.stats.totalRequests 
      : 0;
  }

  /**
   * Uppdatera memory usage
   */
  private updateMemoryUsage(): void {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += entry.prompt.length + entry.response.length + 200; // 200 bytes overhead
    }
    
    this.stats.memoryUsage = totalSize;
    this.stats.entries = this.cache.size;
  }

  /**
   * Hämta cache statistik
   */
  getStats(): CacheStats {
    this.updateMemoryUsage();
    return { ...this.stats };
  }

  /**
   * Rensa cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      memoryUsage: 0,
      entries: 0
    };
  }

  /**
   * Preload vanliga prompts
   */
  async preloadCommonPrompts(): Promise<void> {
    const commonPrompts = [
      {
        prompt: 'Generera Hemnet text för lägenhet',
        context: 'hemnet',
        response: 'Storgatan 12, 3 tr, Stockholm. Trea om 76 kvm med balkong i västerläge.'
      },
      {
        prompt: 'Generera Booli text för villa',
        context: 'booli',
        response: 'Villagatan 1, Malmö. Fräscht fristående hus om 150 kvm med trädgård.'
      }
    ];

    for (const { prompt, response, context } of commonPrompts) {
      this.set(prompt, response, context, 60 * 60 * 1000); // 1 timme TTL
    }
  }

  /**
   * Exportera cache för backup
   */
  export(): Array<{ key: string; entry: CacheEntry }> {
    const entries: Array<{ key: string; entry: CacheEntry }> = [];
    
    for (const [key, entry] of this.cache.entries()) {
      entries.push({ key, entry });
    }
    
    return entries;
  }

  /**
   * Importera cache från backup
   */
  import(entries: Array<{ key: string; entry: CacheEntry }>): void {
    this.clear();
    
    for (const { key, entry } of entries) {
      // Kontrollera om entry är fortfarande giltig
      if (Date.now() - entry.timestamp < entry.ttl) {
        this.cache.set(key, entry);
      }
    }
    
    this.updateMemoryUsage();
  }

  /**
   * Hämta cache insights
   */
  getInsights(): {
    mostUsedPrompts: Array<{ prompt: string; usageCount: number }>;
    averageResponseLength: number;
    cacheEfficiency: string;
  } {
    const entries = Array.from(this.cache.values());
    
    // Mest använda prompts
    const mostUsed = entries
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(entry => ({
        prompt: entry.prompt.substring(0, 100) + (entry.prompt.length > 100 ? '...' : ''),
        usageCount: entry.usageCount
      }));

    // Genomsnittlig responslängd
    const avgLength = entries.length > 0
      ? entries.reduce((sum, entry) => sum + entry.response.length, 0) / entries.length
      : 0;

    // Cache effektivitet
    let efficiency = 'Dålig';
    if (this.stats.hitRate > 0.8) efficiency = 'Utmärkt';
    else if (this.stats.hitRate > 0.6) efficiency = 'Bra';
    else if (this.stats.hitRate > 0.4) efficiency = 'OK';

    return {
      mostUsedPrompts: mostUsed,
      averageResponseLength: Math.round(avgLength),
      cacheEfficiency: efficiency
    };
  }
}

// Global cache instans
export const promptCache = new PromptCache(1000, 30 * 60 * 1000); // 1000 entries, 30 minuter TTL
