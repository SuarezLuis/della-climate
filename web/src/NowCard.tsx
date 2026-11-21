import type { StatusResponse } from "@della-climate/server/index";
import type { Settings } from "@della-climate/server/settings";
import { steering, type Steering } from "@della-climate/server/control";
import { switchUnit } from "@della-climate/server/units";
import { ActionIcon, Alert, Badge, Card, Divider, Group, SegmentedControl, SimpleGrid, Stack, Switch, Text } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveSettings } from "./api";
import { formatTemp, timeAgo } from "./format";
import { Stat } from "./Stat";

type Props = { data: StatusResponse };

const STEERING: Record<Steering, { label: string; color: string }> = {
  watching: { label: "Watching only", color: "gray" },
  unreachable: { label: "Can't reach the mini-split", color: "gray" },
  off: { label: "Mini-split is off", color: "gray" },
  "no-sensor": { label: "No room reading", color: "yellow" },
  cooler: { label: "Pushing cooler", color: "blue" },
  warmer: { label: "Pushing warmer", color: "orange" },
  holding: { label: "At your target", color: "green" },
};

const steeringDetail = (state: Steering, offset: number | null, deviceUnit: string) => {
  const degrees = `${Math.abs(offset ?? 0)}°${deviceUnit}`;
  if (state === "cooler") return `Its setpoint is ${degrees} below your target.`;
  if (state === "warmer") return `Its setpoint is ${degrees} above your target.`;
  if (state === "holding") return "Sending your target as is.";
  if (state === "no-sensor") return "Sending your plain target until the sensor answers.";
  if (state === "watching") return "The mini-split runs on its own settings.";
  return null;
};

export const NowCard = ({ data }: Props) => {
  const queryClient = useQueryClient();
  const save = useMutation({ mutationFn: saveSettings, onSuccess: () => queryClient.invalidateQueries() });

  const { settings, status } = data;
  const { unit } = settings;
  const step = unit === "F" ? 1 : 0.5;
  const update = (changes: Partial<Settings>) => save.mutate({ ...settings, ...changes });
  const power = status.power === null ? "Unknown" : status.power ? "On" : "Off";
  const state = steering({ enabled: settings.enabled, power: status.power, room: status.room, offset: status.offset });
  const detail = steeringDetail(state, status.offset, settings.device.unit);

  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="sm" c="dimmed">
            Room
          </Text>
          <Text fz={48} fw={700} lh={1}>
            {formatTemp(status.room, unit)}
          </Text>
          <Text size="xs" c="dimmed">
            Checked {timeAgo(status.checkedAt).toLowerCase()}
          </Text>
        </Stack>
        <Stack gap={4} align="center">
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Target
            </Text>
            <SegmentedControl
              size="xs"
              aria-label="Temperature unit"
              data={[
                { value: "F", label: "°F" },
                { value: "C", label: "°C" },
              ]}
              value={unit}
              onChange={(value) => save.mutate(switchUnit(settings, value === "C" ? "C" : "F"))}
            />
          </Group>
          <Group gap="xs">
            <ActionIcon variant="default" size="lg" aria-label="Lower the target" onClick={() => update({ target: settings.target - step })}>
              −
            </ActionIcon>
            <Text fz={32} fw={600} miw={110} ta="center">
              {formatTemp(settings.target, unit)}
            </Text>
            <ActionIcon variant="default" size="lg" aria-label="Raise the target" onClick={() => update({ target: settings.target + step })}>
              +
            </ActionIcon>
          </Group>
        </Stack>
      </Group>

      <Divider my="md" />

      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <Stat label="Mini-split" value={power} />
        <Stat label="Its setpoint" value={formatTemp(status.setpoint, unit)} />
        <Stat label="It reads" value={formatTemp(status.unitReading, unit)} />
        <Stat label="Last change" value={timeAgo(status.lastChangeAt)} />
      </SimpleGrid>

      <Group mt="lg" gap="sm">
        <Badge size="lg" variant="light" color={STEERING[state].color}>
          {STEERING[state].label}
        </Badge>
        {detail && (
          <Text size="sm" c="dimmed">
            {detail}
          </Text>
        )}
      </Group>

      <Switch
        mt="md"
        checked={settings.enabled}
        onChange={(event) => update({ enabled: event.currentTarget.checked })}
        label="Steer the mini-split from the room sensor"
        description="When off, the app only watches and records."
      />

      {save.error && (
        <Alert color="red" mt="md">
          {save.error.message}
        </Alert>
      )}
      {status.errors.map((error) => (
        <Alert key={error} color="yellow" mt="md">
          {error}
        </Alert>
      ))}
    </Card>
  );
};
