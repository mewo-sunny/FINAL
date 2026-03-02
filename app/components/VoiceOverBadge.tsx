import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function VoiceOverBadge() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'dark'];

    return (
        <View style={styles.container}>
            <IconSymbol name="speaker.wave.2.fill" size={16} color={theme.tint} />
            <Text style={[styles.text, { color: theme.tint }]}>Voice Enabled</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 229, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(0, 229, 255, 0.3)',
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});
