import type { StatusResponse } from "@della-climate/server/index";
import type { Settings } from "@della-climate/server/settings";
import { ActionIcon, Alert, Card, Divider, Group, SimpleGrid, Stack, Switch, Text } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveSettings } from "./api";
import { formatTemp, timeAgo } from "./format";
import { Stat } from "./Stat";

type Props = { data: StatusResponse };

export const NowCard = ({ data }: Props) => {
  const queryClient = useQueryClient();
  const save = useMutation({ mutationFn: saveSettings, onSuccess: () => queryClient.invalidateQueries() });

  const { settings, status } = data;
  const { unit } = settings;
  const step = unit === "F" ? 1 : 0.5;
  const update = (changes: Partial<Settings>) => save.mutate({ ...settings, ...changes });
  const power = status.power === null ? "Unknown" : status.power ? "On" : "Off";

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
          <Text size="sm" c="dimmed">
            Target
          </Text>
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

      <Switch
        mt="lg"
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
