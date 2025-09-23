import React from "react";
import { createRoot } from "react-dom/client";

function useJson(url, intervalMs = 10000) {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    let active = true;
    let timeoutId;

    const fetchOnce = async () => {
      try {
        const res = await fetch(url);
        const parsed = await res.json();
        if (!res.ok) {
          throw new Error(typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
        }
        if (active) {
          setData(parsed);
        }
      } catch (err) {
        if (active) {
          setData(null);
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
  }, [url, intervalMs]);

  return data;
}

function Tile({ title, children }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h3 style={{ color: '#e3e9ff', marginBottom: 8 }}>{title}</h3>
      <div style={{ background: '#0c1424', color: '#dfe7ff', padding: 16, borderRadius: 12 }}>{children}</div>
    </section>
  );
}

function MetricsPanel({ title, data }) {
  return (
    <Tile title={title}>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{data ?? 'loading...'}</pre>
    </Tile>
  );
}

function App() {
  const kinds = useJson('http://localhost:8080/telemetry/stats/kinds');
  const shards = useJson('http://localhost:8080/telemetry/stats/shards');
  const bundlerPromise = React.useMemo(
    () =>
      fetch('http://localhost:4337/metrics')
        .then((res) => res.text())
        .catch(() => 'unavailable'),
    []
  );
  const paymasterPromise = React.useMemo(
    () =>
      fetch('http://localhost:3001/metrics')
        .then((res) => res.text())
        .catch(() => 'unavailable'),
    []
  );
  const [bundlerMetrics, setBundlerMetrics] = React.useState('loading...');
  const [paymasterMetrics, setPaymasterMetrics] = React.useState('loading...');

  React.useEffect(() => {
    bundlerPromise.then(setBundlerMetrics);
  }, [bundlerPromise]);

  React.useEffect(() => {
    paymasterPromise.then(setPaymasterMetrics);
  }, [paymasterPromise]);

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", padding: 32, background: '#050a16', minHeight: '100vh', color: '#f4f6ff' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>RiftLine Live Ops</h1>
        <p style={{ color: '#8f99c2' }}>Telemetry, shard activity, and wallet infra metrics.</p>
      </header>
      <Tile title="Telemetry by kind">
        <pre style={{ margin: 0 }}>{kinds ? JSON.stringify(kinds, null, 2) : 'loading...'}</pre>
      </Tile>
      <Tile title="Telemetry by shard">
        <pre style={{ margin: 0 }}>{shards ? JSON.stringify(shards, null, 2) : 'loading...'}</pre>
      </Tile>
      <MetricsPanel title="Bundler metrics" data={bundlerMetrics} />
      <MetricsPanel title="Paymaster metrics" data={paymasterMetrics} />
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
