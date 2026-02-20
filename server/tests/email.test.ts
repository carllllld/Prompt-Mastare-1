import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sendVerificationEmail, sendTeamInviteEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../email';
import { emailQueue } from '../lib/email-queue';
import { rateLimiter } from '../lib/email-rate-limiter';

// Mock dependencies
vi.mock('../lib/email-queue');
vi.mock('../lib/email-rate-limiter');

describe('Email System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('should queue verification email with correct parameters', async () => {
      const mockAddJob = vi.mocked(emailQueue.addJob).mockResolvedValue('job_123');
      
      const result = await sendVerificationEmail('test@example.com', 'token123', '192.168.1.1');
      
      expect(mockAddJob).toHaveBeenCalledWith({
        type: 'verification',
        to: 'test@example.com',
        data: { verificationUrl: 'https://optiprompt.se/verify-email?token=token123' },
        maxAttempts: 3,
        nextRetry: expect.any(Date)
      });
      
      expect(result).toEqual({ success: true, jobId: 'job_123' });
    });

    it('should handle rate limiting errors', async () => {
      vi.mocked(rateLimiter.checkLimit).mockResolvedValue(false);
      
      const result = await sendVerificationEmail('test@example.com', 'token123', '192.168.1.1');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should handle queue errors gracefully', async () => {
      vi.mocked(emailQueue.addJob).mockRejectedValue(new Error('Queue full'));
      
      const result = await sendVerificationEmail('test@example.com', 'token123', '192.168.1.1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue full');
    });
  });

  describe('sendTeamInviteEmail', () => {
    it('should queue team invite email with all parameters', async () => {
      const mockAddJob = vi.mocked(emailQueue.addJob).mockResolvedValue('job_456');
      
      const result = await sendTeamInviteEmail(
        'member@example.com', 
        'invite123', 
        'Team Mäklare', 
        'leader@example.com',
        '192.168.1.2'
      );
      
      expect(mockAddJob).toHaveBeenCalledWith({
        type: 'team_invite',
        to: 'member@example.com',
        data: { 
          teamName: 'Team Mäklare', 
          inviterEmail: 'leader@example.com',
          verificationUrl: 'https://optiprompt.se/accept-invite?token=invite123'
        },
        maxAttempts: 2,
        nextRetry: expect.any(Date)
      });
      
      expect(result).toEqual({ success: true, jobId: 'job_456' });
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should queue password reset email with user name', async () => {
      const mockAddJob = vi.mocked(emailQueue.addJob).mockResolvedValue('job_789');
      
      const result = await sendPasswordResetEmail(
        'user@example.com', 
        'reset123', 
        'John Doe',
        '192.168.1.3'
      );
      
      expect(mockAddJob).toHaveBeenCalledWith({
        type: 'password_reset',
        to: 'user@example.com',
        data: { 
          resetUrl: 'https://optiprompt.se/reset-password?token=reset123',
          userName: 'John Doe'
        },
        maxAttempts: 3,
        nextRetry: expect.any(Date)
      });
      
      expect(result).toEqual({ success: true, jobId: 'job_789' });
    });

    it('should use default name when userName is not provided', async () => {
      const mockAddJob = vi.mocked(emailQueue.addJob).mockResolvedValue('job_790');
      
      const result = await sendPasswordResetEmail('user@example.com', 'reset123', undefined, '192.168.1.3');
      
      expect(mockAddJob).toHaveBeenCalledWith({
        type: 'password_reset',
        to: 'user@example.com',
        data: { 
          resetUrl: 'https://optiprompt.se/reset-password?token=reset123',
          userName: 'där'
        },
        maxAttempts: 3,
        nextRetry: expect.any(Date)
      });
      
      expect(result).toEqual({ success: true, jobId: 'job_790' });
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should queue welcome email with user name', async () => {
      const mockAddJob = vi.mocked(emailQueue.addJob).mockResolvedValue('job_999');
      
      const result = await sendWelcomeEmail('newuser@example.com', 'Jane Smith', '192.168.1.4');
      
      expect(mockAddJob).toHaveBeenCalledWith({
        type: 'welcome',
        to: 'newuser@example.com',
        data: { 
          userName: 'Jane Smith',
          loginUrl: 'https://optiprompt.se/login'
        },
        maxAttempts: 1,
        nextRetry: expect.any(Date)
      });
      
      expect(result).toEqual({ success: true, jobId: 'job_999' });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed email addresses', async () => {
      const result = await sendVerificationEmail('invalid-email', 'token123', '192.168.1.1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty tokens', async () => {
      const result = await sendVerificationEmail('test@example.com', '', '192.168.1.1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null IP addresses', async () => {
      const mockAddJob = vi.mocked(emailQueue.addJob).mockResolvedValue('job_null');
      
      const result = await sendVerificationEmail('test@example.com', 'token123', undefined);
      
      expect(mockAddJob).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
