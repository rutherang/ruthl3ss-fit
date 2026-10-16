// Android-only API, guarded by the Platform.OS check below.
// eslint-disable-next-line react-native/split-platform-components
import { PermissionsAndroid, Platform } from 'react-native';

export async function ensureBlePermissions(
  onLog: (message: string) => void = () => {},
): Promise<void> {
  if (Platform.OS !== 'android') return;
  onLog(`Android API level: ${Platform.Version}`);
  const perms =
    Platform.Version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const res = await PermissionsAndroid.requestMultiple(perms);

  for (const p of perms) onLog(`Permission ${p}: ${res[p]}`);

  const blocked = perms.filter(
    (p) => res[p] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
  );
  if (blocked.length > 0) {
    throw new Error(
      'Bluetooth permission is blocked. Enable it in Settings → Apps → ' +
        'ruthl3ss-fit → Permissions.',
    );
  }

  const denied = perms.filter(
    (p) => res[p] !== PermissionsAndroid.RESULTS.GRANTED,
  );
  if (denied.length > 0) {
    throw new Error(`Bluetooth permission denied: ${denied.join(', ')}`);
  }
}
