import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { signOut } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { useBasket } from '../context/BasketContext';
import { useTheme } from '../context/ThemeContext';
import { useMemory } from '../context/MemoryContext';
import { CheckmarkIcon } from '../lib/icons';
import AuthSheet from '../components/AuthSheet';

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const { total } = useBasket();
  const { theme } = useTheme();
  const { memory, analyzing, refreshMemory, clearMemory } = useMemory();
  const authSheetRef = useRef(null);

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    setUser(null);
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    authSheetRef.current?.snapToIndex(0);
  };

  if (!user) {
    return (
      <>
        <View style={[styles.container, { paddingTop: insets.top + 14, backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
          <View style={styles.signedOutContainer}>
            <Text style={styles.signedOutIcon}>👤</Text>
            <Text style={[styles.signedOutTitle, { color: theme.text }]}>Sign in to your account</Text>
            <Text style={[styles.signedOutMessage, { color: theme.textSecondary }]}>
              Save your baskets, track orders, and get personalized recommendations.
            </Text>
            <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
        <AuthSheet
          ref={authSheetRef}
          onAuthSuccess={(newUser) => setUser(newUser)}
          onClose={() => {}}
        />
      </>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 14, backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>Profile</Text>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.verifiedBadge}>
            <CheckmarkIcon size={14} color="#22c55e" strokeWidth={2} />
            <Text style={styles.verifiedText}>Verified Account</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${total.toFixed(0)}</Text>
            <Text style={styles.statLabel}>In Basket</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
        </View>

        {/* Shopping Profile (AI Memory) */}
        <View style={styles.menuSection}>
          <View style={styles.memoryHeader}>
            <Text style={styles.sectionTitle}>Your Shopping Profile</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                refreshMemory();
              }}
              disabled={analyzing}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color="#d97655" />
              ) : (
                <Text style={styles.refreshText}>Refresh</Text>
              )}
            </TouchableOpacity>
          </View>

          {memory?.preferences ? (
            <View style={styles.memoryCard}>
              <Text style={styles.memorySummary}>{memory.preferences.summary || memory.raw_summary}</Text>

              {memory.preferences.favorite_categories?.length > 0 && (
                <View style={styles.memoryRow}>
                  <Text style={styles.memoryLabel}>Top Categories</Text>
                  <View style={styles.tagRow}>
                    {memory.preferences.favorite_categories.map((cat, i) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{cat}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {memory.preferences.dietary_signals?.length > 0 && (
                <View style={styles.memoryRow}>
                  <Text style={styles.memoryLabel}>Dietary</Text>
                  <View style={styles.tagRow}>
                    {memory.preferences.dietary_signals.map((sig, i) => (
                      <View key={i} style={[styles.tag, styles.tagGreen]}>
                        <Text style={[styles.tagText, styles.tagTextGreen]}>{sig}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {memory.preferences.shopping_style && memory.preferences.shopping_style !== 'unknown' && (
                <View style={styles.memoryRow}>
                  <Text style={styles.memoryLabel}>Style</Text>
                  <Text style={styles.memoryValue}>
                    {memory.preferences.shopping_style.replace(/_/g, ' ')}
                  </Text>
                </View>
              )}

              {memory.preferences.flavor_profile?.length > 0 && (
                <View style={styles.memoryRow}>
                  <Text style={styles.memoryLabel}>Flavors</Text>
                  <Text style={styles.memoryValue}>
                    {memory.preferences.flavor_profile.join(', ')}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.clearMemoryButton}
                onPress={() => {
                  Alert.alert(
                    'Clear Shopping Profile',
                    'This will delete your preference data and activity history. Are you sure?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive', onPress: clearMemory },
                    ]
                  );
                }}
              >
                <Text style={styles.clearMemoryText}>Clear My Data</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.memoryCard}>
              <Text style={styles.memoryEmpty}>
                Keep shopping and we'll learn your preferences to personalize your experience.
              </Text>
            </View>
          )}
        </View>

        {/* Account Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuItem icon="📍" label="Delivery Addresses" />
          <MenuItem icon="📦" label="Order History" />
          <MenuItem icon="💳" label="Payment Methods" />
          <MenuItem icon="❤️" label="Favorites" />
        </View>

        {/* Settings Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <MenuItem icon="🔔" label="Notifications" />
          <MenuItem icon="🔒" label="Privacy & Security" />
          <MenuItem icon="❓" label="Help & Support" />
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const MenuItem = ({ icon, label, comingSoon = true }) => (
  <View style={[styles.menuItem, comingSoon && styles.menuItemDisabled]}>
    <View style={styles.menuItemLeft}>
      <Text style={styles.menuItemIcon}>{icon}</Text>
      <Text style={[styles.menuItemText, comingSoon && styles.menuItemTextDisabled]}>
        {label}
      </Text>
    </View>
    {comingSoon ? (
      <Text style={styles.comingSoonBadge}>Soon</Text>
    ) : (
      <Text style={styles.menuItemArrow}>›</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf9f5',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
    marginBottom: 24,
  },
  // Signed out state
  signedOutContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  signedOutIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  signedOutTitle: {
    fontSize: 20,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  signedOutMessage: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  signInButtonText: {
    fontSize: 16,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#fff',
  },
  // Profile header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d97655',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Regular',
    color: '#666',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: 'FamiljenGrotesk-SemiBold',
    color: '#22c55e',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9e6dc',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'FamiljenGrotesk-Medium',
    color: '#666',
  },
  // Menu
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#000',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9e6dc',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemIcon: {
    fontSize: 20,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'FamiljenGrotesk-Medium',
    color: '#000',
  },
  menuItemArrow: {
    fontSize: 24,
    fontFamily: 'FamiljenGrotesk-Regular',
    color: '#999',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemTextDisabled: {
    color: '#999',
  },
  comingSoonBadge: {
    fontSize: 11,
    fontFamily: 'FamiljenGrotesk-SemiBold',
    color: '#d97655',
    backgroundColor: '#fef3ee',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  // Memory section
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshText: {
    fontSize: 13,
    fontFamily: 'FamiljenGrotesk-SemiBold',
    color: '#d97655',
  },
  memoryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9e6dc',
  },
  memorySummary: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Regular',
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  memoryRow: {
    marginBottom: 10,
  },
  memoryLabel: {
    fontSize: 12,
    fontFamily: 'FamiljenGrotesk-SemiBold',
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memoryValue: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Medium',
    color: '#333',
    textTransform: 'capitalize',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#fef3ee',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'FamiljenGrotesk-SemiBold',
    color: '#d97655',
  },
  tagGreen: {
    backgroundColor: '#f0fdf4',
  },
  tagTextGreen: {
    color: '#22c55e',
  },
  clearMemoryButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  clearMemoryText: {
    fontSize: 12,
    fontFamily: 'FamiljenGrotesk-Medium',
    color: '#999',
  },
  memoryEmpty: {
    fontSize: 14,
    fontFamily: 'FamiljenGrotesk-Regular',
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  // Sign out
  signOutButton: {
    backgroundColor: '#fee',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  signOutButtonText: {
    fontSize: 16,
    fontFamily: 'FamiljenGrotesk-Bold',
    color: '#c00',
  },
});

export default ProfileScreen;
