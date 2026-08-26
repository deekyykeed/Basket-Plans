import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { HomeIcon } from '../lib/icons';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { id: 'home', label: 'Shop', Icon: HomeIcon },
  { id: 'orders', label: 'Orders', emoji: '📦' },
  { id: 'profile', label: 'Profile', emoji: '👤' },
];

const BottomTabBar = ({ activeTab, onTabPress, basketCount }) => {
  const { theme } = useTheme();

  const handlePress = (tabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabPress(tabId);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.tabBar, borderTopColor: theme.border }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => handlePress(tab.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              {tab.Icon ? (
                <tab.Icon
                  size={20}
                  color={isActive ? '#fff' : theme.textMuted}
                  strokeWidth={isActive ? 2 : 1.5}
                />
              ) : (
                <Text style={[styles.emoji, !isActive && styles.emojiInactive]}>
                  {tab.emoji}
                </Text>
              )}
              {tab.id === 'orders' && basketCount > 0 && (
                <View style={[styles.badge, { borderColor: theme.tabBar }]}>
                  <Text style={styles.badgeText}>{basketCount > 9 ? '9+' : basketCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color: theme.textMuted }, isActive && { color: theme.text, fontFamily: 'FamiljenGrotesk-Bold' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainerActive: {
    backgroundColor: '#d97655',
  },
  emoji: {
    fontSize: 18,
  },
  emojiInactive: {
    opacity: 0.4,
  },
  label: {
    fontSize: 11,
    fontFamily: 'FamiljenGrotesk-Medium',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#d97655',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'FamiljenGrotesk-Bold',
  },
});

export default BottomTabBar;
