import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import HomeScreen from '../screens/HomeScreen';
import QuickAnalysisScreen from '../screens/QuickAnalysisScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Home: 'home',
            Analyze: 'chart-bar',
            Learn: 'school',
            Profile: 'account',
          };
          return <Icon name={icons[route.name] || 'circle'} size={size} color={color} />;
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Analyze" component={QuickAnalysisScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Main"
          component={HomeTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="QuickAnalysis" component={QuickAnalysisScreen} options={{ title: 'Quick Analysis' }} />
        <Stack.Screen name="SmartAnalysis" component={QuickAnalysisScreen} options={{ title: 'Smart Analysis' }} />
        <Stack.Screen name="PaperCheck" component={QuickAnalysisScreen} options={{ title: 'Paper Check' }} />
        <Stack.Screen name="GuardianCheck" component={QuickAnalysisScreen} options={{ title: 'Guardian' }} />
        <Stack.Screen name="Certification" component={QuickAnalysisScreen} options={{ title: 'Certification' }} />
        <Stack.Screen name="Learn" component={QuickAnalysisScreen} options={{ title: 'Learn' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
