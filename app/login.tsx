import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/utils/authStore';
import { useSettingsStore } from '@/utils/settingsStore';
import { useMapStore } from '@/utils/mapStore';
import { useReportsStore } from '@/utils/reportsStore';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, isLoading } = useAuthStore();
    const { checkCustomerData, loadOfflineMapPreference } = useSettingsStore();
    const { checkExistingMap } = useMapStore();
    const { initialize: initializeReports } = useReportsStore();

    const onFinish = async () => {
        // Prevent multiple submissions
        if (isSubmitting || isLoading) {
            return;
        }

        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }

        setIsSubmitting(true);
        try {
            console.log('[login] attempting', { username });
            await login(username, password);
            
            // Navigate to splash loading screen instead of loading data here
            router.replace("/screens/splashLoading");
        } catch (error) {
            setIsSubmitting(false);
            alert("Invalid username or password");
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.page}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.container}>
                    <View style={styles.logoWrap}>
                        <Image
                            source={require('../assets/images/logo-hdcwd-1.png')}
                            accessibilityLabel="Logo"
                            style={{ width: 120, height: 120 }}
                            contentFit="contain"
                        />
                    </View>

                    <Text style={styles.title}>LEAK ALERT</Text>

                    {/* Native form */}
                    <View style={{ gap: 12 }}>
                        <View style={styles.inputRow}>
                            <Ionicons name="person-outline" size={20} color="#666" style={{ marginRight: 8 }} />
                            <TextInput
                                value={username}
                                onChangeText={setUsername}
                                placeholder="Username"
                                style={styles.input}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <Ionicons name="lock-closed-outline" size={20} color="#666" style={{ marginRight: 8 }} />
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Password"
                                style={styles.input}
                                secureTextEntry={!showPassword}
                                textContentType="password"
                                autoCorrect={false}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity 
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons 
                                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                                    size={20} 
                                    color="#666" 
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={onFinish}
                            style={styles.loginButton}
                            disabled={isLoading || isSubmitting}
                        >
                            <Text style={styles.loginButtonText}>
                                {(isLoading || isSubmitting) ? "LOGGING IN..." : "LOGIN"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={{ color: '#6c6c6c' }}>© DAVAO CITY WATER DISTRICT</Text>
                        <Text style={{ fontSize: 12, marginTop: 4, color: '#999' }}>ver. 1.3</Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    container: {
        width: 360,
        alignSelf: 'center',
    },
    logoWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    title: {
        textAlign: 'center',
        color: '#17336d',
        marginBottom: 24,
        letterSpacing: 1,
        fontSize: 20,
        fontWeight: '600',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
    eyeButton: {
        padding: 4,
        marginLeft: 4,
    },
    loginButton: {
        marginTop: 8,
        borderRadius: 14,
        backgroundColor: '#1f3a8a',
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#1f3a8a',
        shadowOpacity: 0.24,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
    },
    loginButtonText: {
        color: '#fff',
        fontWeight: '600',
        letterSpacing: 1,
    },
    footer: {
        marginTop: 36,
        alignItems: 'center',
    },
});