import type { DataPoints } from "@della-climate/server/della";
import type { PublicSettings, Settings } from "@della-climate/server/settings";
import { convert, convertDelta, type Unit } from "@della-climate/server/units";
import { Alert, Button, Code, Fieldset, Group, NumberInput, PasswordInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { saveSettings } from "./api";
import { pick } from "./format";

const UNITS = ["F", "C"] as const;
const VERSIONS = ["3.3", "3.4", "3.5"] as const;
const UNIT_OPTIONS = [
  { value: "F", label: "°F" },
  { value: "C", label: "°C" },
];
const SCALE_OPTIONS = [
  { value: "1", label: "Whole degrees (22 means 22°)" },
  { value: "10", label: "Tenths (220 means 22.0°)" },
];

const round = (value: number) => Math.round(value * 10) / 10;

type Props = { settings: PublicSettings; dps: DataPoints | null; onSaved: () => void };

export const SettingsForm = ({ settings, dps, onSaved }: Props) => {
  const [form, setForm] = useState<Settings>(settings);
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: saveSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      onSaved();
    },
  });

  const setDevice = (changes: Partial<Settings["device"]>) => setForm((current) => ({ ...current, device: { ...current.device, ...changes } }));
  const setDataPoint = (name: keyof Settings["device"]["dps"], value: string) =>
    setForm((current) => ({ ...current, device: { ...current.device, dps: { ...current.device.dps, [name]: value } } }));
  const setSensor = (changes: Partial<Settings["sensor"]>) => setForm((current) => ({ ...current, sensor: { ...current.sensor, ...changes } }));
  const setNumber = (name: "deadband" | "maxOffset" | "minIntervalMinutes", value: number | string) => {
    if (typeof value === "number") setForm((current) => ({ ...current, [name]: value }));
  };
  const changeUnit = (unit: Unit | undefined) => {
    if (!unit) return;
    setForm((current) => ({
      ...current,
      unit,
      target: round(convert(current.target, current.unit, unit)),
      deadband: round(convertDelta(current.deadband, current.unit, unit)),
    }));
  };

  return (
    <Stack>
      <Fieldset legend="Mini-split">
        <Stack gap="sm">
          <TextInput label="IP address" placeholder="192.168.0.207" value={form.device.ip} onChange={(event) => setDevice({ ip: event.currentTarget.value.trim() })} />
          <TextInput label="Device ID" value={form.device.id} onChange={(event) => setDevice({ id: event.currentTarget.value.trim() })} />
          <PasswordInput
            label="Local key"
            description="From the tinytuya wizard. Stays on your Umbrel."
            placeholder={settings.hasKey ? "Saved. Leave empty to keep it." : ""}
            value={form.device.key}
            onChange={(event) => setDevice({ key: event.currentTarget.value.trim() })}
          />
          <Group grow>
            <Select label="Protocol version" data={VERSIONS} value={form.device.version} onChange={(value) => setDevice({ version: pick(VERSIONS, value) ?? form.device.version })} />
            <Select label="Its temperature unit" data={UNIT_OPTIONS} value={form.device.unit} onChange={(value) => setDevice({ unit: pick(UNITS, value) ?? form.device.unit })} />
          </Group>
          <Select label="How it sends temperatures" data={SCALE_OPTIONS} value={String(form.device.scale)} onChange={(value) => setDevice({ scale: value === "10" ? 10 : 1 })} />
          <Group grow>
            <TextInput label="Power data point" value={form.device.dps.power} onChange={(event) => setDataPoint("power", event.currentTarget.value.trim())} />
            <TextInput label="Setpoint data point" value={form.device.dps.setpoint} onChange={(event) => setDataPoint("setpoint", event.currentTarget.value.trim())} />
            <TextInput label="Its reading data point" value={form.device.dps.current} onChange={(event) => setDataPoint("current", event.currentTarget.value.trim())} />
          </Group>
          <Text size="sm" c="dimmed">
            What the mini-split reports right now. Change a setting in the Della app and watch which number moves.
          </Text>
          {dps ? <Code block>{JSON.stringify(dps, null, 2)}</Code> : <Text size="sm">Nothing yet. Save the IP, ID and key, then reopen Settings.</Text>}
        </Stack>
      </Fieldset>

      <Fieldset legend="Room sensor">
        <Group grow align="flex-start">
          <TextInput
            label="ESPHome sensor URL"
            description="Use the sensor's IP address. .local names don't resolve inside the app."
            placeholder="http://192.168.0.50/sensor/room_temperature"
            value={form.sensor.url}
            onChange={(event) => setSensor({ url: event.currentTarget.value.trim() })}
          />
          <Select label="It reports in" data={UNIT_OPTIONS} value={form.sensor.unit} onChange={(value) => setSensor({ unit: pick(UNITS, value) ?? form.sensor.unit })} />
        </Group>
      </Fieldset>

      <Fieldset legend="Steering">
        <Stack gap="sm">
          <Select label="Show temperatures in" data={UNIT_OPTIONS} value={form.unit} onChange={(value) => changeUnit(pick(UNITS, value))} />
          <NumberInput
            label={`Deadband (°${form.unit})`}
            description="How far the room may drift from the target before the setpoint moves."
            min={0.1}
            max={5}
            step={0.1}
            decimalScale={1}
            value={form.deadband}
            onChange={(value) => setNumber("deadband", value)}
          />
          <NumberInput
            label="Largest setpoint offset (mini-split degrees)"
            description="How far the setpoint may move away from the target."
            min={1}
            max={10}
            value={form.maxOffset}
            onChange={(value) => setNumber("maxOffset", value)}
          />
          <NumberInput
            label="Minutes between changes"
            description="At least 10 keeps the compressor from short cycling."
            min={5}
            max={120}
            value={form.minIntervalMinutes}
            onChange={(value) => setNumber("minIntervalMinutes", value)}
          />
        </Stack>
      </Fieldset>

      {save.error && <Alert color="red">{save.error.message}</Alert>}
      <Group justify="flex-end">
        <Button onClick={() => save.mutate(form)} loading={save.isPending}>
          Save
        </Button>
      </Group>
    </Stack>
  );
};
