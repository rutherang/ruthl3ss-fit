import type { BleManager } from 'react-native-ble-plx';
import { BleScanCoordinator } from '../scanCoordinator';

function createCoordinator() {
  const manager = {
    startDeviceScan: jest.fn().mockResolvedValue(undefined),
    stopDeviceScan: jest.fn().mockResolvedValue(undefined),
  } as unknown as BleManager;
  return { coordinator: new BleScanCoordinator(manager), manager };
}

const listener = jest.fn();

describe('BleScanCoordinator', () => {
  it('stops the previous scan before starting another', async () => {
    const { coordinator, manager } = createCoordinator();

    const stopFirst = await coordinator.startScan(null, listener);
    const stopSecond = await coordinator.startScan({ allowDuplicates: true }, listener);

    expect(manager.startDeviceScan).toHaveBeenCalledTimes(2);
    expect(manager.stopDeviceScan).toHaveBeenCalledTimes(1);
    expect(manager.startDeviceScan).toHaveBeenLastCalledWith(
      null,
      { allowDuplicates: true },
      listener,
    );

    await stopSecond();
    expect(manager.stopDeviceScan).toHaveBeenCalledTimes(2);
    await stopFirst();
    expect(manager.stopDeviceScan).toHaveBeenCalledTimes(2);
  });

  it('makes stale screen cleanup unable to stop a newer scan', async () => {
    const { coordinator, manager } = createCoordinator();
    const stopOldScreen = await coordinator.startScan(null, listener);
    await coordinator.startScan(null, listener);

    await stopOldScreen();

    expect(manager.stopDeviceScan).toHaveBeenCalledTimes(1);
  });

  it('exposes a way to stop the current scan before connecting', async () => {
    const { coordinator, manager } = createCoordinator();
    await coordinator.startScan(null, listener);

    await coordinator.stopCurrentScan();

    expect(manager.stopDeviceScan).toHaveBeenCalledTimes(1);
  });
});
