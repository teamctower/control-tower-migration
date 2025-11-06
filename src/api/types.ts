// API Request Types
export interface SignInRequest {
  username: string;
  password: string;
  deviceName: string;
}

// API Response Types
export interface User {
  userId: number;
  email: string;
  name: string;
  roles: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface SignInResponse {
  statusCode: number;
  data: AuthTokens;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
