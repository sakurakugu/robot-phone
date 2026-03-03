import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Palette } from '../../app/theme/palette';

export function Screen({
  palette,
  title,
  subtitle,
  headerRight,
  children,
  unsafeTop = false,
}: {
  palette: Palette;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  unsafeTop?: boolean;
}) {
  const showHeader = !!title || !!subtitle || !!headerRight;
  return (
    <SafeAreaView
      edges={unsafeTop ? ['left', 'right', 'bottom'] : undefined}
      style={[styles.screen, { backgroundColor: palette.background }]}
    >
      {showHeader ? (
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextWrap}>
              {title ? (
                <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
              ) : null}
              {subtitle ? (
                <Text style={[styles.subtitle, { color: palette.textMuted }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {headerRight ? <View>{headerRight}</View> : null}
          </View>
        </View>
      ) : null}
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 6,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '500',
  },
});
