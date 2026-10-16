import { Button, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useAccount } from '../useAccount';

export function AccountBar() {
  const { email, busy, error, signIn, signOut } = useAccount();
  return (
    <>
      <Text>{email ? `Google: ${email}` : 'Not signed in to Google'}</Text>
      {email ? (
        <Button title="Sign out" onPress={signOut} />
      ) : (
        <Button title="Sign in with Google" onPress={signIn} disabled={busy} />
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </>
  );
}

const styles = StyleSheet.create({ error: { color: 'red' } });