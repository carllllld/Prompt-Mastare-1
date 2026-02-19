import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SESSION_SECRET = 'test-secret-key';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.FROM_EMAIL = 'test@example.com';
process.env.APP_URL = 'http://localhost:3000';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock setTimeout/setInterval for consistent testing
global.setTimeout = vi.fn((fn, delay) => {
  return setTimeout(fn, delay);
}) as any;

global.setInterval = vi.fn((fn, delay) => {
  return setInterval(fn, delay);
}) as any;

// Mock Date.now for consistent timestamps
const mockDate = new Date('2024-01-01T00:00:00.000Z');
global.Date = vi.fn(() => mockDate) as any;
global.Date.now = vi.fn(() => mockDate.getTime()) as any;
global.Date.parse = vi.fn((date) => Date.parse(date)) as any;
global.Date.UTC = vi.fn((...args) => Date.UTC(...args)) as any;

// Setup global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    plan: 'free',
    emailVerified: true,
    createdAt: new Date(),
    ...overrides
  }),
  
  createMockPropertyData: (overrides = {}) => ({
    propertyType: 'apartment',
    address: 'Testgatan 1, Stockholm',
    livingArea: 75,
    rooms: 3,
    bedrooms: 2,
    floor: 3,
    buildYear: 2010,
    condition: 'Bra',
    energyClass: 'C',
    elevator: true,
    flooring: 'Trä',
    kitchen: 'Modernt',
    bathroom: 'Helkaklat',
    balcony: { area: 10, direction: 'syd' },
    storage: 'Förråd',
    heating: 'Fjärrvärme',
    parking: 'Gata',
    lotArea: 0,
    garden: '',
    specialFeatures: 'Balkong',
    uniqueSellingPoints: 'Ljust',
    otherInfo: '',
    ...overrides
  }),
  
  createMockEmailJob: (overrides = {}) => ({
    id: 'test-job-id',
    type: 'verification',
    to: 'test@example.com',
    data: { verificationUrl: 'http://localhost:3000/verify?token=123' },
    attempts: 0,
    maxAttempts: 3,
    nextRetry: new Date(),
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  })
};

declare global {
  namespace globalThis {
    var testUtils: {
      createMockUser: (overrides?: any) => any;
      createMockPropertyData: (overrides?: any) => any;
      createMockEmailJob: (overrides?: any) => any;
    };
  }
}
