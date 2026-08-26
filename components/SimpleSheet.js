import React, { forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { Modal, View, Pressable, StyleSheet } from 'react-native';

/**
 * Minimal "bottom sheet" replacement that does NOT depend on Reanimated.
 * It supports the subset of the API this app uses:
 * - ref.current?.snapToIndex(0) -> open
 * - ref.current?.close() -> close
 */
const SimpleSheet = forwardRef(({ children, onClose }, ref) => {
  const [visible, setVisible] = useState(false);

  const close = useCallback(() => {
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const snapToIndex = useCallback((_index) => {
    // The app only uses snapToIndex(0) as "open".
    setVisible(true);
  }, []);

  useImperativeHandle(ref, () => ({
    snapToIndex,
    close,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={styles.sheet}>
          {children}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    maxHeight: '85%',
  },
});

export default SimpleSheet;




