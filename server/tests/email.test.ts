import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sendVerificationEmail, sendTeamInviteEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../email';
import { queueEmail } from '../lib/email-service';

vi.mock('../lib/email-service', () => ({
  queueEmail: vi.fn(),
}));

describe('Email System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('should queue verification email with correct parameters', async () => {
      const mockQueueEmail = vi.mocked(queueEmail).mockResolvedValue({ success: true, jobId: 'job_123' });

      const result = await sendVerificationEmail('test@example.com', 'token123', '192.168.1.1');

      expect(mockQueueEmail).toHaveBeenCalledWith(
        'verification',
        'test@example.com',
        { verificationUrl: 'http://localhost:3000/verify-email?token=token123' },
        '192.168.1.1'
      );

      expect(result).toEqual({ success: true, jobId: 'job_123' });
    });

    it('should handle rate limiting errors', async () => {
      vi.mocked(queueEmail).mockResolvedValue({ success: false, error: 'Rate limit exceeded. Try again later.' });

      const result = await sendVerificationEmail('test@example.com', 'token123', '192.168.1.1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should handle queue errors gracefully', async () => {
      vi.mocked(queueEmail).mockResolvedValue({ success: false, error: 'Queue full' });

      const result = await sendVerificationEmail('test@example.com', 'token123', '192.168.1.1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue full');
    });
  });

  describe('sendTeamInviteEmail', () => {
    it('should queue team invite email with all parameters', async () => {
      const mockQueueEmail = vi.mocked(queueEmail).mockResolvedValue({ success: true, jobId: 'job_456' });

      const result = await sendTeamInviteEmail(
        'member@example.com',
        'invite123',
        'Team Mäklare',
        'leader@example.com',
        '192.168.1.2'
      );

      expect(mockQueueEmail).toHaveBeenCalledWith(
        'team_invite',
        'member@example.com',
        {
          teamName: 'Team Mäklare',
          inviterEmail: 'leader@example.com',
          verificationUrl: 'http://localhost:3000/teams/join/invite123'
        },
        '192.168.1.2'
      );

      expect(result).toEqual({ success: true, jobId: 'job_456' });
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should queue password reset email with user name', async () => {
      const mockQueueEmail = vi.mocked(queueEmail).mockResolvedValue({ success: true, jobId: 'job_789' });

      const result = await sendPasswordResetEmail(
        'user@example.com',
        'reset123',
        'John Doe',
        '192.168.1.3'
      );

      expect(mockQueueEmail).toHaveBeenCalledWith(
        'password_reset',
        'user@example.com',
        {
          resetUrl: 'http://localhost:3000/reset-password?token=reset123',
          userName: 'John Doe'
        },
        '192.168.1.3'
      );

      expect(result).toEqual({ success: true, jobId: 'job_789' });
    });

    it('should use default name when userName is not provided', async () => {
      const mockQueueEmail = vi.mocked(queueEmail).mockResolvedValue({ success: true, jobId: 'job_790' });

      const result = await sendPasswordResetEmail('user@example.com', 'reset123', undefined, '192.168.1.3');

      expect(mockQueueEmail).toHaveBeenCalledWith(
        'password_reset',
        'user@example.com',
        {
          resetUrl: 'http://localhost:3000/reset-password?token=reset123',
          userName: 'där'
        },
        '192.168.1.3'
      );

      expect(result).toEqual({ success: true, jobId: 'job_790' });
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should queue welcome email with user name', async () => {
      const mockQueueEmail = vi.mocked(queueEmail).mockResolvedValue({ success: true, jobId: 'job_999' });

      const result = await sendWelcomeEmail('newuser@example.com', 'Jane Smith', '192.168.1.4');

      expect(mockQueueEmail).toHaveBeenCalledWith(
        'welcome',
        'newuser@example.com',
        {
          userName: 'Jane Smith',
          loginUrl: 'http://localhost:3000'
        },
        '192.168.1.4'
      );

      expect(result).toEqual({ success: true, jobId: 'job_999' });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed email addresses', async () => {
      vi.mocked(queueEmail).mockResolvedValue({ success: false, error: 'Invalid email address' });

      const result = await sendVerificationEmail('invalid-email', 'token123', '192.168.1.1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty tokens', async () => {
      vi.mocked(queueEmail).mockResolvedValue({ success: false, error: 'Missing token' });

      const result = await sendVerificationEmail('test@example.com', '', '192.168.1.1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null IP addresses', async () => {
      const mockQueueEmail = vi.mocked(queueEmail).mockResolvedValue({ success: true, jobId: 'job_null' });

      const result = await sendVerificationEmail('test@example.com', 'token123', undefined);

      expect(mockQueueEmail).toHaveBeenCalledWith(
        'verification',
        'test@example.com',
        { verificationUrl: 'http://localhost:3000/verify-email?token=token123' },
        undefined
      );
      expect(result.success).toBe(true);
    });
  });
});
