import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  NavigationContainer,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import React from 'react';
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  success: string;
  warning: string;
  shadow: string;
};

const lightPalette: Palette = {
  background: '#F2F6FF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3FF',
  text: '#11243D',
  textMuted: '#61738C',
  border: '#DCE4F5',
  primary: '#2D6BFF',
  success: '#25A35A',
  warning: '#EF8E2F',
  shadow: 'rgba(17, 36, 61, 0.12)',
};

const darkPalette: Palette = {
  background: '#0B1220',
  surface: '#121D31',
  surfaceAlt: '#1A2945',
  text: '#E8F1FF',
  textMuted: '#8CA1C0',
  border: '#25385A',
  primary: '#73A8FF',
  success: '#45D483',
  warning: '#FFAE57',
  shadow: 'rgba(0, 0, 0, 0.4)',
};

const robots = [
  {
    id: 'r1',
    name: '阿尔法巡检',
    status: '在线',
    battery: '92%',
    location: 'A 区产线',
  },
  {
    id: 'r2',
    name: '猎犬守卫',
    status: '任务中',
    battery: '61%',
    location: 'B 区仓储',
  },
  {
    id: 'r3',
    name: '夜行者',
    status: '待命',
    battery: '84%',
    location: '主控大厅',
  },
  {
    id: 'r4',
    name: '小黑',
    status: '离线',
    battery: '0%',
    location: '维护工位',
  },
];

const roles = [
  { id: 'p1', name: '巡检员', desc: '负责巡检路径与异常上报' },
  { id: 'p2', name: '安防员', desc: '负责门禁联动与告警确认' },
  { id: 'p3', name: '调度员', desc: '负责任务编排与优先级管理' },
  { id: 'p4', name: '访客', desc: '只读访问，查看实时状态' },
];

const discoverItems = [
  { id: 'd1', title: '新能力中心', desc: '预留: 后续接入插件与技能商店' },
  { id: 'd2', title: '任务模板', desc: '预留: 快速创建巡检/守卫任务' },
  { id: 'd3', title: '场景联动', desc: '预留: 机器人 + 设备自动化' },
];

const myMenus = [
  { id: 'm1', title: '设置', desc: '语言、主题、通知偏好' },
  { id: 'm2', title: '参数管理', desc: '速度、阈值、巡检间隔等' },
  { id: 'm3', title: '设备管理', desc: '绑定设备、固件升级、连接状态' },
  { id: 'm4', title: '账号与安全', desc: '权限、登录设备、隐私配置' },
  { id: 'm5', title: '帮助与反馈', desc: '文档、问题反馈、关于' },
];

const Tab = createBottomTabNavigator();

function usePalette() {
  return useColorScheme() === 'light' ? lightPalette : darkPalette;
}

function BackgroundGlow({ palette }: { palette: Palette }) {
  const topGlowStyle = { backgroundColor: palette.primary };
  const bottomGlowStyle = { backgroundColor: palette.success };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View
        style={[styles.glowCircle, styles.glowCircleTopRight, topGlowStyle]}
      />
      <View
        style={[
          styles.glowCircle,
          styles.glowCircleBottomLeft,
          bottomGlowStyle,
        ]}
      />
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  palette,
}: {
  title: string;
  subtitle: string;
  palette: Palette;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>
        {title}
      </Text>
      <Text style={[styles.sectionSubtitle, { color: palette.textMuted }]}>
        {subtitle}
      </Text>
    </View>
  );
}

function RobotScreen() {
  const palette = usePalette();

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: palette.background }]}
    >
      <BackgroundGlow palette={palette} />
      <SectionHeader
        title="机器人"
        subtitle="实时状态与电量"
        palette={palette}
      />
      <FlatList
        data={robots}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                shadowColor: palette.shadow,
              },
            ]}
          >
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                {item.name}
              </Text>
              <Text
                style={[
                  styles.badge,
                  {
                    color:
                      item.status === '离线'
                        ? palette.warning
                        : palette.success,
                    backgroundColor: palette.surfaceAlt,
                  },
                ]}
              >
                {item.status}
              </Text>
            </View>
            <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
              电量 {item.battery} · 位置 {item.location}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function RoleScreen() {
  const palette = usePalette();

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: palette.background }]}
    >
      <BackgroundGlow palette={palette} />
      <SectionHeader title="角色" subtitle="系统角色与职责" palette={palette} />
      <FlatList
        data={roles}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                shadowColor: palette.shadow,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
              {item.desc}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function DiscoverScreen() {
  const palette = usePalette();

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: palette.background }]}
    >
      <BackgroundGlow palette={palette} />
      <SectionHeader title="发现" subtitle="预留功能入口" palette={palette} />
      <FlatList
        data={discoverItems}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                shadowColor: palette.shadow,
              },
            ]}
          >
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                {item.title}
              </Text>
              <Text
                style={[
                  styles.badge,
                  {
                    color: palette.primary,
                    backgroundColor: palette.surfaceAlt,
                  },
                ]}
              >
                预留
              </Text>
            </View>
            <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
              {item.desc}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function MyScreen() {
  const palette = usePalette();

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: palette.background }]}
    >
      <BackgroundGlow palette={palette} />
      <ScrollView contentContainerStyle={styles.listContent}>
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              shadowColor: palette.shadow,
            },
          ]}
        >
          <Text style={[styles.profileName, { color: palette.text }]}>
            Elric 管理员
          </Text>
          <Text style={[styles.profileMeta, { color: palette.textMuted }]}>
            2 台在线机器人 · 1 条待处理告警
          </Text>
        </View>

        {myMenus.map(item => (
          <View
            key={item.id}
            style={[
              styles.menuRow,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                shadowColor: palette.shadow,
              },
            ]}
          >
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: palette.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.menuMeta, { color: palette.textMuted }]}>
                {item.desc}
              </Text>
            </View>
            <Text style={[styles.menuArrow, { color: palette.textMuted }]}>
              {'>'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabIcon({
  label,
  focused,
  palette,
}: {
  label: string;
  focused: boolean;
  palette: Palette;
}) {
  const inactiveTextStyle = { color: palette.textMuted };

  return (
    <View
      style={[
        styles.tabIcon,
        {
          backgroundColor: focused ? palette.primary : palette.surfaceAlt,
          borderColor: focused ? palette.primary : palette.border,
        },
      ]}
    >
      <Text
        style={[
          styles.tabIconText,
          focused ? styles.tabIconTextActive : inactiveTextStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function tabBarIcon(routeName: string, focused: boolean, palette: Palette) {
  const symbolMap: Record<string, string> = {
    机器人: '机',
    角色: '角',
    发现: '发',
    我的: '我',
  };

  return (
    <TabIcon
      focused={focused}
      label={symbolMap[routeName] ?? '·'}
      palette={palette}
    />
  );
}

function createScreenOptions(palette: Palette) {
  return ({ route }: { route: { name: string } }) => ({
    headerShown: false,
    tabBarActiveTintColor: palette.primary,
    tabBarInactiveTintColor: palette.textMuted,
    tabBarStyle: {
      backgroundColor: palette.surface,
      borderTopColor: palette.border,
      height: 64,
      paddingBottom: 8,
      paddingTop: 8,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    tabBarIcon: ({ focused }: { focused: boolean }) =>
      tabBarIcon(route.name, focused, palette),
  });
}

function AppTabs() {
  const palette = usePalette();

  return (
    <Tab.Navigator screenOptions={createScreenOptions(palette)}>
      <Tab.Screen name="机器人" component={RobotScreen} />
      <Tab.Screen name="角色" component={RoleScreen} />
      <Tab.Screen name="发现" component={DiscoverScreen} />
      <Tab.Screen name="我的" component={MyScreen} />
    </Tab.Navigator>
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const palette = usePalette();

  const navigationTheme = isDarkMode
    ? {
        ...NavigationDarkTheme,
        colors: {
          ...NavigationDarkTheme.colors,
          background: palette.background,
          card: palette.surface,
          text: palette.text,
          border: palette.border,
          primary: palette.primary,
        },
      }
    : {
        ...NavigationDefaultTheme,
        colors: {
          ...NavigationDefaultTheme.colors,
          background: palette.background,
          card: palette.surface,
          text: palette.text,
          border: palette.border,
          primary: palette.primary,
        },
      };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer theme={navigationTheme}>
        <AppTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  glowCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 220,
  },
  glowCircleTopRight: {
    top: -80,
    right: -40,
    opacity: 0.18,
  },
  glowCircleBottomLeft: {
    bottom: 40,
    left: -70,
    opacity: 0.12,
  },
  sectionHeader: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  profileCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    marginBottom: 4,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
  },
  profileMeta: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  menuRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  menuContent: {
    flex: 1,
    paddingRight: 10,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  menuMeta: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
  },
  menuArrow: {
    fontSize: 16,
    fontWeight: '700',
  },
  tabIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabIconText: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 12,
  },
  tabIconTextActive: {
    color: '#FFFFFF',
  },
});

export default App;
