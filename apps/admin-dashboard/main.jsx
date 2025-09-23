import React from "react";
import { createRoot } from "react-dom/client";

const env = import.meta.env ?? {};
const API_BASE = env.VITE_API_BASE ?? "http://localhost:8080";
const BUNDLER_METRICS_URL = env.VITE_BUNDLER_METRICS ?? "http://localhost:4337/metrics";
const PAYMASTER_METRICS_URL = env.VITE_PAYMASTER_METRICS ?? "http://localhost:3001/metrics";

function useJson(url, intervalMs = 10000) {
  const [state, setState] = React.useState({ data: null, error: null });

  React.useEffect(() => {
    if (!url) {
      setState({ data: null, error: new Error("missing_url") });
      return;
    }

    let cancelled = false;
    let timer = 0;

    const fetchOnce = async () => {
      try {
        const response = await fetch(url);
        const parsed = await response.json();
        if (!response.ok) {
          throw new Error(typeof parsed === "string" ? parsed : JSON.stringify(parsed));
        }
        if (!cancelled) {
          setState({ data: parsed, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));
          setState({ data: null, error });
        }
      } finally {
        if (!cancelled && intervalMs > 0) {
          timer = window.setTimeout(fetchOnce, intervalMs);
        }
      }
    };

    fetchOnce();

    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [url, intervalMs]);

  return state;
}

function useText(url) {
  const [text, setText] = React.useState("loading...");

  React.useEffect(() => {
    if (!url) {
      setText("disabled");
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(url);
        const body = await response.text();
        if (!cancelled) {
          setText(body);
        }
      } catch (err) {
        if (!cancelled) {
          setText("unavailable");
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return text;
}

function Tile({ title, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h3 style={{ color: "#e3e9ff", marginBottom: 8 }}>{title}</h3>
      <div style={{ background: "#0c1424", color: "#dfe7ff", padding: 16, borderRadius: 12 }}>{children}</div>
    </section>
  );
}

function StatBadge({ label, value }) {
  return (
    <div style={{ padding: 12, background: "rgba(16, 60, 120, 0.35)", borderRadius: 10, textAlign: "center" }}>
      <p style={{ margin: 0, textTransform: "uppercase", fontSize: 12, letterSpacing: 1 }}>{label}</p>
      <strong style={{ display: "block", fontSize: 28, marginTop: 4 }}>{value}</strong>
    </div>
  );
}

function renderState(state, renderer) {
  if (state.error) {
    return <span style={{ color: "#ff8b8b" }}>Failed to load</span>;
  }
  if (!state.data) {
    return <span>Loading...</span>;
  }
  return renderer(state.data);
}

function TelemetryList({ items, primaryKey, valueKey }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {items.map((item) => (
        <li key={item[primaryKey]} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span>{item[primaryKey]}</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{item[valueKey].toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

function App() {
  const stats = useJson(`${API_BASE}/admin/stats`, 15000);
  const kinds = useJson(`${API_BASE}/telemetry/stats/kinds`, 15000);
  const shards = useJson(`${API_BASE}/telemetry/stats/shards`, 15000);
  const bundlerMetrics = useText(BUNDLER_METRICS_URL);
  const paymasterMetrics = useText(PAYMASTER_METRICS_URL);

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", padding: 32, background: "#050a16", minHeight: "100vh", color: "#f4f6ff" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>RiftLine Live Ops</h1>
        <p style={{ color: "#8f99c2", margin: 0 }}>Realtime visibility into players, shard streaming, and telemetry.</p>
      </header>

      <Tile title="Core stats">
        {renderState(stats, (data) => (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            <StatBadge label="Players" value={data.players.toLocaleString()} />
            <StatBadge label="Travel Tickets" value={data.tickets.toLocaleString()} />
            <StatBadge label="Telemetry Events" value={data.telemetry.toLocaleString()} />
          </div>
        ))}
      </Tile>

      <Tile title="Telemetry by kind">
        {renderState(kinds, (data) => (
          <TelemetryList items={data.slice(0, 10)} primaryKey="kind" valueKey="count" />
        ))}
      </Tile>

      <Tile title="Telemetry by shard">
        {renderState(shards, (data) => (
          <TelemetryList items={data} primaryKey="shardId" valueKey="count" />
        ))}
      </Tile>

      <Tile title="Bundler metrics">
        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{bundlerMetrics}</pre>
      </Tile>

      <Tile title="Paymaster metrics">
        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{paymasterMetrics}</pre>
      </Tile>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);
