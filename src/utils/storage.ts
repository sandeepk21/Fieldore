import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
};

// ✅ Save
export const saveAuthData = async (token: string, user: any) => {
  await AsyncStorage.setItem(KEYS.TOKEN, token);
  await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
};

// ✅ Get token
export const getToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(KEYS.TOKEN);
};

// ✅ Get user
export const getUser = async () => {
  const user = await AsyncStorage.getItem(KEYS.USER);
  return user ? JSON.parse(user) : null;
};

// ✅ Clear
export const clearAuthData = async () => {
  await AsyncStorage.removeItem(KEYS.TOKEN);
  await AsyncStorage.removeItem(KEYS.USER);
};