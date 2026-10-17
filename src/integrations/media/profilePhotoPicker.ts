import * as ImagePicker from 'expo-image-picker';

export type PickedProfilePhoto = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export async function pickProfilePhoto(): Promise<PickedProfilePhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) throw new Error('The photo picker returned no image.');

  return {
    uri: asset.uri,
    fileName: asset.fileName || 'profile-photo.jpg',
    mimeType: asset.mimeType || 'image/jpeg',
  };
}
