import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useAuthStore } from '@/utils/authStore';
import { useSettingsStore } from '@/utils/settingsStore';
import { useMapStore } from '@/utils/mapStore';
import { useReportsStore } from '@/utils/reportsStore';

export default function SplashLoadingScreen() {
  const { restoreSession, isAuthenticated } = useAuthStore();
  const { checkCustomerData, loadOfflineMapPreference } = useSettingsStore();
  const { checkExistingMap } = useMapStore();
  const { initialize: initializeReports } = useReportsStore();
  
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for loading indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Check authentication and initialize data
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Start minimum delay timer
      const startTime = Date.now();
      const minimumDisplayTime = 2500; // 2.5 seconds minimum

      setLoadingStatus('Checking authentication...');
      
      // Restore session and check if token is valid
      const isValid = await restoreSession();

      if (isValid && isAuthenticated) {
        // User is authenticated, load offline data
        setLoadingStatus('Loading offline preferences...');
        
        try {
          // Load offline map preference first
          await loadOfflineMapPreference();
          
          setLoadingStatus('Checking customer data...');
          
          // Check customer data - this runs synchronously to ensure it's loaded
          await checkCustomerData();
          
          setLoadingStatus('Checking offline maps...');
          
          // Check existing map
          await checkExistingMap();
          
          setLoadingStatus('Initializing reports...');
          
          // Initialize reports store to load customer data for search
          // This will check location and prepare data without fetching meters yet
          await initializeReports();
          
          setLoadingStatus('Ready!');
          
        } catch (dataError) {
          console.error('Error loading offline data:', dataError);
          // Continue to app even if offline data loading fails
          setLoadingStatus('Ready!');
        }

        // Calculate remaining time to show splash
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minimumDisplayTime - elapsedTime);
        
        // Wait for remaining time before navigating
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        router.replace('/(tabs)');
      } else {
        // Token is invalid or user is not authenticated
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minimumDisplayTime - elapsedTime);
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error during app initialization:', error);
      setLoadingStatus('Error occurred');
      
      // Wait a bit before redirecting on error
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // On error, go to login
      router.replace('/login');
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo-hdcwd-1.png')}
            accessibilityLabel="DCWD Logo"
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        {/* App Name */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>LEAK ALERT</Text>
          <Text style={styles.subtitle}>Davao City Water District</Text>
        </View>

        {/* Loading Animation */}
        <Animated.View 
          style={[
            styles.loadingContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <ActivityIndicator size="large" color="#1f3a8a" />
          <Text style={styles.loadingText}>{loadingStatus}</Text>
        </Animated.View>
      </Animated.View>

      {/* Background decoration */}
      <View style={styles.decorationTop} />
      <View style={styles.decorationBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#17336d',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  version: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: '#9ca3af',
  },
  decorationTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#eef2ff',
    opacity: 0.5,
  },
  decorationBottom: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#eef2ff',
    opacity: 0.3,
  },
});
