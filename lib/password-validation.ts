/**
 * Shared password validation logic used by both client and server
 */

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
  };
}

/**
 * Validate password meets all requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!minLength) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!hasUppercase) {
    errors.push('Password must contain at least 1 uppercase letter');
  }
  
  if (!hasNumber) {
    errors.push('Password must contain at least 1 number');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    checks: {
      minLength,
      hasUppercase,
      hasNumber,
    },
  };
}
