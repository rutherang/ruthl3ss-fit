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

  for (const permission of perms) {
    onLog(`Permission ${permission}: ${res[permission]}`);
  }

  const locationGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  onLog(
    `Fine location permission: ${locationGranted ? 'granted' : 'not granted'}`,
  );

  const denied = perms.filter(
    (permission) => res[permission] !== PermissionsAndroid.RESULTS.GRANTED,
  );
  if (denied.length > 0) {
    throw new Error(`Bluetooth permission denied: ${denied.join(', ')}`);
  }
}
