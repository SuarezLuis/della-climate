import type { Unit } from "@della-climate/server/units";
import { LineChart } from "@mantine/charts";
import { Alert, Card, Group, Loader, SegmentedControl, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchHistory } from "./api";

const RANGES = [
  { label: "6 h", value: "6" },
  { label: "24 h", value: "24" },
  { label: "7 days", value: "168" },
];

const SERIES = [
  { name: "room", label: "Room", color: "blue.6" },
  { name: "target", label: "Target", color: "gray.6", strokeDasharray: "5 5" },
  { name: "setpoint", label: "Mini-split setpoint", color: "orange.6" },
  { name: "unitReading", label: "Mini-split reads", color: "teal.6" },
];

const label = (timestamp: number, hours: number) =>
  hours <= 24
    ? new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : new Date(timestamp).toLocaleString([], { weekday: "short", hour: "numeric" });

type Props = { unit: Unit };

export const HistoryCard = ({ unit }: Props) => {
  const [range, setRange] = useState("24");
  const hours = Number(range);
  const query = useQuery({ queryKey: ["history", hours], queryFn: () => fetchHistory(hours), refetchInterval: 60_000 });
  const points = useMemo(() => (query.data ?? []).map((point) => ({ ...point, time: label(point.ts, hours) })), [query.data, hours]);

  let body = (
    <LineChart
      h={280}
      data={points}
      dataKey="time"
      series={SERIES}
      unit={`°${unit}`}
      curveType="monotone"
      withDots={false}
      withLegend
      connectNulls
      yAxisProps={{ domain: ["dataMin - 1", "dataMax + 1"] }}
    />
  );
  if (query.isPending) body = <Loader />;
  else if (query.error) body = <Alert color="red">{query.error.message}</Alert>;
  else if (points.length === 0) body = <Text c="dimmed">No readings yet. The first one is saved a minute after the app starts.</Text>;

  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>History</Title>
        <SegmentedControl data={RANGES} value={range} onChange={setRange} />
      </Group>
      {body}
    </Card>
  );
};
