import React from "react";
import { createRoot } from "react-dom/client";

function useFetch(url, responseType = "text", intervalMs = 5000) {
  const [value, setValue] = React.useState(null);

  React.useEffect(() => {
    let active = true;
    let timeoutId;

    const parser = responseType === "json" ? (res) => res.json() : (res) => res.text();

    const fetchOnce = async () => {
      try {
        const res = await fetch(url);
        const parsed = await parser(res);
        if (!res.ok) {
          throw new Error(typeof parsed === "string" ? parsed : JSON.stringify(parsed));
        }
        if (active) {
          setValue(parsed);
        }
      } catch (err) {
        if (active) {
          setValue(`error: ${err instanceof Error ? err.message : String(err)}`);
        }
      } finally {
        if (active) {
          timeoutId = window.setTimeout(fetchOnce, intervalMs);
        }
      }
    };

    fetchOnce();

    return () => {
      active = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [url, responseType, intervalMs]);

  return value;
}

function MetricPanel({ title, data }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h3>{title}</h3>
      <pre style={{ background: "#0c1424", color: "#dfe7ff", padding: 12, borderRadius: 8 }}>
        {data ?? "loading..."}
      </pre>
    </section>
  );
}

function TelemetryStats({ stats }) {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    return (
      <section style={{ marginBottom: 24 }}>
        <h3>Telemetry</h3>
        <pre style={{ background: "#0c1424", color: "#dfe7ff", padding: 12, borderRadius: 8 }}>
          {stats ?? "loading..."}
        </pre>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 24 }}>
      <h3>Telemetry</h3>
      <div
        style={{
          display: "flex",
          gap: 24,
          background: "#0c1424",
          color: "#dfe7ff",
          padding: 16,
          borderRadius: 8
        }}
      >
        <div>
          <strong>Total Events</strong>
          <div style={{ fontSize: 24 }}>{stats.total ?? 0}</div>
        </div>
        <div>
          <strong>Last Hour</strong>
          <div style={{ fontSize: 24 }}>{stats.lastHour ?? 0}</div>
        </div>
      </div>
    </section>
  );
}

function App() {
  const bundlerMetrics = useFetch("http://localhost:4337/metrics");
  const paymasterMetrics = useFetch("http://localhost:3001/metrics");
  const telemetryStats = useFetch("http://localhost:8080/telemetry/stats", "json", 10000);

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", padding: 32, background: "#050a16", minHeight: "100vh" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ color: "#f4f6ff", marginBottom: 8 }}>RiftLine Operations</h1>
        <p style={{ color: "#9ca5c7" }}>Live metrics across bundler, paymaster, and telemetry ingestion.</p>
      </header>
      <TelemetryStats stats={telemetryStats} />
      <MetricPanel title="Bundler Metrics" data={bundlerMetrics} />
      <MetricPanel title="Paymaster Metrics" data={paymasterMetrics} />
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
