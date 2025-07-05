// utils/phoneFormatter.ts - COMPLETE WORKING VERSION
export class PhoneFormatter {
  private static readonly COUNTRY_CODES = {
    US: '+1',
    IN: '+91',
    GB: '+44',
    CA: '+1',
    AU: '+61',
    // Add more country codes as needed
  };

  private static readonly DEFAULT_COUNTRY = 'IN'; // Default to India
  
  /**
   * Clean phone number by removing all non-digit characters
   * @param phoneNumber - Raw phone number
   * @returns Clean phone number with only digits
   */
  static cleanPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/\D/g, '');
  }

  /**
   * Format phone number for display (e.g., +91 98765 43210)
   * @param phoneNumber - Clean phone number
   * @returns Formatted phone number
   */
  static formatPhoneNumber(phoneNumber: string): string {
    const clean = this.cleanPhoneNumber(phoneNumber);
    
    // If already starts with country code, format accordingly
    if (clean.startsWith('91') && clean.length === 12) {
      return `+91 ${clean.substring(2, 7)} ${clean.substring(7)}`;
    }
    
    // If it's a 10-digit Indian number
    if (clean.length === 10) {
      return `+91 ${clean.substring(0, 5)} ${clean.substring(5)}`;
    }
    
    // For US/Canada numbers
    if (clean.startsWith('1') && clean.length === 11) {
      return `+1 ${clean.substring(1, 4)} ${clean.substring(4, 7)} ${clean.substring(7)}`;
    }
    
    // Return as is with + prefix if not recognized
    return clean.startsWith('+') ? phoneNumber : `+${clean}`;
  }

  /**
   * FIXED: Format phone number for SMS (Twilio format: +countrycode followed by number)
   * @param phoneNumber - Phone number in any format
   * @param defaultCountry - Default country code if not provided
   * @returns Phone number in international format for SMS
   */
  static formatForSMS(phoneNumber: string, defaultCountry: string = this.DEFAULT_COUNTRY): string {
    // Handle null/undefined
    if (!phoneNumber) return '';
    
    const clean = this.cleanPhoneNumber(phoneNumber);
    
    // If already in international format, clean it and remove all non-digit chars except +
    if (phoneNumber.startsWith('+')) {
      return phoneNumber.replace(/[^\d+]/g, '');
    }
    
    // Indian numbers with country code
    if (clean.startsWith('91') && clean.length === 12) {
      return `+${clean}`;
    }
    
    // 10-digit local numbers
    if (clean.length === 10) {
      // For Indian numbers, validate mobile pattern
      if (defaultCountry === 'IN' && /^[6-9]\d{9}$/.test(clean)) {
        return `+91${clean}`;
      }
      // For other countries
      const countryCode = this.COUNTRY_CODES[defaultCountry as keyof typeof this.COUNTRY_CODES];
      return `${countryCode}${clean}`;
    }
    
    // US/Canada numbers
    if (clean.startsWith('1') && clean.length === 11) {
      return `+${clean}`;
    }
    
    // UK numbers
    if (clean.startsWith('44') && clean.length >= 12) {
      return `+${clean}`;
    }
    
    // Australia numbers
    if (clean.startsWith('61') && clean.length >= 11) {
      return `+${clean}`;
    }
    
    // Default: add + and hope for the best
    return `+${clean}`;
  }

  /**
   * NEW: Format phone number for database storage (clean international format)
   * @param phoneNumber - Phone number in any format
   * @param defaultCountry - Default country code if not provided
   * @returns Clean phone number for database storage (+countrycodenumber)
   */
  static formatForDatabase(phoneNumber: string, defaultCountry: string = this.DEFAULT_COUNTRY): string {
    return this.formatForSMS(phoneNumber, defaultCountry);
  }

  /**
   * NEW: Normalize phone number input (clean and format for storage)
   * @param phoneNumber - Raw phone number input
   * @param defaultCountry - Default country code
   * @returns Normalized phone number
   */
  static normalizePhoneNumber(phoneNumber: string, defaultCountry: string = this.DEFAULT_COUNTRY): string {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it starts with +, ensure it's properly formatted
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // Convert to international format
    return this.formatForSMS(cleaned, defaultCountry);
  }

  /**
   * Validate phone number format
   * @param phoneNumber - Phone number to validate
   * @returns True if valid format
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    const clean = this.cleanPhoneNumber(phoneNumber);
    
    // Check if it's empty
    if (!clean) return false;
    
    // Check minimum and maximum length
    if (clean.length < 10 || clean.length > 15) return false;
    
    // Check for valid patterns
    const patterns = [
      /^91\d{10}$/, // Indian with country code
      /^\d{10}$/, // 10-digit local
      /^1\d{10}$/, // US/Canada
      /^44\d{10,11}$/, // UK
      /^61\d{9}$/, // Australia
    ];
    
    return patterns.some(pattern => pattern.test(clean));
  }

  /**
   * FIXED: Validate phone number for SMS (international format)
   * @param phoneNumber - Phone number to validate
   * @returns True if valid for SMS
   */
  static validateForSMS(phoneNumber: string): boolean {
    // Must start with + followed by country code and number
    const smsPattern = /^\+[1-9]\d{1,14}$/;
    
    if (!smsPattern.test(phoneNumber)) {
      return false;
    }
    
    const clean = this.cleanPhoneNumber(phoneNumber);
    
    // Specific validation for Indian numbers
    if (clean.startsWith('91') && clean.length === 12) {
      const mobileNumber = clean.substring(2);
      return /^[6-9]\d{9}$/.test(mobileNumber);
    }
    
    // US/Canada validation
    if (clean.startsWith('1') && clean.length === 11) {
      return true;
    }
    
    // UK validation
    if (clean.startsWith('44') && clean.length >= 12 && clean.length <= 13) {
      return true;
    }
    
    // Australia validation
    if (clean.startsWith('61') && clean.length >= 11 && clean.length <= 12) {
      return true;
    }
    
    // For other countries, basic length check
    return clean.length >= 10 && clean.length <= 15;
  }

  /**
   * Get country code from phone number
   * @param phoneNumber - Phone number
   * @returns Country code or null if not found
   */
  static getCountryCode(phoneNumber: string): string | null {
    const clean = this.cleanPhoneNumber(phoneNumber);
    
    // Check common country codes
    if (clean.startsWith('91') && clean.length === 12) return 'IN';
    if (clean.startsWith('1') && clean.length === 11) return 'US';
    if (clean.startsWith('44') && clean.length >= 12) return 'GB';
    if (clean.startsWith('61') && clean.length >= 11) return 'AU';
    
    return null;
  }

  /**
   * Parse phone number to extract country code and local number
   * @param phoneNumber - Phone number to parse
   * @returns Object with country code and local number
   */
  static parsePhoneNumber(phoneNumber: string): {
    countryCode: string | null;
    localNumber: string;
    isValid: boolean;
  } {
    const clean = this.cleanPhoneNumber(phoneNumber);
    const countryCode = this.getCountryCode(phoneNumber);
    
    let localNumber = clean;
    if (countryCode) {
      const countryCodeNumber = this.COUNTRY_CODES[countryCode as keyof typeof this.COUNTRY_CODES].substring(1);
      localNumber = clean.startsWith(countryCodeNumber) ? clean.substring(countryCodeNumber.length) : clean;
    }
    
    return {
      countryCode,
      localNumber,
      isValid: this.validatePhoneNumber(phoneNumber),
    };
  }

  /**
   * Format phone number for specific country
   * @param phoneNumber - Phone number
   * @param countryCode - Country code (e.g., 'IN', 'US')
   * @returns Formatted phone number
   */
  static formatForCountry(phoneNumber: string, countryCode: string): string {
    const clean = this.cleanPhoneNumber(phoneNumber);
    const prefix = this.COUNTRY_CODES[countryCode as keyof typeof this.COUNTRY_CODES];
    
    if (!prefix) {
      throw new Error(`Unsupported country code: ${countryCode}`);
    }
    
    switch (countryCode) {
      case 'IN':
        if (clean.length === 10) {
          return `${prefix} ${clean.substring(0, 5)} ${clean.substring(5)}`;
        }
        break;
      case 'US':
      case 'CA':
        if (clean.length === 10) {
          return `${prefix} ${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
        }
        break;
      case 'GB':
        // UK formatting is complex, simplified version
        if (clean.length === 10) {
          return `${prefix} ${clean.substring(0, 4)} ${clean.substring(4)}`;
        }
        break;
      case 'AU':
        if (clean.length === 9) {
          return `${prefix} ${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
        }
        break;
    }
    
    return `${prefix}${clean}`;
  }
}