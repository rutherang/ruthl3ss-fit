import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AccountBar } from '@/features/account/components/AccountBar';

export default function ProfilesScreen() {
  return (
    <View style={styles.container}>
      <AccountBar />
      <Text>Profiles are coming next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, gap: 8 },
});