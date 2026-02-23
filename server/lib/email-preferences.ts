// Email preferences management
export interface EmailPreferences {
  marketing: boolean;
  notifications: boolean;
  team_invites: boolean;
  security: boolean;
}

export interface UserEmailPreferences {
  userId: string;
  preferences: EmailPreferences;
  updatedAt: Date;
}

// Default preferences for new users
export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  marketing: false,
  notifications: true,
  team_invites: true,
  security: true
};

// In-memory storage (upgrade to database in production)
class EmailPreferencesManager {
  private preferences: Map<string, UserEmailPreferences> = new Map();

  async getUserPreferences(userId: string): Promise<EmailPreferences> {
    const userPrefs = this.preferences.get(userId);
    if (userPrefs) {
      return userPrefs.preferences;
    }
    
    // Return default preferences if not set
    return DEFAULT_EMAIL_PREFERENCES;
  }

  async updateUserPreferences(
    userId: string, 
    preferences: Partial<EmailPreferences>
  ): Promise<EmailPreferences> {
    const currentPrefs = await this.getUserPreferences(userId);
    const updatedPrefs = { ...currentPrefs, ...preferences };
    
    this.preferences.set(userId, {
      userId,
      preferences: updatedPrefs,
      updatedAt: new Date()
    });
    
    return updatedPrefs;
  }

  async resetUserPreferences(userId: string): Promise<EmailPreferences> {
    this.preferences.set(userId, {
      userId,
      preferences: DEFAULT_EMAIL_PREFERENCES,
      updatedAt: new Date()
    });
    
    return DEFAULT_EMAIL_PREFERENCES;
  }

  async canSendEmail(
    userId: string,
    emailType: 'verification' | 'team_invite' | 'password_reset' | 'welcome' | 'subscription_confirmed' | 'marketing' | 'notification'
  ): Promise<boolean> {
    const prefs = await this.getUserPreferences(userId);
    
    switch (emailType) {
      case 'verification':
      case 'password_reset':
      case 'welcome':
        return prefs.security; // Security emails
      case 'team_invite':
        return prefs.team_invites; // Team emails
      case 'marketing':
        return prefs.marketing; // Marketing emails
      case 'notification':
        return prefs.notifications; // General notifications
      default:
        return true;
    }
  }

  async getAllPreferences(): Promise<UserEmailPreferences[]> {
    return Array.from(this.preferences.values());
  }

  async deleteUserPreferences(userId: string): Promise<void> {
    this.preferences.delete(userId);
  }
}

export const emailPreferencesManager = new EmailPreferencesManager();
