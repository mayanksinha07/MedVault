import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Send, ShieldCheck, UploadCloud } from "lucide-react";
import AppSidebar from "../components/AppSidebar";

type ChatRole = "assistant" | "user";
type RecordItem = { _id: string; fileName: string; fileUrl: string };
type InsightRes = {
  summary?: string[];
  risk_predictions?: Array<{ risk: string; level: string }>;
  borderline_alerts?: Array<{ parameter: string; note: string }>;
};
type Message = { id: string; role: ChatRole; content: string };

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const AI_API_URL = (import.meta.env.VITE_AI_API_URL as string | undefined) || "http://localhost:8000";
const REPORT_KEY = "medvault_ai_report_id";
const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const getPatientId = () => "medvault-user";

const readErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = (await response.json()) as { detail?: string; message?: string };
    return data.detail || data.message || fallback;
  } catch {
    return fallback;
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

  useEffect(() => {
    const checkAiHealth = async () => {
      try {
        const res = await fetch(`${AI_API_URL}/health`);
        setAiOnline(res.ok);
        if (!res.ok) {
          setNotice("AI service is unreachable. Start medvault_ai server on port 8000.");
        }
      } catch {
        setAiOnline(false);
        setNotice("AI service is unreachable. Start medvault_ai server on port 8000.");
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
        setRecords(Array.isArray(data) ? data : []);
        if (data?.length) setSelectedRecordId(data[0]._id);
      } catch {
        setNotice("Could not load records for AI sync.");
      }
    };
    void loadRecords();
  }, []);

  const fetchInsights = async (id: string) => {
    const res = await fetch(`${AI_API_URL}/api/v2/insights/analyse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_id: id }),
    });
    if (!res.ok) throw new Error("Insight analysis failed");
    const data = (await res.json()) as InsightRes;
    setSummary(data.summary || []);
    setRisks(data.risk_predictions || []);
    setAlerts(data.borderline_alerts || []);
  };

  const syncSelectedRecord = async () => {
    if (aiOnline === false) return setNotice("AI service is offline. Start medvault_ai first.");
    const item = records.find((r) => r._id === selectedRecordId);
    if (!item || !API_URL) return setNotice("Select a record first.");
    const token = getToken();
    if (!token) return setNotice("Please sign in again.");
    if (!item.fileUrl) return setNotice("Selected record has no file URL. Re-upload this record.");
    setSyncing(true);
    try {
      let fileRes = await fetch(`${API_URL}${item.fileUrl}`);
      if (!fileRes.ok) {
        fileRes = await fetch(`${API_URL}${item.fileUrl}`, {
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
      const aiRes = await fetch(`${AI_API_URL}/api/v2/pdf/upload`, { method: "POST", body: form });
      if (!aiRes.ok) {
        throw new Error(await readErrorMessage(aiRes, "AI PDF upload failed"));
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
      const res = await fetch(`${AI_API_URL}/api/v2/chatbot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, question: text }),
      });
      if (!res.ok) throw new Error("AI chat failed");
      const data = (await res.json()) as { answer?: string };
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: data.answer || "No answer." }]);
    } catch (e) {
      setMessages((m) => [...m, { id: `e-${Date.now()}`, role: "assistant", content: e instanceof Error ? e.message : "AI error" }]);
    } finally {
      setThinking(false);
    }
  };

  const riskLabel = useMemo(() => {
    if (risks.some((r) => r.level.toLowerCase() === "high")) return "High";
    if (risks.some((r) => r.level.toLowerCase() === "medium")) return "Moderate";
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
            {records.map((r) => <option key={r._id} value={r._id}>{r.fileName}</option>)}
            {!records.length && <option>No records found</option>}
          </select>
          <button onClick={syncSelectedRecord} disabled={syncing || !records.length || aiOnline === false} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white disabled:bg-cyan-300">
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
