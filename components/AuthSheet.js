import React, { useState, forwardRef, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CloseIcon } from '../lib/icons';
import { signIn, signUp, signInWithGoogle, signInWithApple } from '../lib/auth';
import SimpleSheet from './SimpleSheet';

const AuthSheet = forwardRef(({ onAuthSuccess, onClose }, ref) => {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Reset form
    setEmail('');
    setPassword('');
    setFullName('');
    setError('');
    setMode('signin');
    onClose();
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data, error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAuthSuccess(data.user);
      handleClose();
    }

    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { data, error } = await signUp(email, password, fullName);

    if (error) {
      setError(error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAuthSuccess(data.user);
      handleClose();
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { data, error } = await signInWithGoogle();

    if (error) {
      setError(error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { data, error } = await signInWithApple();

    if (error) {
      setError(error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const toggleMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError('');
  };

  return (
    <SimpleSheet ref={ref} onClose={handleClose}>
      <View style={styles.contentContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <CloseIcon size={24} color="#000" strokeWidth={2} />
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signin'
              ? 'Sign in to save your baskets and track orders'
              : 'Get started with your Friday deliveries'}
          </Text>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={mode === 'signin' ? handleSignIn : handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Text style={styles.socialButtonText}>🔍 Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                <Text style={styles.socialButtonText}>🍎 Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Toggle Mode */}
            <TouchableOpacity onPress={toggleMode} style={styles.toggleMode}>
              <Text style={styles.toggleModeText}>
                {mode === 'signin'
                  ? "Don't have an account? "
                  : 'Already have an account? '}
                <Text style={styles.toggleModeLink}>
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SimpleSheet>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  keyboardView: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 24,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#f0ede7',
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
    marginBottom: 8,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'FamiljenGrotesk-Regular',
    color: '#666',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Medium',
    color: '#c00',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-SemiBold',
    color: '#000',
  },
  input: {
    backgroundColor: '#f0ede7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'FamiljenGrotesk-Regular',
    color: '#000',
  },
  submitButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9e6dc',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Regular',
    color: '#999',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    backgroundColor: '#f0ede7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  socialButtonText: {
    fontSize: 15,
    fontFamily: 'FamiljenGrotesk-SemiBold',
    color: '#000',
  },
  toggleMode: {
    alignItems: 'center',
    marginTop: 8,
  },
  toggleModeText: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Regular',
    color: '#666',
  },
  toggleModeLink: {
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
  },
});

export default AuthSheet;
