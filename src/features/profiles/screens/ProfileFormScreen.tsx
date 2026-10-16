import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { pickProfilePhoto, type PickedProfilePhoto } from '@/integrations/media/profilePhotoPicker';
import { uploadProfilePhoto } from '@/integrations/google/profilePhotos';
import type { Profile } from '@/types/profile';
import type { ProfileSaveResult } from '../data/profilesRepo';
import type { ProfileInput } from '../domain/profileValidation';

type Props = {
  profile: Profile | null;
  onSave: (profile: ProfileInput) => Promise<ProfileSaveResult>;
  onCancel: () => void;
  onSaved: () => void;
};

export function ProfileFormScreen({ profile, onSave, onCancel, onSaved }: Props) {
  const [savedProfile, setSavedProfile] = useState<Profile | null>(profile);
  const [name, setName] = useState(profile?.name ?? '');
  const [sex, setSex] = useState<'male' | 'female'>(profile?.sex ?? 'male');
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? '');
  const [heightCm, setHeightCm] = useState(profile ? String(profile.heightCm) : '');
  const [photo, setPhoto] = useState<PickedProfilePhoto | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const selectPhoto = async () => {
    setError(null);
    try {
      const pickedPhoto = await pickProfilePhoto();
      if (pickedPhoto) {
        setPhoto(pickedPhoto);
        setPhotoError(null);
      }
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setPhotoError(null);
    try {
      const height = Number(heightCm);
      const current = savedProfile ?? profile;
      const base: ProfileInput = {
        ...(current
          ? {
              id: current.id,
              createdAt: current.createdAt,
              photoFileId: current.photoFileId,
            }
          : {}),
        name: name.trim(),
        sex,
        birthDate,
        heightCm: height,
      };
      const localSave = await onSave(base);
      setSavedProfile(localSave.profile);

      if (photo) {
        let photoFileId: string;
        try {
          photoFileId = await uploadProfilePhoto(photo.uri, photo.fileName, photo.mimeType);
        } catch (cause: unknown) {
          setPhotoError(
            `Profile details are saved on this device, but the photo upload failed: ${
              cause instanceof Error ? cause.message : String(cause)
            }`,
          );
          return;
        }
        const photoSave = await onSave({ ...localSave.profile, photoFileId });
        setSavedProfile(photoSave.profile);
      }

      onSaved();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall">{profile ? 'Edit profile' : 'Add profile'}</Text>

        <TextInput
          testID="profile-name"
          label="Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          autoCapitalize="words"
          maxLength={80}
        />
        <View>
          <Text variant="titleMedium">Sex</Text>
          <View style={styles.sexOptions}>
            {(['female', 'male'] as const).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: sex === option }}
                onPress={() => setSex(option)}
                style={[styles.sexOption, sex === option && styles.selectedSexOption]}
              >
                <Text>{option === 'female' ? 'Female' : 'Male'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <TextInput
          testID="profile-birth-date"
          label="Birth date (YYYY-MM-DD)"
          value={birthDate}
          onChangeText={setBirthDate}
          mode="outlined"
          placeholder="1990-01-01"
          keyboardType="numbers-and-punctuation"
        />
        <TextInput
          testID="profile-height-cm"
          label="Height (cm)"
          value={heightCm}
          onChangeText={setHeightCm}
          mode="outlined"
          keyboardType="number-pad"
        />

        <View style={styles.photoSection}>
          <Text variant="titleMedium">Profile photo</Text>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.photo} />
          ) : profile?.photoFileId || savedProfile?.photoFileId ? (
            <Text>Photo uploaded to Google Drive</Text>
          ) : (
            <Text>No photo selected</Text>
          )}
          <Button mode="outlined" onPress={() => void selectPhoto()} disabled={saving}>
            <Text>Choose photo</Text>
          </Button>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!photoError && <Text style={styles.error}>{photoError}</Text>}
        <View style={styles.actions}>
          {!!photoError && (
            <Button mode="text" onPress={onSaved}>
              <Text>Continue without photo</Text>
            </Button>
          )}
          <Button mode="text" onPress={onCancel} disabled={saving}>
            <Text>Cancel</Text>
          </Button>
          <Button mode="contained" onPress={() => void save()} loading={saving} disabled={saving}>
            <Text>Save profile</Text>
          </Button>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 16, padding: 24, paddingTop: 56 },
  sexOptions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  sexOption: { borderColor: '#888', borderRadius: 8, borderWidth: 1, padding: 12 },
  selectedSexOption: { backgroundColor: '#dcecff', borderColor: '#208AEF' },
  photoSection: { alignItems: 'flex-start', gap: 12 },
  photo: { width: 112, height: 112, borderRadius: 56 },
  error: { color: '#c62828' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
});
