export interface PasswordValidationState {
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasNumber: boolean;
  passwordsMatch: boolean;
  isValid: boolean;
}

export const getPasswordValidationState = (
  password: string,
  confirmPassword = '',
): PasswordValidationState => {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  return {
    hasMinLength,
    hasUpperCase,
    hasNumber,
    passwordsMatch,
    isValid: hasMinLength && hasUpperCase && hasNumber && passwordsMatch,
  };
};
