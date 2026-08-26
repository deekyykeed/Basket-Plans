import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator } from 'react-native';
import MicIcon from '../assets/icons/search/Mic-Line--Streamline-Mingcute.svg';
import SearchIconSvg from '../assets/icons/search/Search-2-Fill--Streamline-Mingcute-Fill (1).svg';
import { formatPrice } from '../lib/basketUtils';

const SearchBar = ({ value, onChangeText, placeholder = "Search...", totalPrice = 0, isAiSearch = false, aiSearchLoading = false }) => {

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <View style={styles.searchIconContainer}>
          <SearchIconSvg width={20} height={20} />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          numberOfLines={1}
        />
        {aiSearchLoading ? (
          <View style={styles.micButton}>
            <ActivityIndicator size="small" color="#d97655" />
          </View>
        ) : value ? (
          <TouchableOpacity style={styles.micButton} onPress={() => onChangeText('')}>
            <Text style={styles.clearText}>{isAiSearch ? 'AI' : 'Clear'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.micButton}>
            <MicIcon width={20} height={20} />
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.basketButton}>
        <Text style={styles.basketButtonText}>
          {formatPrice(totalPrice)}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    gap: 10,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  searchIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
    fontStyle: 'normal',
    color: '#000000',
    letterSpacing: 0,
    textAlign: 'left',
    lineHeight: 19.2,
    paddingVertical: 0,
  },
  micButton: {
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    fontSize: 13,
    fontFamily: 'FamiljenGrotesk-SemiBold',
    color: '#999',
  },
  basketButton: {
    width: 40,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#d97655',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
    backgroundColor: '#d97655',
    overflow: 'visible',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  basketButtonText: {
    fontSize: 16,
    fontFamily: 'Fortnite',
    fontWeight: '400',
    fontStyle: 'normal',
    color: '#ffffff',
    letterSpacing: 0,
    lineHeight: 19.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    includeFontPadding: false,
  },
});

export default SearchBar;

