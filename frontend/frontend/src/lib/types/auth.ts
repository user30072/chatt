export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  authProvider?: string;
  authProviderId?: string;
  google_id?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  register: (userData: UserRegistrationData) => Promise<void>;
  googleLogin: (token: string) => Promise<void>;
  refreshToken: () => Promise<boolean>;
} 