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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import {
  useListMyScores,
  getListMyScoresQueryKey,
  type LeaderboardEntry,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth as usePlayerName } from '@/contexts/AuthContext';
import { useAuth as useAccountAuth } from '@/lib/auth';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ScoreRow({ entry }: { entry: LeaderboardEntry }) {
  const colors = useColors();
  const pct = Math.round(entry.percentage);
  const pctColor =
    pct >= 90 ? colors.success : pct >= 70 ? colors.amber : pct >= 50 ? colors.orange : colors.destructive;

  return (
    <View style={[rowStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.course, { color: colors.foreground }]} numberOfLines={1}>
          {entry.courseName}
        </Text>
        <Text style={[rowStyles.meta, { color: colors.mutedForeground }]}>
          {entry.level} · {entry.score} pts · {formatDate(entry.createdAt)}
          {entry.timedMode ? ' · timed' : ''}
        </Text>
      </View>
      <Text style={[rowStyles.pct, { color: pctColor }]}>{pct}%</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { playerName, signIn, signOut } = usePlayerName();
  const {
    user,
    isLoading: accountLoading,
    isAuthenticated,
    login,
    logout,
  } = useAccountAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(playerName ?? '');
  const [saving, setSaving] = useState(false);

  const scoresQuery = useListMyScores({
    query: { enabled: isAuthenticated, queryKey: getListMyScoresQueryKey() },
  });

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

  const accountName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || null;
  const displayName = isAuthenticated && accountName ? accountName : playerName;
  const scores = scoresQuery.data ?? [];
  const best = scores.length ? Math.max(...scores.map((s) => Math.round(s.percentage))) : null;

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
          {isAuthenticated && user?.profileImageUrl ? (
            <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}>
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                {(displayName ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {!editing && (
            <Text style={[styles.displayName, { color: colors.foreground }]}>{displayName}</Text>
          )}
          <Text style={[styles.displayRole, { color: colors.mutedForeground }]}>
            {isAuthenticated ? user?.email ?? 'Signed in' : 'Quiz Player'}
          </Text>
        </View>

        {/* Account card — sign in to tie scores to an account */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>ACCOUNT</Text>
          {accountLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : isAuthenticated ? (
            <TouchableOpacity
              style={[styles.nameRow, { borderColor: colors.border }]}
              onPress={logout}
              activeOpacity={0.7}
            >
              <Text style={[styles.nameValue, { color: colors.foreground }]}>Log out</Text>
              <Ionicons name="log-out-outline" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : (
            <>
              <Text style={[styles.infoText, { color: colors.mutedForeground, marginBottom: 12 }]}>
                Sign in so your quiz scores are tied to your account and your history follows you.
              </Text>
              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                onPress={login}
                activeOpacity={0.8}
              >
                <Ionicons name="log-in-outline" size={18} color={colors.primaryForeground} />
                <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>Log in</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Score history (signed-in only) */}
        {isAuthenticated && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>SCORE HISTORY</Text>
            <View style={[styles.statsRow, { borderColor: colors.border }]}>
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{scores.length}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Saved scores</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {best !== null ? `${best}%` : '—'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Best result</Text>
              </View>
            </View>
            {scoresQuery.isLoading ? (
              <ActivityIndicator style={{ marginTop: 8 }} color={colors.accent} />
            ) : scores.length === 0 ? (
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                No saved scores yet. Finish a quiz and save your score — it will show up here.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {scores.map((entry) => (
                  <ScoreRow key={entry.id} entry={entry} />
                ))}
              </View>
            )}
          </View>
        )}

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
            { icon: 'shield' as const, text: 'Sign in to tie scores to your account; otherwise just a display name is used.' },
            { icon: 'refresh-cw' as const, text: 'You can change your display name anytime from this screen.' },
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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  loginBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    marginBottom: 12,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.5 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  statDivider: { width: 1, height: 32 },
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

const rowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  course: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  pct: { fontFamily: 'Inter_700Bold', fontSize: 18 },
});
