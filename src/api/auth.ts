import { apiClient, setTokens, clearTokens } from './config';
import { SignInRequest, SignInResponse, AuthTokens } from './types';

/**
 * Sign in to the API
 * @param credentials - User credentials (username, password, deviceName)
 * @returns Promise with authentication tokens and user data
 */
export async function signInApi(credentials: SignInRequest): Promise<AuthTokens> {
  try {
    const response = await apiClient.post<SignInResponse>(
      '/api/auth/signin',
      credentials
    );

    if (response.data && response.data.data) {
      const { accessToken, refreshToken, user } = response.data.data;

      // Store tokens for future requests
      setTokens(accessToken, refreshToken);

      console.log('✓ Successfully signed in as:', user.name);
      console.log('  Email:', user.email);
      console.log('  Roles:', user.roles.join(', '));

      return response.data.data;
    }

    throw new Error('Invalid response format');
  } catch (error: any) {
    console.error('Sign in failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Sign out and clear stored tokens
 */
export function signOut(): void {
  clearTokens();
  console.log('✓ Signed out successfully');
}
