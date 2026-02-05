import api from "./api";

export interface ValidateTokenResponse {
  valid: boolean;
  role?: string;
  inviteeName?: string;
  email?: string;
  expiresAt?: string;
}

export async function validateInviteToken(
  token: string
): Promise<ValidateTokenResponse> {
  const response = await api.get<ValidateTokenResponse>("/invites/validate", {
    params: { token },
  });
  return response.data;
}

export interface CompleteSignupPayload {
  token: string;
  password: string;
  acceptedTermsAt: string;
  consentClinicalDataAt?: string;
  nif?: string;
}

export interface CompleteSignupResponse {
  token: string;
  user: { id: string; email: string; name: string; role: string };
}

export async function completeSignup(
  payload: CompleteSignupPayload
): Promise<CompleteSignupResponse> {
  const response = await api.post<CompleteSignupResponse>(
    "/signup/complete",
    payload
  );
  return response.data;
}
