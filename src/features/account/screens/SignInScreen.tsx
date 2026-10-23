import { brand } from '@/constants/brand';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccount } from '../useAccount';

// function LogoMark() {
//   return (
//     <View style={styles.mark} accessibilityRole="image" accessibilityLabel="Ruthl3ss Fit logo">
//       <View style={styles.markInner} />
//     </View>
//   );
// }

export default function SignInScreen() {
  const { busy, error, signIn } = useAccount();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.body}>
        <Image source={require('@/assets/images/logo.png')} style={{ width: 96, height: 96 }} />
        <Text style={styles.wordmark}>
          Ruthl3ss <Text style={styles.fit}>Fit</Text>
        </Text>
        <Text style={styles.headline}>Train. Weigh in.{'\n'}Keep it yours.</Text>
        <Text style={styles.copy}>
          Ruthl3ssFit connects your treadmill and scale. Your data stays in your own Google Drive.
        </Text>
        <Button
          mode="contained"
          buttonColor={brand.cyan}
          textColor={brand.onCyan}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          loading={busy}
          disabled={busy}
          onPress={() => void signIn()}
          accessibilityLabel="Continue with Google"
        >
          <Text>Continue with Google</Text>
        </Button>
        {!!error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <Text style={styles.note}>Next, you create your first profile.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: brand.ground },
  body: { flex: 1, justifyContent: 'center', gap: 16, paddingHorizontal: 24 },
  // mark: {
  //   width: 72,
  //   height: 72,
  //   borderRadius: 22,
  //   borderWidth: 2,
  //   borderColor: brand.cyan,
  //   backgroundColor: brand.ground,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   shadowColor: brand.cyan,
  //   shadowOpacity: 0.6,
  //   shadowRadius: 14,
  //   elevation: 8,
  // },
  // markInner: {
  //   width: 52,
  //   height: 52,
  //   borderRadius: 16,
  //   borderWidth: 1,
  //   borderColor: 'rgba(255,77,99,0.5)',
  // },
  wordmark: { color: brand.cyan, fontSize: 26, fontWeight: '800' },
  fit: { color: brand.red },
  headline: {
    color: brand.text,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
  copy: { color: brand.muted, fontSize: 16, lineHeight: 22 },
  button: { marginTop: 12, borderRadius: 14 },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: '700' },
  error: { color: brand.red },
  note: { color: brand.muted, textAlign: 'center' },
});
