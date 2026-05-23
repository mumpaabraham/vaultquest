import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from '../../src/firebase/auth';
import { COLORS } from '../../src/constants/colors';
import { Button } from '../../src/components/ui/Button';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referral, setReferral] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await registerUser(email.trim(), password, name.trim(), referral.trim() || undefined);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#080c18', '#0f1729']} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <Text style={styles.appName}>VAULT QUEST</Text>
            <Text style={styles.tagline}>PLAY. EARN. GROW.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.sub}>Start your investment journey</Text>

            {[
              { label: 'Full Name', value: name, setter: setName, icon: 'person-outline', placeholder: 'Alex Hunter', type: 'default' },
              { label: 'Email', value: email, setter: setEmail, icon: 'mail-outline', placeholder: 'your@email.com', type: 'email-address' },
              { label: 'Referral Code (optional)', value: referral, setter: setReferral, icon: 'gift-outline', placeholder: 'e.g. ALEX123', type: 'default' },
            ].map((f) => (
              <View key={f.label} style={styles.fieldWrap}>
                <Text style={styles.label}>{f.label}</Text>
                <View style={styles.inputRow}>
                  <Ionicons name={f.icon as any} size={18} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder={f.placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    value={f.value}
                    onChangeText={f.setter}
                    keyboardType={f.type as any}
                    autoCapitalize={f.type === 'email-address' ? 'none' : 'words'}
                  />
                </View>
              </View>
            ))}

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <Ionicons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Button
              label="CREATE ACCOUNT"
              onPress={handleRegister}
              loading={loading}
              variant="gold"
              size="lg"
              fullWidth
              style={{ marginTop: 4 }}
            />

            <TouchableOpacity style={styles.loginRow} onPress={() => router.back()}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Text style={[styles.loginText, { color: COLORS.gold, fontWeight: '700' }]}>
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  appName: { fontSize: 28, fontWeight: '900', color: COLORS.gold, letterSpacing: 4 },
  tagline: { fontSize: 12, color: COLORS.textSecondary, letterSpacing: 3, marginTop: 4 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginTop: -6 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  input: { flex: 1, color: COLORS.textPrimary, fontSize: 15 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  loginText: { fontSize: 14, color: COLORS.textSecondary },
});
