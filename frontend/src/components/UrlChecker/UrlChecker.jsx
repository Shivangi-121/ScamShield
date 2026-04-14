import { useMemo, useState } from "react";
import "./UrlChecker.css";

const SAMPLE_URLS = [
  {
    label: "Safe banking",
    value: "https://www.chase.com/personal",
  },
  {
    label: "Shortened link",
    value: "http://bit.ly/free-prize-claim",
  },
  {
    label: "Brand spoof",
    value: "https://paypal-login-security-alert.xyz/verify",
  },
];

function UrlChecker() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [recentChecks, setRecentChecks] = useState([]);

  const riskTone = useMemo(() => {
    if (!result) return "neutral";
    if (result.label === "Safe") return "safe";
    if (result.label === "Suspicious") return "warning";
    return "danger";
  }, [result]);

  const checkUrl = async () => {
    if (!url.trim()) {
      setError("Enter a URL to analyze.");
      return;
    }

    setLoading(true);
    setError("");
    setFeedbackMessage("");
    try {
      const res = await fetch("/api/check-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "URL analysis failed.");
      }

      const data = await res.json();
      setResult(data);
      setRecentChecks((current) => {
        const nextEntry = {
          id: `${Date.now()}-${data.url}`,
          url: data.url,
          label: data.label,
          riskScore: data.risk_score,
          reasons: data.reasons,
          checkedAt: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        const deduped = current.filter((entry) => entry.url !== nextEntry.url);
        return [nextEntry, ...deduped].slice(0, 5);
      });
    } catch (err) {
      console.error(err);
      setResult(null);
      setError(err.message || "Unable to analyze this URL right now.");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (value) => {
    setUrl(value);
    setError("");
    setFeedbackMessage("");
  };

  const restoreCheck = (entry) => {
    setUrl(entry.url);
    setResult({
      url: entry.url,
      label: entry.label,
      risk_score: entry.riskScore,
      reasons: entry.reasons,
    });
    setError("");
    setFeedbackMessage("");
  };

  const copySummary = async () => {
    if (!result) return;

    const summary = [
      `URL: ${result.url}`,
      `Verdict: ${result.label}`,
      `Risk score: ${result.risk_score}%`,
      `Reasons: ${result.reasons.join("; ")}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setFeedbackMessage("Summary copied to clipboard.");
    } catch (err) {
      console.error(err);
      setFeedbackMessage("Clipboard access was blocked.");
    }
  };

  const exportReport = () => {
    if (!result) return;

    const payload = {
      exportedAt: new Date().toISOString(),
      detector: "url",
      result,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "scamshield-url-report.json";
    link.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const submitFeedback = async (userLabel) => {
    if (!result) return;

    setFeedbackMessage("");
    try {
const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input_data: url,
          original_label: result.label,
          user_label: userLabel,
          type: "url",
        }),
      });

      if (!res.ok) {
        throw new Error("Unable to save your feedback.");
      }

      setFeedbackMessage("Thanks. Your URL review feedback was saved.");
    } catch (err) {
      console.error(err);
      setFeedbackMessage("Feedback could not be saved right now.");
    }
  };

  const getColor = () => {
    if (!result) return "#ccc";
    if (result.label === "Safe") return "#22c55e";
    if (result.label === "Suspicious") return "#f59e0b";
    return "#ef4444";
  };

  const getProgress = () => {
    if (!result) return 0;
    return result.risk_score;
  };

  return (
    <div className="url-checker-shell">

      {/* INPUT CARD */}
      <div className="glass-card url-card">
        <h3>🔗 URL Scanner</h3>
        <p style={{ marginTop: "8px", color: "var(--text-secondary)" }}>
          Check a suspicious link for phishing patterns, impersonation, and risky redirects.
        </p>

        <div className="url-sample-row">
          {SAMPLE_URLS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              className="url-sample-pill"
              onClick={() => loadSample(sample.value)}
            >
              {sample.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Paste suspicious link here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="url-input"
        />

        {error && (
          <p style={{ marginTop: "12px", color: "var(--status-danger)" }}>{error}</p>
        )}

        <button
          onClick={checkUrl}
          disabled={loading}
          className="url-primary-btn"
        >
          {loading ? "Analyzing..." : "Check URL"}
        </button>
      </div>

      {recentChecks.length > 0 && (
        <div className="glass-card url-card">
          <div className="url-section-header">
            <h4>Recent URL Checks</h4>
            <span>Last {recentChecks.length} analyses</span>
          </div>
          <div className="url-history-list">
            {recentChecks.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="url-history-item"
                onClick={() => restoreCheck(entry)}
              >
                <div>
                  <strong>{entry.label}</strong>
                  <p>{entry.url}</p>
                </div>
                <span>{entry.checkedAt}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RESULT SECTION */}
      {result && (
        <>
          {/* PROBABILITY CARD */}
          <div className={`glass-card url-card url-risk-card ${riskTone}`}>
            <div className="url-section-header">
              <h4>Risk Level</h4>
              <span>{result.risk_score}% score</span>
            </div>

            <h2 style={{ color: getColor() }}>
              {result.label}
            </h2>

            {/* PROGRESS BAR */}
            <div
              style={{
                height: "8px",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  marginTop: "10px"
              }}
            >
              <div
                style={{
                  width: `${getProgress()}%`,
                  height: "100%",
                  background: getColor(),
                  transition: "0.4s ease"
                }}
              ></div>
            </div>

            <div className="url-actions">
              <button type="button" className="url-secondary-btn" onClick={copySummary}>
                Copy Summary
              </button>
              <button type="button" className="url-secondary-btn" onClick={exportReport}>
                Export Report
              </button>
            </div>
          </div>

          {/* INSIGHTS CARD */}
          <div className="glass-card url-card">
            <h4>⚠️ Detection Insights</h4>

            <ul className="url-reason-list">
              {result.reasons.map((r, i) => (
                <li key={i}>
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card url-card">
            <h4>Was this URL verdict accurate?</h4>
            <div className="url-feedback-actions">
              <button
                onClick={() => submitFeedback(result.label)}
                className="url-feedback-btn url-feedback-success"
              >
                Yes, correct
              </button>
              <button
                onClick={() => submitFeedback("Safe")}
                className="url-feedback-btn"
              >
                Mark Safe
              </button>
              <button
                onClick={() => submitFeedback("Suspicious")}
                className="url-feedback-btn"
              >
                Mark Suspicious
              </button>
              <button
                onClick={() => submitFeedback("Dangerous")}
                className="url-feedback-btn"
              >
                Mark Dangerous
              </button>
            </div>
            {feedbackMessage && (
              <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>
                {feedbackMessage}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default UrlChecker;
