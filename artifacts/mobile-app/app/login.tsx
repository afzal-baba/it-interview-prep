import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const PRIMARY = '#8f7bf0';
const PRIMARY_DARK = '#7a68d4';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const canSubmit = name.trim().length >= 2;

  const handleContinue = async () => {
    if (!canSubmit) {
      setError('Please enter at least 2 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(name.trim());
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Brand */}
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <Ionicons name="terminal" size={28} color="#ffffff" />
          </View>
          <Text style={styles.brandName}>TechInterviewPrep</Text>
        </View>

        {/* Hero copy */}
        <Text style={styles.headline}>
          Ace your next{'\n'}technical interview
        </Text>
        <Text style={styles.subhead}>
          Practice with 1680+ hand-crafted questions across 56 technologies.
          Track your scores and climb the global leaderboard.
        </Text>

        {/* Feature pills */}
        <View style={styles.pillRow}>
          {['Timed Mode', 'Leaderboard', 'Code Lab'].map((label) => (
            <View key={label} style={styles.pill}>
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choose a display name</Text>
          <Text style={styles.cardSub}>
            This is how you'll appear on the leaderboard.
          </Text>

          {/* Name input */}
          <Pressable onPress={() => inputRef.current?.focus()}>
            <View style={[styles.inputWrap, error ? styles.inputError : null]}>
              <Feather name="user" size={18} color={error ? '#ef4444' : '#9ca3af'} style={styles.inputIcon} />
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="e.g. DevNinja42"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (error) setError('');
                }}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                maxLength={32}
                onSubmitEditing={handleContinue}
              />
              {name.length > 0 && (
                <TouchableOpacity onPress={() => setName('')} hitSlop={8}>
                  <Feather name="x" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </Pressable>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.helperText}>2–32 characters. No account needed.</Text>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={[styles.btn, !canSubmit && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.btnText}>Start Practicing</Text>
                <Feather name="arrow-right" size={18} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer note */}
        <Text style={styles.footerNote}>
          Free forever · No account required · Change name anytime
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },

  // Brand
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 36,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#111827',
    letterSpacing: -0.3,
  },

  // Hero
  headline: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
    color: '#111827',
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: 14,
  },
  subhead: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    lineHeight: 23,
    marginBottom: 20,
  },

  // Pills
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 36,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pillText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#374151',
  },

  // Card
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#111827',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#6b7280',
    marginBottom: 20,
  },

  // Input
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#111827',
    padding: 0,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#ef4444',
    marginBottom: 20,
  },

  // Button
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
  },
  btnDisabled: {
    backgroundColor: '#c4b5fd',
  },
  btnText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#ffffff',
    letterSpacing: -0.2,
  },

  // Footer
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#9ca3af',
  },
});
