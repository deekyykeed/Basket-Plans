import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { CATEGORY_ICONS } from '../lib/icons';

const CategoryFilter = ({ activeCategory, onCategoryPress }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error.message);
        setCategories([]);
      } else {
        setCategories(data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = (categoryId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCategoryPress(activeCategory === categoryId ? null : categoryId);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  if (categories.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollContainer}
    >
      {categories.map((category) => {
        const IconComponent = category.icon ? CATEGORY_ICONS[category.icon] : null;
        const isActive = activeCategory === category.id;

        return (
          <TouchableOpacity
            key={category.id}
            style={styles.categoryButton}
            onPress={() => handlePress(category.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              <View style={styles.iconWrapper}>
                {IconComponent ? (
                  <View style={isActive && styles.iconShadow}>
                    <IconComponent
                      isActive={isActive}
                      size={20}
                      color={isActive ? '#fff' : '#000'}
                    />
                  </View>
                ) : (
                  <Text style={styles.fallbackIcon}>{category.icon || '📦'}</Text>
                )}
              </View>
            </View>
            <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 14,
    gap: 16,
  },
  container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  categoryButton: {
    alignItems: 'center',
    gap: 4,
  },
  iconContainer: {
    width: 42,
    height: 42,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
    backgroundColor: '#fafafa',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  iconContainerActive: {
    backgroundColor: '#d97655',
    shadowColor: '#d97655',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  iconWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 1,
    elevation: 2,
  },
  fallbackIcon: {
    fontSize: 20,
  },
  categoryText: {
    fontFamily: 'FamiljenGrotesk-Medium',
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: '#000000',
  },
});

export default CategoryFilter;
