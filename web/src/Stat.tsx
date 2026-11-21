import { Stack, Text } from "@mantine/core";

type Props = { label: string; value: string };

export const Stat = ({ label, value }: Props) => (
  <Stack gap={0}>
    <Text size="sm" c="dimmed">
      {label}
    </Text>
    <Text fw={600}>{value}</Text>
  </Stack>
);
