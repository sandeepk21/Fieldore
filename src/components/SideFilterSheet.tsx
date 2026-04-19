import { X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SideFilterSheetProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  badgeCount?: number;
  onClose: () => void;
  onClear?: () => void;
  children: React.ReactNode;
};

const SHEET_WIDTH = Math.min(Dimensions.get('window').width * 0.86, 360);

const SideFilterSheet: React.FC<SideFilterSheetProps> = ({
  visible,
  title,
  subtitle,
  badgeCount = 0,
  onClose,
  onClear,
  children,
}) => {
  const [isMounted, setIsMounted] = useState(visible);
  const translateX = useRef(new Animated.Value(-SHEET_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -SHEET_WIDTH,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });
  }, [backdropOpacity, translateX, visible]);

  if (!isMounted) {
    return null;
  }

  return (
    <Modal visible={isMounted} transparent animationType="none" onRequestClose={onClose}>
      
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateX }] }]}>
          <View
            style={[
              styles.safeArea,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.title}>{title}</Text>
                  {badgeCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{badgeCount}</Text>
                    </View>
                  ) : null}
                </View>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {onClear ? (
              <TouchableOpacity style={styles.clearButton} onPress={onClear}>
                <Text style={styles.clearButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.content}>{children}</View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
  sheet: {
    width: SHEET_WIDTH,
    height: '100%',
    backgroundColor: '#ffffff',
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    borderRightWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 12, height: 0 },
    elevation: 18,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
    fontWeight: '600',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1d4ed8',
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: 18,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  content: {
    flex: 1,
    marginTop: 18,
  },
});

export default SideFilterSheet;
