import type { BleError, BleManager, Device, ScanOptions } from 'react-native-ble-plx';

type ScanListener = (error: BleError | null, device: Device | null) => void;
type ScanLease = () => Promise<void>;

export class BleScanCoordinator {
  private activeToken: symbol | null = null;
  private transitions: Promise<void> = Promise.resolve();

  constructor(private readonly manager: BleManager) {}

  private enqueue<T>(transition: () => Promise<T>): Promise<T> {
    const result = this.transitions.then(transition);
    this.transitions = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async stopActive(): Promise<void> {
    if (!this.activeToken) return;
    this.activeToken = null;
    await this.manager.stopDeviceScan();
  }

  startScan(options: ScanOptions | null, listener: ScanListener): Promise<ScanLease> {
    const token = Symbol('ble-scan');
    return this.enqueue(async () => {
      await this.stopActive();
      this.activeToken = token;
      try {
        await this.manager.startDeviceScan(null, options, listener);
      } catch (error) {
        if (this.activeToken === token) this.activeToken = null;
        throw error;
      }
      return () =>
        this.enqueue(async () => {
          if (this.activeToken === token) await this.stopActive();
        });
    });
  }

  stopCurrentScan(): Promise<void> {
    return this.enqueue(() => this.stopActive());
  }
}

const coordinators = new WeakMap<BleManager, BleScanCoordinator>();

export function getBleScanCoordinator(manager: BleManager): BleScanCoordinator {
  let coordinator = coordinators.get(manager);
  if (!coordinator) {
    coordinator = new BleScanCoordinator(manager);
    coordinators.set(manager, coordinator);
  }
  return coordinator;
}
