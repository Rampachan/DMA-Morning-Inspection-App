import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { login } from '../services/authService';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (): Promise<void> => {
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(trimmedUser, trimmedPass);
      navigation.replace('Inspection');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <Text style={styles.appTitle}>MCRS</Text>
            <Text style={styles.appSubtitle}>Mobile Compliance Reporting System</Text>
            <Text style={styles.dma}>Directorate of Municipal Administration</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Commissioner Login</Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="next"
              accessibilityLabel="Username input"
            />

            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              accessibilityLabel="Password input"
            />

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityLabel="Login button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>v1.0.0 · Android Only Build</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f7ff' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brandBlock: { alignItems: 'center', marginBottom: 32 },
  appTitle: { fontSize: 44, fontWeight: '900', color: '#1565c0', letterSpacing: 4 },
  appSubtitle: { fontSize: 15, color: '#555', marginTop: 4, textAlign: 'center', fontWeight: '500' },
  dma: { fontSize: 12, color: '#1976d2', marginTop: 4, textAlign: 'center', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1565c0', marginBottom: 20, textAlign: 'center' },
  errorBox: { backgroundColor: '#fdecea', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#c62828', fontSize: 13, textAlign: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111',
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  loginBtn: { backgroundColor: '#1565c0', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  loginBtnDisabled: { backgroundColor: '#90caf9' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#bbdefb', fontSize: 11, marginTop: 24 },
});

export default LoginScreen;
