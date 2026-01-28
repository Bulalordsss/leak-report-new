import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/utils/authStore';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const { login, isLoading } = useAuthStore();

    const onFinish = async () => {
        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }
        try {
            console.log('[login] attempting', { username });
            await login(username, password);
            router.replace("/(tabs)");
        } catch (error) {
            alert("Invalid username or password");
        }
    };

    return (
        <View style={styles.page}>
            <View style={styles.container}>
                <View style={styles.logoWrap}>
                    <Image
                        source={require('../assets/images/logo-hdcwd-1.png')}
                        accessibilityLabel="Logo"
                        style={{ width: 120, height: 120 }}
                        contentFit="contain"
                    />
                </View>

                <Text style={styles.title}>LEAK REPORT</Text>

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
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        onPress={onFinish}
                        style={styles.loginButton}
                        disabled={isLoading}
                    >
                        <Text style={styles.loginButtonText}>
                            {isLoading ? "LOGGING IN..." : "LOGIN"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={{ color: '#6c6c6c' }}>© DAVAO CITY WATER DISTRICT 2021</Text>
                    <Text style={{ fontSize: 12, marginTop: 4, color: '#999' }}>ver. 2.0.0</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        paddingTop: 40,
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