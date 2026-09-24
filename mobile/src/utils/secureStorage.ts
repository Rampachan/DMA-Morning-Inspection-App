import * as Keychain from 'react-native-keychain';
import { User } from '../types';

const TOKEN_SERVICE = 'mcrs_token';
const USER_SERVICE = 'mcrs_user';

/** Persist the JWT access token securely. */
export async function saveToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('jwt', token, { service: TOKEN_SERVICE });
}

/** Retrieve the stored JWT, or null if none exists. */
export async function getToken(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({ service: TOKEN_SERVICE });
    if (credentials) {
      return credentials.password;
    }
    return null;
  } catch {
    return null;
  }
}

/** Remove the stored JWT (call on logout / 401). */
export async function clearToken(): Promise<void> {
  await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
}

/** Persist the authenticated user object. */
export async function saveUser(user: User): Promise<void> {
  await Keychain.setGenericPassword('user', JSON.stringify(user), {
    service: USER_SERVICE,
  });
}

/** Retrieve the persisted user, or null if not found / parse error. */
export async function getUser(): Promise<User | null> {
  try {
    const credentials = await Keychain.getGenericPassword({ service: USER_SERVICE });
    if (credentials) {
      return JSON.parse(credentials.password) as User;
    }
    return null;
  } catch {
    return null;
  }
}

/** Remove the stored user (call on logout). */
export async function clearUser(): Promise<void> {
  await Keychain.resetGenericPassword({ service: USER_SERVICE });
}
