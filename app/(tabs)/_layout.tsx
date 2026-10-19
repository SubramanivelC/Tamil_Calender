import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useT } from '@/localization';

export default function TabsLayout() {
  const colors = useThemeColors().colors;
  const t = useT();

  const tabs: {
    name: 'index' | 'calendar' | 'festivals' | 'settings';
    titleKey: string;
    icon: keyof typeof Ionicons.glyphMap;
    focusedIcon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { name: 'index', titleKey: 'tabHome', icon: 'home-outline', focusedIcon: 'home' },
    { name: 'calendar', titleKey: 'tabCalendar', icon: 'calendar-outline', focusedIcon: 'calendar' },
    { name: 'festivals', titleKey: 'tabFestivals', icon: 'star-outline', focusedIcon: 'star' },
    { name: 'settings', titleKey: 'tabSettings', icon: 'settings-outline', focusedIcon: 'settings' },
  ];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.divider,
        },
        tabBarLabelStyle: { fontSize: 11 },
        lazy: true,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.titleKey),
            tabBarLabel: t(tab.titleKey),
            tabBarAccessibilityLabel: `${t(tab.titleKey)} tab`,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.focusedIcon : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
      {/* Day details renders INSIDE the tab navigator (hidden from the tab
          bar) so the bottom menu stays visible on that screen. URL is still
          /day-details because the (tabs) group is stripped. */}
      <Tabs.Screen
        name="day-details"
        options={{ href: null }}
      />
      {/* My Rasi screen stays routable (deep links) but out of the bottom
          menu; its card lives in the Calendar tab's Today view now. */}
      <Tabs.Screen
        name="my-rasi"
        options={{ href: null }}
      />
      {/* Search moved out of the bottom menu — now opened from Settings
          (and still routable from the Home search icon / quick action). */}
      <Tabs.Screen
        name="search"
        options={{ href: null }}
      />
    </Tabs>
  );
}
