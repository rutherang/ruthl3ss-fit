import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const AVATAR_COLORS = ['#315C9B', '#6A4C93', '#26766A', '#9A5238', '#4D6375', '#816A28'];

export function getAvatarInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

type Props = {
  name: string;
  seed?: string;
  photoUri?: string;
  size?: number;
};

export function ProfileAvatar({ name, seed = name, photoUri, size = 48 }: Props) {
  const initials = getAvatarInitials(name);
  const style = { width: size, height: size, borderRadius: size / 2 };

  if (photoUri) {
    return (
      <Image
        accessibilityLabel={`${name}'s profile photo`}
        source={{ uri: photoUri }}
        style={[styles.photo, style]}
      />
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${name}'s generated avatar, ${initials}`}
      style={[styles.avatar, style, { backgroundColor: getAvatarColor(seed) }]}
    >
      <Text style={[styles.initials, { fontSize: Math.max(14, Math.round(size * 0.36)) }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { color: '#fff', fontWeight: '700' },
  photo: { resizeMode: 'cover' },
});
