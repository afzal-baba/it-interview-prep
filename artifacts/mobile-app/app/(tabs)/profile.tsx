import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { playerName, signIn, signOut } = useAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(playerName ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = newName.trim();
    if (trimmed.length < 2) return;
    setSaving(true);
    await signIn(trimmed);
    setSaving(false);
    setEditing(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Change Name',
      'This will take you back to the welcome screen where you can enter a new name.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: colors.accent }]}>MY ACCOUNT</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: (Platform.OS === 'web' ? 84 : insets.bottom) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {(playerName ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          {!editing && (
            <Text style={[styles.displayName, { color: colors.foreground }]}>{playerName}</Text>
          )}
          <Text style={[styles.displayRole, { color: colors.mutedForeground }]}>Quiz Player</Text>
        </View>

        {/* Edit name card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>DISPLAY NAME</Text>

          {editing ? (
            <>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                maxLength={32}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                placeholderTextColor={colors.mutedForeground}
              />
              <View style={styles.editBtns}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => { setEditing(false); setNewName(playerName ?? ''); }}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: colors.primary, opacity: newName.trim().length >= 2 ? 1 : 0.4 },
                  ]}
                  onPress={handleSave}
                  disabled={saving || newName.trim().length < 2}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.nameRow, { borderColor: colors.border }]}
              onPress={() => { setNewName(playerName ?? ''); setEditing(true); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.nameValue, { color: colors.foreground }]}>{playerName}</Text>
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Info card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>ABOUT</Text>
          {[
            { icon: 'info' as const, text: 'Your name appears on the global leaderboard.' },
            { icon: 'shield' as const, text: 'No email or password — just a display name.' },
            { icon: 'refresh-cw' as const, text: 'You can change it anytime from this screen.' },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.infoRow}>
              <Feather name={icon} size={14} color={colors.accent} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Change name (sign out) */}
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.destructive + '40' }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={18} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Switch Player Name</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  eyebrow: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  body: {
    padding: 20,
    gap: 16,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarInitial: {
    fontFamily: 'Inter_700Bold',
    fontSize: 34,
  },
  displayName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  displayRole: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  nameValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    marginBottom: 12,
  },
  editBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  infoIcon: { marginTop: 2 },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  signOutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
});
