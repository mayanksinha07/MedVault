import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Send, ShieldCheck, UploadCloud } from "lucide-react";
import AppSidebar from "../components/AppSidebar";
import { resolveRecordFileUrl } from "../utils/recordFileUrl";

type ChatRole = "assistant" | "user";
type RecordItem = { _id: string; fileName: string; fileUrl: string };
type InsightRes = {
  summary?: string[];
  risk_predictions?: Array<{ risk: string; level: string }>;
  borderline_alerts?: Array<{ parameter: string; note: string }>;
};
type Message = { id: string; role: ChatRole; content: string };

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const AI_API_URL =
  (import.meta.env.VITE_AI_API_URL as string | undefined) ||
  (API_URL ? `${API_URL}/ai` : "http://127.0.0.1:8000");
const REPORT_KEY = "medvault_ai_report_id";
const AI_UNREACHABLE_NOTICE = API_URL
  ? "AI service is unreachable. Start medvault_ai and verify backend AI proxy configuration."
  : "AI service is unreachable. Start medvault_ai server on port 8000.";
const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getPatientId = () => "medvault-user";
const isPdfRecord = (record: RecordItem) =>
  record.fileName.toLowerCase().endsWith(".pdf") ||
  record.fileUrl.toLowerCase().endsWith(".pdf");

const readErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = (await response.json()) as { detail?: string; message?: string };
    return data.detail || data.message || fallback;
  } catch {
    return fallback;
  }
};

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 120000) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
};

const HealthSummaryAI = () => {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [reportId, setReportId] = useState(localStorage.getItem(REPORT_KEY) || "");
  const [summary, setSummary] = useState<string[]>([]);
  const [risks, setRisks] = useState<Array<{ risk: string; level: string }>>([]);
  const [alerts, setAlerts] = useState<Array<{ parameter: string; note: string }>>([]);
  const [messages, setMessages] = useState<Message[]>([
    { id: "m1", role: "assistant", content: "Sync a medical record to start AI analysis." },
  ]);
  const [draft, setDraft] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const [notice, setNotice] = useState("AI is ready. Sync one report to enable contextual chat.");
  const pdfRecords = useMemo(() => records.filter(isPdfRecord), [records]);

  useEffect(() => {
    const checkAiHealth = async () => {
      try {
        const res = await fetch(`${AI_API_URL}/health`);
        setAiOnline(res.ok);
        if (!res.ok) {
          setNotice(AI_UNREACHABLE_NOTICE);
        }
      } catch {
        setAiOnline(false);
        setNotice(AI_UNREACHABLE_NOTICE);
      }
    };
    void checkAiHealth();
  }, []);

  useEffect(() => {
    const loadRecords = async () => {
      if (!API_URL) return;
      const token = getToken();
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/records`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = (await res.json()) as RecordItem[];
        const nextRecords = Array.isArray(data) ? data : [];
        setRecords(nextRecords);
        const firstPdf = nextRecords.find(isPdfRecord);
        if (firstPdf) {
          setSelectedRecordId(firstPdf._id);
        } else if (nextRecords.length > 0) {
          setNotice("AI sync supports PDF records only. Upload or select a PDF report.");
        }
      } catch {
        setNotice("Could not load records for AI sync.");
      }
    };
    void loadRecords();
  }, []);

  const applyInsights = (data: InsightRes) => {
    setSummary(Array.isArray(data.summary) ? data.summary.filter((s) => typeof s === "string") : []);
    setRisks(
      Array.isArray(data.risk_predictions)
        ? data.risk_predictions
            .map((item) => ({
              risk: String(item?.risk || "Unknown"),
              level: String(item?.level || "low"),
            }))
        : []
    );
    setAlerts(
      Array.isArray(data.borderline_alerts)
        ? data.borderline_alerts.map((item) => ({
            parameter: String(item?.parameter || "Unknown"),
            note: String(item?.note || ""),
          }))
        : []
    );
  };

  const fetchInsights = async (id: string) => {
    try {
      const res = await fetchWithTimeout(
        `${AI_API_URL}/insights/analyse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report_id: id }),
        },
        120000
      );
      if (!res.ok) throw new Error("Insight analysis failed");
      const data = (await res.json()) as InsightRes;
      applyInsights(data);
      return;
    } catch {
      const [summaryRes, risksRes, alertsRes] = await Promise.allSettled([
        fetchWithTimeout(
          `${AI_API_URL}/insights/summary`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ report_id: id }),
          },
          45000
        ),
        fetchWithTimeout(
          `${AI_API_URL}/insights/risks`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ report_id: id }),
          },
          45000
        ),
        fetchWithTimeout(
          `${AI_API_URL}/insights/alerts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ report_id: id }),
          },
          45000
        ),
      ]);

      const partial: InsightRes = {};

      if (summaryRes.status === "fulfilled" && summaryRes.value.ok) {
        const s = (await summaryRes.value.json()) as { summary?: string[] };
        partial.summary = Array.isArray(s.summary) ? s.summary : [];
      }
      if (risksRes.status === "fulfilled" && risksRes.value.ok) {
        const r = (await risksRes.value.json()) as { risk_predictions?: Array<{ risk: string; level: string }> };
        partial.risk_predictions = Array.isArray(r.risk_predictions) ? r.risk_predictions : [];
      }
      if (alertsRes.status === "fulfilled" && alertsRes.value.ok) {
        const a = (await alertsRes.value.json()) as { borderline_alerts?: Array<{ parameter: string; note: string }> };
        partial.borderline_alerts = Array.isArray(a.borderline_alerts) ? a.borderline_alerts : [];
      }

      applyInsights(partial);
      if (!partial.summary?.length && !partial.risk_predictions?.length && !partial.borderline_alerts?.length) {
        throw new Error("AI insights are taking too long right now. Please retry in a moment.");
      }
      setNotice("Insights partially loaded. Some sections may still be processing.");
    }
  };

  const syncSelectedRecord = async () => {
    if (aiOnline === false) return setNotice("AI service is offline. Start medvault_ai first.");
    const item = pdfRecords.find((r) => r._id === selectedRecordId);
    if (!API_URL) return setNotice("Select a record first.");
    if (!pdfRecords.length) {
      return setNotice("No PDF records are available for AI sync.");
    }
    if (!item) return setNotice("Select a PDF record first.");
    const token = getToken();
    if (!token) return setNotice("Please sign in again.");
    if (!item.fileUrl) return setNotice("Selected record has no file URL. Re-upload this record.");
    const recordFileUrl = resolveRecordFileUrl(API_URL, item.fileUrl);
    if (!recordFileUrl) {
      return setNotice("Could not resolve record file URL. Check VITE_API_URL and retry.");
    }
    setSyncing(true);
    try {
      let fileRes = await fetch(recordFileUrl);
      if (!fileRes.ok) {
        fileRes = await fetch(recordFileUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (!fileRes.ok) {
        throw new Error(await readErrorMessage(fileRes, "Could not fetch selected record file."));
      }
      const blob = await fileRes.blob();
      const looksLikePdf =
        (blob.type || "").toLowerCase().includes("pdf") ||
        item.fileName.toLowerCase().endsWith(".pdf");
      if (!looksLikePdf) {
        throw new Error("AI sync supports PDF records only. Please select a PDF record.");
      }
      const form = new FormData();
      form.append("file", new File([blob], item.fileName, { type: blob.type || "application/pdf" }));
      form.append("patient_id", getPatientId());
      const aiRes = await fetch(`${AI_API_URL}/pdf/upload`, { method: "POST", body: form });
      if (!aiRes.ok) {
        const message = await readErrorMessage(aiRes, "AI PDF upload failed");
        if (/extract meaningful text|text-based|scanned|image-only/i.test(message)) {
          throw new Error(
            "This PDF appears to be scanned or image-only, so MedVault AI cannot read it yet. Try a text-based PDF or re-export the report as searchable PDF."
          );
        }
        throw new Error(message);
      }
      const payload = (await aiRes.json()) as { report_id: string };
      if (!payload.report_id) throw new Error("AI did not return report_id.");
      setReportId(payload.report_id);
      localStorage.setItem(REPORT_KEY, payload.report_id);
      await fetchInsights(payload.report_id);
      setNotice("Record synced to AI and insights updated.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "AI sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || thinking) return;
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: text }]);
    setDraft("");
    setThinking(true);
    try {
      if (!reportId) throw new Error("Sync one report first to ask contextual questions.");
      const res = await fetch(`${AI_API_URL}/chatbot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, question: text }),
      });
      if (!res.ok) {
        const message = await readErrorMessage(res, "AI chat failed");
        const quotaLimited = /429|quota|rate limit|resource_exhausted/i.test(message);
        if (quotaLimited) {
          const fallbackLines = [
            summary[0] ? `Summary: ${summary[0]}` : "",
            risks[0] ? `Top risk: ${risks[0].risk} (${risks[0].level})` : "",
            alerts[0] ? `Alert: ${alerts[0].parameter} - ${alerts[0].note}` : "",
          ].filter(Boolean);

          const fallbackAnswer =
            fallbackLines.length > 0
              ? `AI provider quota is temporarily exceeded, so I could not generate a fresh LLM answer.\n\nBased on your synced report:\n- ${fallbackLines.join("\n- ")}\n\nPlease retry after quota resets.`
              : "AI provider quota is temporarily exceeded. Please retry after quota resets.";

          setNotice("AI quota exceeded. Showing fallback response from synced report.");
          setMessages((m) => [
            ...m,
            { id: `q-${Date.now()}`, role: "assistant", content: fallbackAnswer },
          ]);
          return;
        }
        const staleReport =
          res.status === 404 &&
          /report_id|uploaded|retrieve context|relevant context/i.test(message);

        if (staleReport) {
          setReportId("");
          localStorage.removeItem(REPORT_KEY);
          setNotice("AI report session expired. Sync the selected record once, then ask again.");
        }

        throw new Error(message);
      }
      const data = (await res.json()) as { answer?: string };
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: data.answer || "No answer." }]);
    } catch (e) {
      setMessages((m) => [...m, { id: `e-${Date.now()}`, role: "assistant", content: e instanceof Error ? e.message : "AI error" }]);
    } finally {
      setThinking(false);
    }
  };

  const riskLabel = useMemo(() => {
    if (risks.some((r) => String(r.level || "").toLowerCase() === "high")) return "High";
    if (risks.some((r) => String(r.level || "").toLowerCase() === "medium")) return "Moderate";
    return risks.length ? "Low" : "Pending";
  }, [risks]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(draft);
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <AppSidebar active="health_summary" />
      <main className="flex-1 p-6 overflow-y-auto space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-cyan-700 to-emerald-600 p-8 text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-100">AI Health Insights</p>
          <h1 className="mt-2 text-3xl font-bold">Health Summary Assistant</h1>
          <p className="mt-2 text-sm text-cyan-50">Connected to your `medvault_ai` service.</p>
          <p className="mt-2 text-xs text-cyan-100">
            AI endpoint: {AI_API_URL} | Status:{" "}
            {aiOnline === null ? "Checking..." : aiOnline ? "Online" : "Offline"}
          </p>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 grid gap-3 md:grid-cols-[2fr_1fr]">
          <select value={selectedRecordId} onChange={(e) => setSelectedRecordId(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none">
            {pdfRecords.map((r) => <option key={r._id} value={r._id}>{r.fileName}</option>)}
            {!pdfRecords.length && <option>No PDF records found</option>}
          </select>
          <button onClick={syncSelectedRecord} disabled={syncing || !pdfRecords.length || aiOnline === false} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white disabled:bg-cyan-300">
            <UploadCloud size={16} /> {syncing ? "Syncing..." : "Sync Record To AI"}
          </button>
          <p className="text-xs text-slate-500 md:col-span-2">Active report id: {reportId || "Not synced yet"}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100"><p className="text-sm text-slate-500">Risk Level</p><p className="mt-2 text-2xl font-bold">{riskLabel}</p></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100"><p className="text-sm text-slate-500">Insights</p><p className="mt-2 text-2xl font-bold">{summary.length}</p></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100"><p className="text-sm text-slate-500">Alerts</p><p className="mt-2 text-2xl font-bold">{alerts.length}</p></article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_1.8fr]">
          <article className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold">AI Insight Snapshot</h2>
            <div className="mt-4 space-y-3">
              {(summary.length ? summary.slice(0, 3) : ["Sync a report to generate summary points."]).map((s, i) => (
                <div key={`${i}-${s}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm">{s}</p></div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold">Ask MedVault AI</h2>
            <div className="mt-4 h-[300px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              {messages.map((m) => <div key={m.id} className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${m.role === "assistant" ? "bg-white border border-slate-200" : "ml-auto bg-cyan-600 text-white"}`}>{m.content}</div>)}
              {thinking && <div className="max-w-[90%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">Thinking...</div>}
            </div>
            <form onSubmit={onSubmit} className="mt-4 flex gap-3">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask anything about your report..." className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none" />
              <button type="submit" disabled={thinking} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white disabled:bg-cyan-300"><Send size={14} />Ask</button>
            </form>
          </article>
        </section>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><p className="text-sm inline-flex items-center gap-2"><ShieldCheck size={14} />{notice}</p></div>
      </main>
    </div>
  );
};

export default HealthSummaryAI;
