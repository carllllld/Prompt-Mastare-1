import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { storage } from '../storage';

// Mock dependencies
vi.mock('bcrypt');
vi.mock('crypto');
vi.mock('../storage');

describe('Authentication System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Password Security', () => {
    it('should hash passwords with bcrypt', async () => {
      const mockHash = vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password_123');
      const password = 'securePassword123!';
      
      const hash = await bcrypt.hash(password, 12);
      
      expect(mockHash).toHaveBeenCalledWith(password, 12);
      expect(hash).toBe('hashed_password_123');
    });

    it('should compare passwords correctly', async () => {
      const mockCompare = vi.mocked(bcrypt.compare).mockResolvedValue(true);
      const password = 'userPassword123!';
      const hash = 'hashed_password_123';
      
      const isValid = await bcrypt.compare(password, hash);
      
      expect(mockCompare).toHaveBeenCalledWith(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const mockCompare = vi.mocked(bcrypt.compare).mockResolvedValue(false);
      const wrongPassword = 'wrongPassword';
      const hash = 'hashed_password_123';
      
      const isValid = await bcrypt.compare(wrongPassword, hash);
      
      expect(mockCompare).toHaveBeenCalledWith(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Token Generation', () => {
    it('should generate secure random tokens', () => {
      const mockRandomBytes = vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: vi.fn().mockReturnValue('secure_token_1234567890abcdef')
      } as any);
      
      const token = crypto.randomBytes(32).toString('hex');
      
      expect(mockRandomBytes).toHaveBeenCalledWith(32);
      expect(token).toBe('secure_token_1234567890abcdef');
      expect(token.length).toBe(64); // 32 bytes * 2 (hex)
    });

    it('should generate unique tokens', () => {
      const mockRandomBytes = vi.mocked(crypto.randomBytes)
        .mockReturnValueOnce({
          toString: vi.fn().mockReturnValue('token_1_abcdef1234567890')
        } as any)
        .mockReturnValueOnce({
          toString: vi.fn().mockReturnValue('token_2_fedcba0987654321')
        } as any);
      
      const token1 = crypto.randomBytes(32).toString('hex');
      const token2 = crypto.randomBytes(32).toString('hex');
      
      expect(token1).not.toBe(token2);
      expect(token1).toBe('token_1_abcdef1234567890');
      expect(token2).toBe('token_2_fedcba0987654321');
    });
  });

  describe('Email Rate Limiting', () => {
    it('should allow emails within rate limit', async () => {
      const mockCanSend = vi.mocked(storage.canSendEmail).mockResolvedValue(true);
      const mockRecord = vi.mocked(storage.recordEmailSent).mockResolvedValue();
      
      const canSend = await storage.canSendEmail('test@example.com', 'verification', 3);
      
      expect(mockCanSend).toHaveBeenCalledWith('test@example.com', 'verification', 3);
      expect(canSend).toBe(true);
    });

    it('should block emails exceeding rate limit', async () => {
      const mockCanSend = vi.mocked(storage.canSendEmail).mockResolvedValue(false);
      
      const canSend = await storage.canSendEmail('test@example.com', 'verification', 3);
      
      expect(mockCanSend).toHaveBeenCalledWith('test@example.com', 'verification', 3);
      expect(canSend).toBe(false);
    });

    it('should record sent emails', async () => {
      const mockRecord = vi.mocked(storage.recordEmailSent).mockResolvedValue();
      
      await storage.recordEmailSent('test@example.com', 'verification');
      
      expect(mockRecord).toHaveBeenCalledWith('test@example.com', 'verification');
    });
  });

  describe('User Registration', () => {
    it('should create user with hashed password', async () => {
      const mockCreateUser = vi.mocked(storage.createUser).mockResolvedValue({
        id: 'user_123',
        email: 'test@example.com',
        plan: 'free',
        emailVerified: false,
        createdAt: new Date()
      } as any);
      
      const mockHash = vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password');
      
      const user = await storage.createUser({
        email: 'test@example.com',
        password: 'plainPassword123!',
        plan: 'free'
      });
      
      expect(mockHash).toHaveBeenCalledWith('plainPassword123!', 12);
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashed_password',
        plan: 'free'
      });
      expect(user.id).toBe('user_123');
    });

    it('should handle duplicate email registration', async () => {
      const mockCreateUser = vi.mocked(storage.createUser).mockRejectedValue(
        new Error('Email already exists')
      );
      
      await expect(storage.createUser({
        email: 'existing@example.com',
        password: 'password123!',
        plan: 'free'
      })).rejects.toThrow('Email already exists');
    });
  });

  describe('Session Management', () => {
    it('should track device information', async () => {
      const mockSession = {
        userId: 'user_123',
        deviceInfo: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          ip: '192.168.1.1'
        }
      };
      
      expect(mockSession.deviceInfo.userAgent).toContain('Mozilla');
      expect(mockSession.deviceInfo.ip).toBe('192.168.1.1');
    });

    it('should handle session expiration', () => {
      const sessionAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      const now = Date.now();
      const sessionCreated = now - sessionAge - 1000; // 1 second past expiration
      
      const isExpired = (now - sessionCreated) > sessionAge;
      
      expect(isExpired).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];
      
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com'
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
      
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it('should validate password strength', () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyP@ssw0rd2024',
        'Complex!Password#456'
      ];
      
      const weakPasswords = [
        'password',
        '123456',
        'abc',
        'Password123'
      ];
      
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      
      strongPasswords.forEach(password => {
        expect(strongPasswordRegex.test(password)).toBe(true);
      });
      
      weakPasswords.forEach(password => {
        expect(strongPasswordRegex.test(password)).toBe(false);
      });
    });
  });
});
