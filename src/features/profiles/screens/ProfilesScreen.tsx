import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { AccountBar } from '@/features/account/components/AccountBar';
import { ProfileFormScreen } from '@/features/profiles/screens/ProfileFormScreen';
import { useActiveProfile } from '@/features/profiles/hooks/useActiveProfile';
import type { Profile } from '@/types/profile';
import type { ProfileInput } from '@/features/profiles/domain/profileValidation';

export default function ProfilesScreen() {
  const {
    activeProfile,
    profiles,
    loading,
    error,
    syncNotice,
    setActiveProfile,
    addProfile,
    updateProfile,
  } = useActiveProfile();
  const [formVisible, setFormVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openCreate = () => {
    setActionError(null);
    setEditingProfile(null);
    setFormVisible(true);
  };

  const openEdit = (profile: Profile) => {
    setActionError(null);
    setEditingProfile(profile);
    setFormVisible(true);
  };

  const closeForm = () => setFormVisible(false);

  const saveDraft = (draft: ProfileInput) => {
    if (draft.id) return updateProfile({ ...draft, id: draft.id });
    return addProfile(draft);
  };

  const selectProfile = async (profileId: string) => {
    setActionError(null);
    try {
      await setActiveProfile(profileId);
    } catch (cause: unknown) {
      setActionError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <View style={styles.container}>
      <AccountBar />
      <View style={styles.header}>
        <Text variant="headlineSmall">Profiles</Text>
        <Button mode="contained" onPress={openCreate} disabled={loading}>
          <Text>Add profile</Text>
        </Button>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!actionError && <Text style={styles.error}>{actionError}</Text>}
      {!!syncNotice && <Text accessibilityLiveRegion="polite">{syncNotice}</Text>}
      {loading ? (
        <Text>Loading profiles…</Text>
      ) : profiles.length === 0 ? (
        <Text style={styles.empty}>No profiles yet. Add one to personalize your workouts.</Text>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(profile) => profile.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card
              mode={activeProfile?.id === item.id ? 'contained' : 'outlined'}
              style={styles.card}
            >
              <Card.Title title={item.name} subtitle={`${item.heightCm} cm`} />
              <Card.Actions>
                <Button
                  onPress={() => void selectProfile(item.id)}
                  disabled={activeProfile?.id === item.id}
                >
                  {activeProfile?.id === item.id ? 'Active' : 'Use profile'}
                </Button>
                <Button onPress={() => openEdit(item)}>
                  <Text>Edit</Text>
                </Button>
              </Card.Actions>
            </Card>
          )}
        />
      )}

      {formVisible && (
        <ProfileFormScreen
          profile={editingProfile}
          onSave={saveDraft}
          onCancel={closeForm}
          onSaved={closeForm}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 48, gap: 12 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  list: { paddingBottom: 24 },
  card: { marginBottom: 12 },
  empty: { paddingVertical: 24, textAlign: 'center' },
  error: { color: '#c62828' },
});
