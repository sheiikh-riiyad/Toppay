import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { palette } from '@/constants/toppay';

function HomeIcon({ color, size }: { color: string; size: number }) {
  return <MaterialIcons size={size} name="home" color={color} />;
}

function ActivityIcon({ color, size }: { color: string; size: number }) {
  return <MaterialIcons size={size} name="history" color={color} />;
}

function ScanIcon({ color, size }: { color: string; size: number }) {
  return <MaterialIcons size={size + 2} name="qr-code-scanner" color={color} />;
}

function ServicesIcon({ color, size }: { color: string; size: number }) {
  return <MaterialIcons size={size} name="grid-view" color={color} />;
}

function ProfileIcon({ color, size }: { color: string; size: number }) {
  return <MaterialIcons size={size} name="person" color={color} />;
}

export default React.memo(function TabLayout() {
  const { t } = useTranslation();

  const screenOptions = useMemo(() => ({
    tabBarActiveTintColor: palette.primary,
    tabBarInactiveTintColor: '#82908A',
    headerShown: false,
    // tabBarButton: HapticTab,
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: 'bold' as const,
    },
    tabBarStyle: {
      backgroundColor: palette.surface,
      borderTopColor: palette.border,
      height: 68,
      paddingBottom: 9,
      paddingTop: 8,
    },
  }), []);

  const indexOptions = useMemo(() => ({
    title: t('tabs.home'),
    tabBarLabel: t('tabs.home'),
    tabBarIcon: HomeIcon,
  }), [t]);

  const activityOptions = useMemo(() => ({
    title: t('tabs.activity'),
    tabBarLabel: t('tabs.activity'),
    tabBarIcon: ActivityIcon,
  }), [t]);

  const scanOptions = useMemo(() => ({
    title: t('tabs.scan'),
    tabBarLabel: t('tabs.scan'),
    tabBarIcon: ScanIcon,
  }), [t]);

  const servicesOptions = useMemo(() => ({
    title: t('tabs.services'),
    tabBarLabel: t('tabs.services'),
    tabBarIcon: ServicesIcon,
  }), [t]);

  const profileOptions = useMemo(() => ({
    title: t('tabs.profile'),
    tabBarLabel: t('tabs.profile'),
    tabBarIcon: ProfileIcon,
  }), [t]);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={indexOptions}
      />
      <Tabs.Screen
        name="activity"
        options={activityOptions}
      />
      <Tabs.Screen
        name="scan"
        options={scanOptions}
      />
      <Tabs.Screen
        name="services"
        options={servicesOptions}
      />
      <Tabs.Screen
        name="profile"
        options={profileOptions}
      />
    </Tabs>
  );
});
