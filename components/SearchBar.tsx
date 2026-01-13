import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Searchbar as PaperSearchbar, SearchbarProps } from 'react-native-paper';

interface SearchBarProps extends Omit<SearchbarProps, 'style'> {
  style?: ViewStyle;
  inputStyle?: TextStyle;
}

const SearchBar: React.FC<SearchBarProps> = ({
  style,
  inputStyle,
  ...props
}) => {
  return (
    <PaperSearchbar
      {...props}
      style={[styles.searchbar, style]}
      inputStyle={[styles.input, inputStyle]}
    />
  );
};

const styles = StyleSheet.create({
  searchbar: {
    borderRadius: 8,
    elevation: 1,
  },
  input: {
    fontSize: 16,
  },
});

export default SearchBar;
