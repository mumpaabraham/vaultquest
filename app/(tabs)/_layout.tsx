import { Tabs, Redirect } from 'expo-router';
import { Image, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/authStore';

const TAB_ICONS = {
  home:        require('../../assets/home.png'),
  missions:    require('../../assets/tasks.png'),
  spin:        require('../../assets/spin.png'),
  leaderboard: require('../../assets/leaderboard.png'),
  referrals:   require('../../assets/referrals.png'),
  vault:       require('../../assets/vault.png'),
  profile:     require('../../assets/profile.png'),
};

function ImgIcon({
  source,
  focused,
  size = 26,
}: {
  source: any;
  focused: boolean;
  size?: number;
}) {
  return (
    <Image
      source={source}
      style={{ width: size, height: size, opacity: focused ? 1 : 0.45 }}
      resizeMode="contain"
    />
  );
}

export default function TabsLayout() {
  const { user, loading } = useAuthStore();

  if (!loading && !user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, size }) => (
            <ImgIcon source={TAB_ICONS.home} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Missions',
          tabBarIcon: ({ focused, size }) => (
            <ImgIcon source={TAB_ICONS.missions} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="spin"
        options={{
          title: 'Spin',
          tabBarIcon: ({ focused, size }) => (
            <ImgIcon source={TAB_ICONS.spin} focused={focused} size={size + 6} />
          ),
        }}
      />
      <Tabs.Screen
        name="vaults"
        options={{
          title: 'Vaults',
          tabBarIcon: ({ focused, size }) => (
            <ImgIcon source={TAB_ICONS.vault} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, size }) => (
            <ImgIcon source={TAB_ICONS.profile} focused={focused} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0d1526',
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    height: Platform.OS === 'ios' ? 84 : 64,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
