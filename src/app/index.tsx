import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Button, ScrollView, Text } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { MAX_KMH, MIN_KMH, Treadmill, TreadmillData } from '../ble/treadmill';

export default function Home() {
  useKeepAwake();

  const manager = useRef(new BleManager()).current;
  const treadmill = useRef(new Treadmill(manager)).current;
  const [found, setFound] = useState<Device[]>([]);
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<TreadmillData>({});
  const [target, setTarget] = useState(2.0);
  const [log, setLog] = useState<string[]>([]);
  const addLog = (m: string) => setLog((l) => [...l.slice(-40), m]);
  const run = (p: Promise<unknown>) => p.catch((e) => addLog(`error: ${e.message}`));

  useEffect(
    () => () => {
      treadmill.disconnect(true);
      manager.destroy();
    },
    [],
  );

  const scan = () => {
    setFound([]);
    run(treadmill.scan((d) => setFound((p) => (p.find((x) => x.id === d.id) ? p : [...p, d]))));
  };

  const connect = (d: Device) =>
    run(
      treadmill
        .connect(d.id, setData, addLog, () => {
          setConnected(false);
          addLog('Disconnected');
        })
        .then(() => setConnected(true)),
    );

  const changeSpeed = (delta: number) => {
    const next = Math.min(MAX_KMH, Math.max(MIN_KMH, +(target + delta).toFixed(1)));
    setTarget(next);
    run(treadmill.setSpeed(next));
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 8 }}>
      {!connected ? (
        <>
          <Button title="Scan for treadmill" onPress={scan} />
          {found.map((d) => (
            <Button key={d.id} title={`${d.name} (${d.rssi})`} onPress={() => connect(d)} />
          ))}
        </>
      ) : (
        <>
          <Text style={{ fontSize: 40, fontWeight: '700' }}>{data.speedKmh?.toFixed(1) ?? '--'} km/h</Text>
          <Text>Distance: {data.distanceM ?? '--'} m</Text>
          <Text>Time: {data.elapsedS ?? '--'} s</Text>
          <Text>Incline: {data.inclinePct ?? '--'} %</Text>
          <Text>Calories: {data.kcal ?? '--'} kcal</Text>
          <Text>Heart rate: {data.heartRate ?? '--'} bpm</Text>

          <Button title="Start" onPress={() => run(treadmill.start())} />
          <Text>Target speed: {target.toFixed(1)} km/h</Text>
          <Button title="Speed +0.5" onPress={() => changeSpeed(0.5)} />
          <Button title="Speed -0.5" onPress={() => changeSpeed(-0.5)} />
          <Button title="STOP" color="red" onPress={() => run(treadmill.stop())} />
          <Button title="End workout" onPress={() => run(treadmill.disconnect(true))} />
        </>
      )}
      {log.map((l, i) => (
        <Text key={i} style={{ fontSize: 11 }}>
          {l}
        </Text>
      ))}
    </ScrollView>
  );
}
