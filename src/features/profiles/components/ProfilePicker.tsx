import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button, Modal, Text, TextInput } from 'react-native-paper';
import type { Profile } from '@/types/profile';
import { ProfileAvatar } from './ProfileAvatar';

type ProfilePickerProps = {
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  onProfileSelect: (profileId: string) => void;
  onProfileCancel?: () => void;
  title?: string;
};

export default function ProfilePicker({
  profiles,
  loading,
  error,
  onProfileSelect,
  onProfileCancel,
  title = 'Select Profile',
}: ProfilePickerProps) {
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const cancelNotified = useRef(false);

  const openPicker = () => {
    cancelNotified.current = false;
    setVisible(true);
  };

  const closePicker = () => {
    setVisible(false);
    setSearchQuery('');
  };

  const cancelPicker = () => {
    closePicker();
    if (!cancelNotified.current) onProfileCancel?.();
    cancelNotified.current = true;
  };

  const filteredProfiles = profiles.filter((profile) =>
    `${profile.name} ${profile.id}`.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <View>
      <Button mode="outlined" onPress={openPicker} disabled={loading} accessibilityLabel={title}>
        <Text>{title}</Text>
      </Button>

      <Modal
        visible={visible}
        onDismiss={() => {
          if (!cancelNotified.current) onProfileCancel?.();
          cancelNotified.current = true;
          closePicker();
        }}
        contentContainerStyle={styles.modalContent}
      >
        <Text variant="titleLarge">Select Profile</Text>
        <TextInput
          label="Search profiles"
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          placeholder="Search by name or ID"
        />

        {loading ? (
          <Text>Loading profiles...</Text>
        ) : error ? (
          <Text style={styles.error}>Error: {error}</Text>
        ) : filteredProfiles.length === 0 ? (
          <Text>No profiles match your search.</Text>
        ) : (
          <FlatList
            data={filteredProfiles}
            keyExtractor={(profile) => profile.id}
            style={styles.profilesList}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.name}`}
                onPress={() => {
                  onProfileSelect(item.id);
                  cancelNotified.current = true;
                  closePicker();
                }}
                style={({ pressed }) => [styles.profileItem, pressed && styles.pressed]}
              >
                <ProfileAvatar name={item.name} seed={item.id} size={40} />
                <View style={styles.profileLabels}>
                  <Text variant="bodyLarge">{item.name}</Text>
                  <Text variant="bodySmall">{item.id}</Text>
                </View>
              </Pressable>
            )}
          />
        )}

        <Button mode="text" onPress={cancelPicker}>
          <Text>Cancel</Text>
        </Button>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    gap: 16,
    marginHorizontal: 20,
    maxHeight: '80%',
    padding: 24,
  },
  profilesList: { flexGrow: 0 },
  profileItem: {
    alignItems: 'center',
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  profileLabels: { flex: 1, gap: 4 },
  pressed: { opacity: 0.65 },
  error: { color: '#c62828' },
});
