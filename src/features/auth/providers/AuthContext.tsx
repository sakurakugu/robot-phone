import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getApiBaseUrl } from '../../../shared/config/environment';

const TOKEN_KEY = '@robot:auth_token';
const USER_KEY = '@robot:auth_user';
const MODE_KEY = '@robot:auth_mode';

type AccountRole = 'user' | 'admin' | 'super_admin';
type RegistrationApprovalStatus = 'pending' | 'approved' | 'rejected';

type AuthUser = {
  id: string;
  username: string;
  role: AccountRole;
  approvalStatus: RegistrationApprovalStatus;
  approvalReviewedAt: string | null;
  approvalReviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

type RegisterResult = {
  token: string | null;
  user: AuthUser;
  requiresApproval: boolean;
  message: string;
};

type RegisterConfig = {
  registerEnabled: boolean;
  registerApprovalRequired: boolean;
};

type AuthState = {
  mode: 'guest' | 'authenticated';
  user: AuthUser | null;
  token: string;
  bootstrapped: boolean;
};

type AuthContextValue = AuthState & {
  registerEnabled: boolean;
  registerApprovalRequired: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  enterGuestMode: () => Promise<void>;
  refreshRegisterConfig: () => Promise<void>;
};

let currentToken = '';

export function getAuthToken(): string {
  return currentToken;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function requestAuth(
  path: string,
  body: { username: string; password: string },
) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-type': 'mobile',
      'x-device-name': 'RobotPhone',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || payload.message || '认证失败');
  }

  return payload.data;
}

async function requestRegisterConfig(): Promise<RegisterConfig> {
  const response = await fetch(`${getApiBaseUrl()}/auth/register-config`, {
    method: 'GET',
    headers: {
      'x-client-type': 'mobile',
      'x-device-name': 'RobotPhone',
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || payload.message || '获取注册配置失败');
  }

  return payload.data as RegisterConfig;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [registerConfig, setRegisterConfig] = useState<RegisterConfig>({
    registerEnabled: true,
    registerApprovalRequired: false,
  });
  const [state, setState] = useState<AuthState>({
    mode: 'guest',
    user: null,
    token: '',
    bootstrapped: false,
  });

  const persist = useCallback(
    async (next: {
      mode: 'guest' | 'authenticated';
      user: AuthUser | null;
      token: string;
    }) => {
      currentToken = next.token;
      await AsyncStorage.multiSet([
        [MODE_KEY, next.mode],
        [USER_KEY, next.user ? JSON.stringify(next.user) : ''],
        [TOKEN_KEY, next.token],
      ]);
      setState(prev => ({ ...prev, ...next }));
    },
    [],
  );

  const refreshRegisterConfig = useCallback(async () => {
    try {
      const nextConfig = await requestRegisterConfig();
      setRegisterConfig(nextConfig);
    } catch {
      setRegisterConfig({
        registerEnabled: true,
        registerApprovalRequired: false,
      });
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [mode, userRaw, token] = await AsyncStorage.multiGet([
        MODE_KEY,
        USER_KEY,
        TOKEN_KEY,
      ]);
      const modeValue =
        (mode[1] as 'guest' | 'authenticated' | null) || 'guest';
      const tokenValue = token[1] || '';
      let userValue: AuthUser | null = null;
      if (userRaw[1]) {
        try {
          userValue = JSON.parse(userRaw[1]) as AuthUser;
        } catch {
          userValue = null;
        }
      }
      currentToken = tokenValue;
      setState({
        mode: modeValue,
        user: userValue,
        token: tokenValue,
        bootstrapped: true,
      });
      await refreshRegisterConfig();
    })();
  }, [refreshRegisterConfig]);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await requestAuth('/auth/login', { username, password }) as {
        token: string;
        user: AuthUser;
      };
      await persist({
        mode: 'authenticated',
        user: data.user,
        token: data.token,
      });
    },
    [persist],
  );

  const register = useCallback(
    async (username: string, password: string) => {
      const data = await requestAuth('/auth/register', { username, password }) as RegisterResult;
      if (data.token) {
        await persist({
          mode: 'authenticated',
          user: data.user,
          token: data.token,
        });
      } else {
        await persist({ mode: 'guest', user: null, token: '' });
      }
      return data;
    },
    [persist],
  );

  const logout = useCallback(async () => {
    try {
      if (currentToken) {
        await fetch(`${getApiBaseUrl()}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'x-client-type': 'mobile',
            'x-device-name': 'RobotPhone',
          },
        });
      }
    } catch {
      // ignore
    }
    await persist({ mode: 'guest', user: null, token: '' });
  }, [persist]);

  const enterGuestMode = useCallback(async () => {
    await persist({ mode: 'guest', user: null, token: '' });
  }, [persist]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      registerEnabled: registerConfig.registerEnabled,
      registerApprovalRequired: registerConfig.registerApprovalRequired,
      login,
      register,
      logout,
      enterGuestMode,
      refreshRegisterConfig,
    }),
    [
      state,
      registerConfig.registerEnabled,
      registerConfig.registerApprovalRequired,
      login,
      register,
      logout,
      enterGuestMode,
      refreshRegisterConfig,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必须在 AuthProvider 中使用');
  }
  return ctx;
}
