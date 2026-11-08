/**
 * Auth feature domain types and runtime schema for login form validation.
 *
 * Uses TypeBox (via @conciergeiq/contracts) so the schema serves both as a
 * compile-time type source and as a runtime validator — no duplication between
 * the TS interface and the validation rules.
 */

import { Type, Value } from '@conciergeiq/contracts';

/**
 * TypeBox schema that describes valid login form input.
 * - emailAddress: non-empty string; a basic "@" check is applied separately
 *   because TypeBox's built-in `format: 'email'` requires format-registry setup.
 * - plainTextPassword: non-empty string; complexity rules are enforced server-side.
 */
export const StaffLoginSchema = Type.Object({
  emailAddress: Type.String({ minLength: 1 }),
  plainTextPassword: Type.String({ minLength: 1 }),
});

/** TypeScript type that mirrors StaffLoginSchema's shape. */
export interface StaffLoginFormData {
  emailAddress: string;
  plainTextPassword: string;
}

/** Field-level error messages produced when login form data fails validation. */
export interface StaffLoginFieldErrors {
  emailAddress?: string;
  plainTextPassword?: string;
}

/** Discriminated union returned by validateStaffLoginCredentials. */
export type StaffLoginValidationResult =
  | { isValid: true; data: StaffLoginFormData }
  | { isValid: false; fieldErrors: StaffLoginFieldErrors };

/**
 * Validates raw login form values against StaffLoginSchema.
 *
 * Returns the validated (and trimmed) credentials on success, or a map of
 * human-readable field-level error messages on failure.  Client-side
 * validation is intentionally lenient: the server enforces full complexity
 * rules and email deliverability.  We only gate an obviously empty or
 * malformed value from ever hitting the network.
 */
export function validateStaffLoginCredentials(
  emailAddress: string,
  plainTextPassword: string,
): StaffLoginValidationResult {
  const trimmedEmail = emailAddress.trim();
  const fieldErrors: StaffLoginFieldErrors = {};

  if (trimmedEmail.length === 0) {
    fieldErrors.emailAddress = 'Email address is required.';
  } else if (!trimmedEmail.includes('@') || trimmedEmail.startsWith('@') || trimmedEmail.endsWith('@')) {
    fieldErrors.emailAddress = 'Please enter a valid email address.';
  }

  if (plainTextPassword.length === 0) {
    fieldErrors.plainTextPassword = 'Password is required.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { isValid: false, fieldErrors };
  }

  // Confirm the trimmed data passes the schema (guards against unexpected shapes).
  const sanitisedData = { emailAddress: trimmedEmail, plainTextPassword };
  if (!Value.Check(StaffLoginSchema, sanitisedData)) {
    return { isValid: false, fieldErrors: { emailAddress: 'Please enter a valid email address.' } };
  }

  return { isValid: true, data: sanitisedData };
}
