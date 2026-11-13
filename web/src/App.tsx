import { Alert, Button, Container, Group, Loader, Modal, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { fetchStatus } from "./api";
import { HistoryCard } from "./HistoryCard";
import { NowCard } from "./NowCard";
import { SettingsForm } from "./SettingsForm";

export const App = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const status = useQuery({ queryKey: ["status"], queryFn: fetchStatus, refetchInterval: 15_000 });
  const data = status.data;
  const needsSetup = data !== undefined && (!data.settings.hasKey || !data.settings.sensor.url);

  return (
    <Container size="md" py="xl">
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Della Climate</Title>
          <Button variant="default" onClick={open} disabled={!data}>
            Settings
          </Button>
        </Group>
        {status.isPending && <Loader />}
        {status.error && (
          <Alert color="red" title="Can't reach the app">
            {status.error.message}
          </Alert>
        )}
        {needsSetup && <Alert title="Finish setup">Open Settings to add the mini-split's local key and your room sensor's URL.</Alert>}
        {data && <NowCard data={data} />}
        {data && <HistoryCard unit={data.settings.unit} />}
      </Stack>
      <Modal opened={opened} onClose={close} title="Settings" size="lg">
        {data && <SettingsForm settings={data.settings} dps={data.status.dps} onSaved={close} />}
      </Modal>
    </Container>
  );
};
