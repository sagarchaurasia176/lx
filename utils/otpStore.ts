import { OTPData } from '../types/sms.types';

// In-memory storage (use Redis in production)
class OTPStore {
  private store = new Map<string, OTPData>();
// yes
  set(key: string, data: OTPData): void {
    this.store.set(key, data);
  }

  get(key: string): OTPData | undefined {
    return this.store.get(key);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  cleanup(): void {
    const now = new Date();
    for (const [key, data] of this.store.entries()) {
      if (now > data.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

export const otpStore = new OTPStore();

// Set up periodic cleanup (every 5 minutes)
setInterval(() => {
  otpStore.cleanup();
}, 5 * 60 * 1000);