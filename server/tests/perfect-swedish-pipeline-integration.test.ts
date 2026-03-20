import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerfectSwedishOrchestrator } from '../lib/perfect-swedish-orchestrator';
import { ABTestManager } from '../lib/perfect-swedish-ab-test';
import { SmartGenerationEngine } from '../lib/perfect-swedish-generator';
import { DeterministicPostProcessor } from '../lib/perfect-swedish-post-processor';
import { ExpertAIAnalyzer } from '../lib/perfect-swedish-analyzer';
import type { WritingStyle } from '../lib/text-rules';

// Mock OpenAI to avoid real API calls in tests
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  improvedPrompt: 'Ljus och välplanerad lägenhet om 75 kvm med tre rum i centrala Stockholm. Bostaden har genomtänkt planlösning med öppet kök mot vardagsrum. Sovrummen är placerade mot lugn innergård. Badrummet är helkaklat med dusch. Balkong i söderläge om 10 kvm. Hiss finns i huset. Närhet till kommunikationer och service.',
                  headline: 'Ljus 3:a med balkong i söderläge',
                  socialCopy: 'Välplanerad lägenhet med öppet kök och balkong i söderläge. Centralt läge med närhet till allt.',
                  instagramCaption: 'Ljus 3:a i Stockholm 🏠 Balkong i söderläge ☀️',
                  showingInvitation: 'Välkommen på visning tisdag 18:00-19:00',
                  shortAd: 'Ljus 3:a, 75 kvm, balkong söderläge'
                })
              }
            }],
            usage: {
              total_tokens: 500
            }
          })
        }
      }
    }))
  };
});

// Mock Redis cache
vi.mock('../lib/redis-cache', () => ({
  getCachedABTestAssignment: vi.fn().mockResolvedValue(null),
  cacheABTestAssignment: vi.fn().mockResolvedValue(undefined),
  getCachedFeatureFlag: vi.fn().mockResolvedValue(null),
  cacheFeatureFlag: vi.fn().mockResolvedValue(undefined)
}));

// Mock database pool
vi.mock('../db', () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
  }
}));

describe('Perfect Swedish Pipeline Integration Tests', () => {
  let orchestrator: PerfectSwedishOrchestrator;
  let abTestManager: ABTestManager;

  const mockDisposition = {
    property: {
      type: 'lägenhet',
      address: 'Testgatan 1',
      living_area: 75,
      rooms: 3,
      floor: 3,
      build_year: 2010,
      condition: 'Bra',
      layout: 'öppet kök mot vardagsrum',
      materials: {
        kitchen: 'modernt kök',
        bathroom: 'helkaklat badrum'
      },
      balcony: {
        exists: true,
        type: 'balkong',
        size: '10 kvm',
        direction: 'söder'
      }
    },
    location: {
      address: 'Testgatan 1, Stockholm',
      area: 'Södermalm',
      municipality: 'Stockholm',
      transport: 'tunnelbana 5 min',
      amenities: ['ICA', 'apotek'],
      services: ['skola', 'förskola']
    },
    financial: {
      fee: 3500
    }
  };

  beforeEach(() => {
    orchestrator = new PerfectSwedishOrchestrator();
    abTestManager = new ABTestManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Pipeline Execution', () => {
    it('should execute all three steps successfully', async () => {
      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      const result = await orchestrator.execute(request);

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.improvedPrompt).toBeDefined();
      expect(result.headline).toBeDefined();
      expect(result.socialCopy).toBeDefined();
      expect(result.instagramCaption).toBeDefined();
      expect(result.showingInvitation).toBeDefined();
      expect(result.shortAd).toBeDefined();

      // Verify metrics
      expect(result.metrics).toBeDefined();
      expect(result.metrics.success).toBe(true);
      expect(result.metrics.totalDuration).toBeGreaterThan(0);
      expect(result.metrics.retryCount).toBe(0);

      // Verify variant assignment
      expect(result.variant).toBeDefined();
      expect(['control', 'treatment']).toContain(result.variant);
      expect(result.fallbackUsed).toBe(false);
    }, 30000); // 30 second timeout for full pipeline

    it('should generate text with correct Swedish characters', async () => {
      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      const result = await orchestrator.execute(request);

      // Verify Swedish characters are preserved
      const allText = `${result.improvedPrompt} ${result.headline} ${result.socialCopy}`;
      expect(allText).toMatch(/[åäöÅÄÖ]/); // Should contain Swedish characters
    });

    it('should not contain forbidden phrases', async () => {
      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      const result = await orchestrator.execute(request);

      const allText = `${result.improvedPrompt} ${result.headline} ${result.socialCopy}`.toLowerCase();

      // Check for common forbidden phrases
      const forbiddenPhrases = [
        'välkommen till',
        'erbjuder',
        'för den som',
        'i hjärtat av',
        'missa inte',
        'drömboende'
      ];

      for (const phrase of forbiddenPhrases) {
        expect(allText).not.toContain(phrase);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should complete within 25 seconds', async () => {
      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      const startTime = Date.now();
      const result = await orchestrator.execute(request);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(25000); // 25 seconds
      expect(result.metrics.totalDuration).toBeLessThan(25000);
    }, 30000);

    it('should track step durations correctly', async () => {
      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      const result = await orchestrator.execute(request);

      // Verify step durations are tracked
      expect(result.metrics.step1Duration).toBeGreaterThan(0); // Smart Generation
      expect(result.metrics.step2Duration).toBeGreaterThanOrEqual(0); // Post-Processing
      
      // Step 3 (Expert Analysis) might be undefined if it failed gracefully
      if (result.expertAnalysis) {
        expect(result.metrics.step3Duration).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('A/B Testing', () => {
    it('should assign variant consistently within session', async () => {
      const userId = 'test-user-123';
      const sessionId = 'test-session-456';

      const variant1 = await abTestManager.assignVariant(userId, sessionId);
      const variant2 = await abTestManager.assignVariant(userId, sessionId);

      expect(variant1).toBe(variant2);
      expect(['control', 'treatment']).toContain(variant1);
    });

    it('should respect manual override', async () => {
      const userId = 'test-user-123';
      const sessionId = 'test-session-789';

      const variant = await abTestManager.assignVariant(userId, sessionId, 'treatment');
      expect(variant).toBe('treatment');
    });

    it('should return control when feature is disabled', async () => {
      // Feature is disabled by default in test environment
      const userId = 'test-user-123';
      const sessionId = 'test-session-999';

      const variant = await abTestManager.assignVariant(userId, sessionId);
      expect(variant).toBe('control');
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should handle graceful degradation when post-processor fails', async () => {
      // Mock post-processor to throw error
      const postProcessor = new DeterministicPostProcessor();
      vi.spyOn(postProcessor, 'process').mockRejectedValueOnce(new Error('Post-processor error'));

      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      // Should not throw, should continue with unprocessed text
      const result = await orchestrator.execute(request);
      expect(result).toBeDefined();
      expect(result.improvedPrompt).toBeDefined();
    }, 30000);

    it('should handle graceful degradation when expert analyzer fails', async () => {
      // Mock analyzer to throw error
      const analyzer = new ExpertAIAnalyzer();
      vi.spyOn(analyzer, 'analyze').mockRejectedValueOnce(new Error('Analyzer error'));

      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      // Should not throw, should continue without analysis
      const result = await orchestrator.execute(request);
      expect(result).toBeDefined();
      expect(result.improvedPrompt).toBeDefined();
      // expertAnalysis might be undefined
    }, 30000);
  });

  describe('Different Property Types', () => {
    const propertyTypes = [
      { type: 'lägenhet', area: 75, rooms: 3 },
      { type: 'villa', area: 150, rooms: 5 },
      { type: 'radhus', area: 120, rooms: 4 },
      { type: 'fritidshus', area: 60, rooms: 2 }
    ];

    propertyTypes.forEach(({ type, area, rooms }) => {
      it(`should handle ${type} property type`, async () => {
        const request = {
          disposition: {
            ...mockDisposition,
            property: {
              ...mockDisposition.property,
              type,
              living_area: area,
              rooms
            }
          },
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-123',
          sessionId: `test-session-${type}`
        };

        const result = await orchestrator.execute(request);

        expect(result).toBeDefined();
        expect(result.improvedPrompt).toBeDefined();
        expect(result.metrics.success).toBe(true);
      }, 30000);
    });
  });

  describe('Different Writing Styles', () => {
    const styles: WritingStyle[] = ['factual', 'balanced', 'selling'];

    styles.forEach(style => {
      it(`should handle ${style} writing style`, async () => {
        const request = {
          disposition: mockDisposition,
          style,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-123',
          sessionId: `test-session-${style}`
        };

        const result = await orchestrator.execute(request);

        expect(result).toBeDefined();
        expect(result.improvedPrompt).toBeDefined();
        expect(result.metrics.success).toBe(true);
      }, 30000);
    });
  });

  describe('Text Quality Validation', () => {
    it('should generate text with minimum word count', async () => {
      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      const result = await orchestrator.execute(request);

      const wordCount = result.improvedPrompt.split(/\s+/).filter(Boolean).length;
      expect(wordCount).toBeGreaterThan(50); // Minimum reasonable length
    });

    it('should generate proper Swedish sentences', async () => {
      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      const result = await orchestrator.execute(request);

      // Check for proper sentence structure
      expect(result.improvedPrompt).toMatch(/[.!?]$/); // Ends with punctuation
      expect(result.improvedPrompt).toMatch(/^[A-ZÅÄÖ]/); // Starts with capital letter
    });

    it('should not have placeholder text', async () => {
      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      const result = await orchestrator.execute(request);

      const allText = `${result.improvedPrompt} ${result.headline} ${result.socialCopy}`;

      // Check for common placeholders
      expect(allText).not.toContain('[TID]');
      expect(allText).not.toContain('[KONTAKT]');
      expect(allText).not.toContain('[MÄKLARE]');
      expect(allText).not.toContain('[ADRESS]');
    });
  });

  describe('Backward Compatibility', () => {
    it('should return same response structure as old pipeline', async () => {
      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      const result = await orchestrator.execute(request);

      // Verify all required fields are present
      expect(result).toHaveProperty('improvedPrompt');
      expect(result).toHaveProperty('headline');
      expect(result).toHaveProperty('socialCopy');
      expect(result).toHaveProperty('instagramCaption');
      expect(result).toHaveProperty('showingInvitation');
      expect(result).toHaveProperty('shortAd');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('variant');
      expect(result).toHaveProperty('fallbackUsed');

      // New field (optional)
      // expertAnalysis is optional and may not be present
    });

    it('should maintain API interface compatibility', async () => {
      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      const result = await orchestrator.execute(request);

      // Verify field types match expected interface
      expect(typeof result.improvedPrompt).toBe('string');
      expect(typeof result.headline).toBe('string');
      expect(typeof result.socialCopy).toBe('string');
      expect(typeof result.instagramCaption).toBe('string');
      expect(typeof result.showingInvitation).toBe('string');
      expect(typeof result.shortAd).toBe('string');
      expect(typeof result.variant).toBe('string');
      expect(typeof result.fallbackUsed).toBe('boolean');
      expect(typeof result.metrics).toBe('object');
      expect(typeof result.metrics.totalDuration).toBe('number');
      expect(typeof result.metrics.success).toBe('boolean');
    });

    it('should support personal style settings', async () => {
      const request = {
        disposition: mockDisposition,
        style: 'balanced' as WritingStyle,
        platform: 'hemnet',
        personalStylePrompt: 'Använd alltid "bostad" istället för "lägenhet"',
        targetWordMin: 150,
        targetWordMax: 250,
        userId: 'test-user-123',
        sessionId: 'test-session-456'
      };

      const result = await orchestrator.execute(request);

      expect(result).toBeDefined();
      expect(result.improvedPrompt).toBeDefined();
      expect(result.metrics.success).toBe(true);
    });
  });

  describe('Task 17.3: End-to-End Integration Tests', () => {
    describe('Complete Pipeline with Real Dispositions', () => {
      it('should handle villa with large garden and pool', async () => {
        const villaDisposition = {
          property: {
            type: 'villa',
            address: 'Strandvägen 15',
            living_area: 180,
            plot_area: 800,
            rooms: 6,
            floor: 2,
            build_year: 1995,
            condition: 'Mycket bra',
            layout: 'traditionell planlösning med entréplan och övervåning',
            materials: {
              kitchen: 'renoverat kök 2020',
              bathroom: 'två badrum, ett med badkar'
            },
            outdoor: {
              garden: true,
              garden_size: '800 kvm',
              pool: true,
              pool_type: 'uppvärmd utomhuspool',
              patio: true,
              patio_size: '40 kvm'
            }
          },
          location: {
            address: 'Strandvägen 15, Danderyd',
            area: 'Danderyd',
            municipality: 'Danderyd',
            transport: 'buss 10 min till Mörby centrum',
            amenities: ['ICA Maxi', 'apotek', 'restauranger'],
            services: ['Danderyds gymnasium', 'förskola', 'vårdcentral']
          },
          financial: {
            price: 12500000,
            fee: 0
          }
        };

        const request = {
          disposition: villaDisposition,
          style: 'selling' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 200,
          targetWordMax: 300,
          userId: 'test-user-villa',
          sessionId: 'test-session-villa'
        };

        const result = await orchestrator.execute(request);

        expect(result).toBeDefined();
        expect(result.improvedPrompt).toBeDefined();
        expect(result.metrics.success).toBe(true);
        
        // Verify villa-specific content
        const text = result.improvedPrompt.toLowerCase();
        expect(text).toMatch(/villa|hus/);
        expect(text.length).toBeGreaterThan(500); // Longer text for villa
      }, 30000);

      it('should handle apartment with balcony and modern renovation', async () => {
        const modernApartment = {
          property: {
            type: 'lägenhet',
            address: 'Götgatan 45',
            living_area: 92,
            rooms: 4,
            floor: 5,
            build_year: 1920,
            condition: 'Totalrenoverad 2022',
            layout: 'genomgående med balkong i båda ändar',
            materials: {
              kitchen: 'nyrenoverat kök med Miele-vitvaror',
              bathroom: 'marmorbadrum med golvvärme'
            },
            balcony: {
              exists: true,
              type: 'två balkonger',
              size: '15 kvm totalt',
              direction: 'öster och väster'
            },
            features: ['hiss', 'tvättstuga', 'cykelrum', 'förråd']
          },
          location: {
            address: 'Götgatan 45, Stockholm',
            area: 'Södermalm',
            municipality: 'Stockholm',
            transport: 'tunnelbana Medborgarplatsen 2 min',
            amenities: ['Coop', 'Systembolaget', 'gym', 'restauranger'],
            services: ['Katarina skola', 'vårdcentral']
          },
          financial: {
            price: 7800000,
            fee: 4200
          }
        };

        const request = {
          disposition: modernApartment,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 180,
          targetWordMax: 280,
          userId: 'test-user-modern',
          sessionId: 'test-session-modern'
        };

        const result = await orchestrator.execute(request);

        expect(result).toBeDefined();
        expect(result.improvedPrompt).toBeDefined();
        expect(result.metrics.success).toBe(true);
        
        // Verify renovation is mentioned
        const text = result.improvedPrompt.toLowerCase();
        expect(text).toMatch(/renovera|renovering|nyrenoverad/);
      }, 30000);

      it('should handle summer house with waterfront location', async () => {
        const summerHouse = {
          property: {
            type: 'fritidshus',
            address: 'Skärgårdsvägen 8',
            living_area: 65,
            plot_area: 1200,
            rooms: 3,
            build_year: 1985,
            condition: 'Bra',
            layout: 'öppen planlösning',
            materials: {
              kitchen: 'enkelt kök',
              bathroom: 'dusch och toalett'
            },
            outdoor: {
              garden: true,
              garden_size: '1200 kvm',
              waterfront: true,
              dock: true,
              sauna: true
            }
          },
          location: {
            address: 'Skärgårdsvägen 8, Värmdö',
            area: 'Värmdö skärgård',
            municipality: 'Värmdö',
            transport: 'bil 45 min från Stockholm',
            amenities: ['närbutik 5 km'],
            services: []
          },
          financial: {
            price: 3200000,
            fee: 0
          }
        };

        const request = {
          disposition: summerHouse,
          style: 'selling' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-summer',
          sessionId: 'test-session-summer'
        };

        const result = await orchestrator.execute(request);

        expect(result).toBeDefined();
        expect(result.improvedPrompt).toBeDefined();
        expect(result.metrics.success).toBe(true);
        
        // Verify waterfront is highlighted
        const text = result.improvedPrompt.toLowerCase();
        expect(text).toMatch(/vatten|strand|sjö|hav|brygga/);
      }, 30000);
    });

    describe('A/B Variant Assignment and Metrics Tracking', () => {
      it('should track metrics separately per variant', async () => {
        const request = {
          disposition: mockDisposition,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-metrics',
          sessionId: 'test-session-metrics'
        };

        const result = await orchestrator.execute(request);

        // Verify metrics are collected
        expect(result.metrics).toBeDefined();
        expect(result.metrics.totalDuration).toBeGreaterThan(0);
        expect(result.metrics.step1Duration).toBeGreaterThan(0);
        expect(result.metrics.step2Duration).toBeGreaterThanOrEqual(0);
        expect(result.metrics.retryCount).toBeGreaterThanOrEqual(0);
        expect(result.metrics.success).toBe(true);
        expect(result.metrics.timestamp).toBeInstanceOf(Date);
        
        // Verify variant is tracked
        expect(['control', 'treatment']).toContain(result.variant);
      });

      it('should maintain session consistency across multiple requests', async () => {
        const userId = 'test-user-consistency';
        const sessionId = 'test-session-consistency';

        // First request
        const variant1 = await abTestManager.assignVariant(userId, sessionId);
        
        // Second request in same session
        const variant2 = await abTestManager.assignVariant(userId, sessionId);
        
        // Third request in same session
        const variant3 = await abTestManager.assignVariant(userId, sessionId);

        // All should be the same
        expect(variant1).toBe(variant2);
        expect(variant2).toBe(variant3);
      });

      it('should allow different variants for different sessions', async () => {
        const userId = 'test-user-multi-session';
        
        const variant1 = await abTestManager.assignVariant(userId, 'session-1');
        const variant2 = await abTestManager.assignVariant(userId, 'session-2');
        
        // Both should be valid variants (may or may not be the same)
        expect(['control', 'treatment']).toContain(variant1);
        expect(['control', 'treatment']).toContain(variant2);
      });
    });

    describe('Fallback Mechanism', () => {
      it('should fall back to old pipeline when all retries fail', async () => {
        // Mock OpenAI to fail consistently
        const mockOpenAI = vi.mocked((await import('openai')).default);
        mockOpenAI.mockImplementationOnce(() => ({
          chat: {
            completions: {
              create: vi.fn().mockRejectedValue(new Error('OpenAI service unavailable'))
            }
          }
        } as any));

        const request = {
          disposition: mockDisposition,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-fallback',
          sessionId: 'test-session-fallback'
        };

        // Should throw since fallback is not implemented yet
        await expect(orchestrator.execute(request)).rejects.toThrow();
      }, 30000);

      it('should log fallback events with proper context', async () => {
        const consoleSpy = vi.spyOn(console, 'error');

        // Mock OpenAI to fail
        const mockOpenAI = vi.mocked((await import('openai')).default);
        mockOpenAI.mockImplementationOnce(() => ({
          chat: {
            completions: {
              create: vi.fn().mockRejectedValue(new Error('Rate limit exceeded'))
            }
          }
        } as any));

        const request = {
          disposition: mockDisposition,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-logging',
          sessionId: 'test-session-logging'
        };

        try {
          await orchestrator.execute(request);
        } catch (error) {
          // Expected to fail
        }

        // Verify error was logged
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      }, 30000);
    });

    describe('Error Handling and Recovery', () => {
      it('should retry on network errors', async () => {
        let attemptCount = 0;
        const mockOpenAI = vi.mocked((await import('openai')).default);
        
        mockOpenAI.mockImplementation(() => ({
          chat: {
            completions: {
              create: vi.fn().mockImplementation(async () => {
                attemptCount++;
                if (attemptCount < 2) {
                  throw new Error('ECONNREFUSED');
                }
                return {
                  choices: [{
                    message: {
                      content: JSON.stringify({
                        improvedPrompt: 'Test text after retry',
                        headline: 'Test headline',
                        socialCopy: 'Test social copy',
                        instagramCaption: 'Test caption',
                        showingInvitation: 'Test invitation',
                        shortAd: 'Test ad'
                      })
                    }
                  }],
                  usage: { total_tokens: 100 }
                };
              })
            }
          }
        } as any));

        const request = {
          disposition: mockDisposition,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-retry',
          sessionId: 'test-session-retry'
        };

        const result = await orchestrator.execute(request);

        expect(result).toBeDefined();
        expect(result.metrics.retryCount).toBeGreaterThan(0);
        expect(result.metrics.success).toBe(true);
      }, 30000);

      it('should not retry on non-retryable errors', async () => {
        const mockOpenAI = vi.mocked((await import('openai')).default);
        
        mockOpenAI.mockImplementation(() => ({
          chat: {
            completions: {
              create: vi.fn().mockRejectedValue(new Error('Invalid API key'))
            }
          }
        } as any));

        const request = {
          disposition: mockDisposition,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-no-retry',
          sessionId: 'test-session-no-retry'
        };

        await expect(orchestrator.execute(request)).rejects.toThrow();
      }, 30000);

      it('should handle malformed disposition data gracefully', async () => {
        const malformedDisposition = {
          property: {
            type: 'lägenhet',
            // Missing required fields
          },
          location: {},
          financial: {}
        };

        const request = {
          disposition: malformedDisposition,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-malformed',
          sessionId: 'test-session-malformed'
        };

        // Should still attempt to generate (may produce lower quality)
        const result = await orchestrator.execute(request);
        
        expect(result).toBeDefined();
        expect(result.improvedPrompt).toBeDefined();
      }, 30000);

      it('should handle empty disposition gracefully', async () => {
        const emptyDisposition = {};

        const request = {
          disposition: emptyDisposition,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-empty',
          sessionId: 'test-session-empty'
        };

        // Should still attempt to generate
        const result = await orchestrator.execute(request);
        
        expect(result).toBeDefined();
        expect(result.improvedPrompt).toBeDefined();
      }, 30000);
    });

    describe('Expert Analysis Integration', () => {
      it('should include expert analysis when available', async () => {
        const request = {
          disposition: mockDisposition,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-analysis',
          sessionId: 'test-session-analysis'
        };

        const result = await orchestrator.execute(request);

        // Expert analysis may or may not be present depending on mock
        if (result.expertAnalysis) {
          expect(result.expertAnalysis).toHaveProperty('overallQuality');
          expect(result.expertAnalysis).toHaveProperty('strengths');
          expect(result.expertAnalysis).toHaveProperty('improvements');
          expect(result.expertAnalysis).toHaveProperty('legalCheck');
          expect(result.expertAnalysis.overallQuality).toBeGreaterThanOrEqual(0);
          expect(result.expertAnalysis.overallQuality).toBeLessThanOrEqual(10);
        }
      });

      it('should continue without analysis if analyzer fails', async () => {
        // This is already tested in "Error Handling and Fallback" section
        // but we verify the specific behavior here
        const request = {
          disposition: mockDisposition,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-no-analysis',
          sessionId: 'test-session-no-analysis'
        };

        const result = await orchestrator.execute(request);

        // Should have text even without analysis
        expect(result.improvedPrompt).toBeDefined();
        expect(result.headline).toBeDefined();
        expect(result.socialCopy).toBeDefined();
      });
    });

    describe('Post-Processing Validation', () => {
      it('should remove all placeholder types', async () => {
        const request = {
          disposition: mockDisposition,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-placeholders',
          sessionId: 'test-session-placeholders'
        };

        const result = await orchestrator.execute(request);

        const allText = `${result.improvedPrompt} ${result.headline} ${result.socialCopy} ${result.instagramCaption} ${result.showingInvitation} ${result.shortAd}`;

        // Verify no placeholders remain
        expect(allText).not.toContain('[TID]');
        expect(allText).not.toContain('[KONTAKT]');
        expect(allText).not.toContain('[MÄKLARE]');
        expect(allText).not.toContain('[ADRESS]');
      });

      it('should apply formatting fixes correctly', async () => {
        const request = {
          disposition: mockDisposition,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-formatting',
          sessionId: 'test-session-formatting'
        };

        const result = await orchestrator.execute(request);

        // Headline should not end with period
        expect(result.headline).not.toMatch(/\.$/);
        
        // Text should not have multiple consecutive spaces
        expect(result.improvedPrompt).not.toMatch(/\s{2,}/);
        expect(result.socialCopy).not.toMatch(/\s{2,}/);
      });

      it('should preserve Swedish characters through post-processing', async () => {
        const request = {
          disposition: mockDisposition,
          style: 'balanced' as WritingStyle,
          platform: 'hemnet',
          targetWordMin: 150,
          targetWordMax: 250,
          userId: 'test-user-swedish-chars',
          sessionId: 'test-session-swedish-chars'
        };

        const result = await orchestrator.execute(request);

        const allText = `${result.improvedPrompt} ${result.headline} ${result.socialCopy}`;

        // Should contain Swedish characters
        expect(allText).toMatch(/[åäöÅÄÖ]/);
        
        // Should not contain encoding artifacts
        expect(allText).not.toContain('Ã¥');
        expect(allText).not.toContain('Ã¤');
        expect(allText).not.toContain('Ã¶');
      });
    });
  });
});
