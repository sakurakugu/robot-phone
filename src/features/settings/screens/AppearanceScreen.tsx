import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppPreferences } from '../../../app/preferences/AppPreferences';
import { usePalette } from '../../../app/theme/palette';

type OptionItem<T extends string> = { value: T; label: string; desc?: string };

const THEME_OPTIONS: OptionItem<'light' | 'dark' | 'system'>[] = [
  { value: 'light', label: '浅色模式', desc: '始终使用浅色界面' },
  { value: 'dark', label: '深色模式', desc: '始终使用深色界面' },
  { value: 'system', label: '跟随系统', desc: '跟随手机系统主题自动切换' },
];

const ORIENTATION_OPTIONS: OptionItem<'portrait' | 'landscape'>[] = [
  { value: 'portrait', label: '竖向', desc: '主页以竖向方向显示' },
  { value: 'landscape', label: '横向', desc: '主页以横向方向显示' },
];

function OptionRow<T extends string>({
  item,
  selected,
  onSelect,
}: {
  item: OptionItem<T>;
  selected: boolean;
  onSelect: () => void;
}) {
  const palette = usePalette();
  const themedStyles = useMemo(
    () => ({
      row: {
        backgroundColor: palette.surface,
        borderColor: selected ? palette.primary : palette.border,
      },
      label: {
        color: selected ? palette.primary : palette.text,
      },
      desc: {
        color: palette.textMuted,
      },
      radio: {
        borderColor: selected ? palette.primary : palette.border,
        backgroundColor: selected ? palette.primary : 'transparent',
      },
    }),
    [palette, selected],
  );
  return (
    <Pressable
      style={[styles.optionRow, themedStyles.row]}
      onPress={onSelect}
    >
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, themedStyles.label]}>
          {item.label}
        </Text>
        {item.desc ? (
          <Text style={[styles.optionDesc, themedStyles.desc]}>
            {item.desc}
          </Text>
        ) : null}
      </View>
      <View style={[styles.radio, themedStyles.radio]} />
    </Pressable>
  );
}

export function AppearanceScreen() {
  const palette = usePalette();
  const { themeMode, setThemeMode, homeOrientation, setHomeOrientation } =
    useAppPreferences();
  const themedStyles = useMemo(
    () => ({
      container: { flex: 1, backgroundColor: palette.background },
      sectionHeader: { color: palette.textMuted },
      group: { borderColor: palette.border },
      divider: { backgroundColor: palette.border },
    }),
    [palette],
  );

  return (
    <ScrollView
      style={themedStyles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.sectionHeader, themedStyles.sectionHeader]}>
        主题模式
      </Text>
      <View style={[styles.group, themedStyles.group]}>
        {THEME_OPTIONS.map((item, idx) => (
          <View key={item.value}>
            <OptionRow
              item={item}
              selected={themeMode === item.value}
              onSelect={() => setThemeMode(item.value)}
            />
            {idx < THEME_OPTIONS.length - 1 && (
              <View style={[styles.divider, themedStyles.divider]} />
            )}
          </View>
        ))}
      </View>

      <Text style={[styles.sectionHeader, themedStyles.sectionHeader]}>
        主页方向
      </Text>
      <View style={[styles.group, themedStyles.group]}>
        {ORIENTATION_OPTIONS.map((item, idx) => (
          <View key={item.value}>
            <OptionRow
              item={item}
              selected={homeOrientation === item.value}
              onSelect={() => setHomeOrientation(item.value)}
            />
            {idx < ORIENTATION_OPTIONS.length - 1 && (
              <View style={[styles.divider, themedStyles.divider]} />
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 16,
    marginHorizontal: 20,
  },
  group: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 0,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: 12,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});
