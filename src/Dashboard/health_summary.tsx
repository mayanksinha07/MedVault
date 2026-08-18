import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  CalendarClock,
  HeartPulse,
  MessageSquare,
  MoonStar,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import AppSidebar from "../components/AppSidebar";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

const quickQuestions = [
  "How is my heart health this week?",
  "Any warning signs in my recent vitals?",
  "What should I do to improve sleep quality?",
  "Can you summarize my current risk level?",
];

const getTimestamp = () =>
  new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const generateAiResponse = (question: string) => {
  const query = question.toLowerCase();

  if (query.includes("heart")) {
    return "Your heart trend is stable overall. Resting pulse is mostly in range, with a mild rise in the evening. Keep hydration up and continue light cardio 4-5 times this week.";
  }

  if (query.includes("warning") || query.includes("risk")) {
    return "Current risk is low-to-moderate. The main watchpoint is stress-linked blood pressure variation. Try 10-minute breathing breaks and reduce late caffeine.";
  }

  if (query.includes("sleep")) {
    return "Sleep quality can improve with a consistent wind-down routine. Aim for fixed bedtime, no screens 45 minutes before sleep, and avoid heavy meals after 9 PM.";
  }

  if (query.includes("sugar") || query.includes("diabetes")) {
    return "Glucose-related indicators look mostly controlled, but post-meal spikes appear on some days. Consider shorter, more frequent walks after meals.";
  }

  if (query.includes("exercise") || query.includes("workout")) {
    return "Recommended plan: 30 minutes brisk walk for 5 days, 2 strength sessions, and one full rest day. This should support both cardiovascular and metabolic stability.";
  }

  return "Based on your current records, your health trajectory is improving. Stay consistent with medications, hydration, and weekly activity to keep this trend positive.";
};

const initialMessages: ChatMessage[] = [
  {
    id: "ai-1",
    role: "assistant",
    content:
      "Hi, I am MedVault AI. I can summarize your health trends and answer questions from your recent records.",
    timestamp: getTimestamp(),
  },
];

const HealthSummary = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draftQuestion, setDraftQuestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [notice, setNotice] = useState(
    "Insights are generated from your records, vitals, appointments, and recent sharing history."
  );

  const healthScore = 89;
  const riskLevel = "Low to Moderate";
  const trendDirection = "+5% in last 14 days";

  const insightCards = useMemo(
    () => [
      {
        title: "Health Score",
        value: `${healthScore}%`,
        subtext: "Improving consistency",
        icon: <TrendingUp size={18} className="text-emerald-600" />,
      },
      {
        title: "Risk Signal",
        value: riskLevel,
        subtext: "Blood pressure variability",
        icon: <AlertTriangle size={18} className="text-amber-600" />,
      },
      {
        title: "Cardiac Status",
        value: "Stable",
        subtext: "Pulse trend in normal range",
        icon: <HeartPulse size={18} className="text-rose-500" />,
      },
      {
        title: "AI Trend",
        value: trendDirection,
        subtext: "Compared to past 2 weeks",
        icon: <Activity size={18} className="text-cyan-600" />,
      },
    ],
    []
  );

  const handleAskQuestion = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isThinking) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: getTimestamp(),
    };

    setMessages((current) => [...current, userMessage]);
    setDraftQuestion("");
    setIsThinking(true);

    const responseText = generateAiResponse(trimmed);

    window.setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: responseText,
        timestamp: getTimestamp(),
      };

      setMessages((current) => [...current, aiMessage]);
      setIsThinking(false);
      setNotice("New AI insight added based on your latest question.");
    }, 700);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    handleAskQuestion(draftQuestion);
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <AppSidebar active="health_summary" />

      <main className="flex-1 p-6 overflow-y-auto">
        <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-cyan-700 to-emerald-600 p-8 text-white shadow-lg">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-100">
                AI Health Insights
              </p>
              <h1 className="mt-2 text-3xl font-bold">Health Summary Assistant</h1>
              <p className="mt-2 max-w-2xl text-sm text-cyan-50">
                Review your health trends and ask MedVault AI questions for
                personalized guidance based on your records.
              </p>
            </div>

            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-cyan-100">
                AI Model Status
              </p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold">
                <Sparkles size={14} />
                Insights Active
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {insightCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{card.title}</p>
                {card.icon}
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-1 text-sm text-slate-600">{card.subtext}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1.8fr]">
          <article className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700">
                <Brain size={18} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  AI Insight Snapshot
                </h2>
                <p className="text-sm text-slate-500">
                  Highlights generated from your latest health data.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Today&apos;s Focus</p>
                <p className="mt-1 text-sm text-slate-600">
                  Manage stress spikes in the evening to stabilize blood pressure
                  and improve sleep recovery.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Medication Adherence</p>
                <p className="mt-1 text-sm text-slate-600">
                  2 of 3 reminders completed yesterday. Aim for all doses on time
                  for a stronger weekly trend.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Next Recommended Step</p>
                <p className="mt-1 text-sm text-slate-600">
                  Schedule a short follow-up in 7-10 days if high evening readings
                  continue for more than 3 days.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-800">
              <p className="text-sm inline-flex items-center gap-2">
                <CalendarClock size={14} />
                Last AI summary update: today at {getTimestamp()}
              </p>
            </div>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Ask MedVault AI
                </h2>
                <p className="text-sm text-slate-500">
                  Ask health questions and get personalized insights.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                <Bot size={14} />
                AI Chat
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {quickQuestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleAskQuestion(prompt)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-5 h-[320px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                    message.role === "assistant"
                      ? "bg-white text-slate-700 border border-slate-200"
                      : "ml-auto bg-cyan-600 text-white"
                  }`}
                >
                  <p>{message.content}</p>
                  <p
                    className={`mt-1 text-[11px] ${
                      message.role === "assistant"
                        ? "text-slate-400"
                        : "text-cyan-100"
                    }`}
                  >
                    {message.timestamp}
                  </p>
                </div>
              ))}

              {isThinking && (
                <div className="max-w-[90%] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  MedVault AI is analyzing your records...
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
              <div className="relative flex-1">
                <MessageSquare
                  size={16}
                  className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  type="text"
                  value={draftQuestion}
                  onChange={(event) => setDraftQuestion(event.target.value)}
                  placeholder="Ask about symptoms, trends, medications, or risks..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none transition focus:border-cyan-400 focus:bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={isThinking}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
              >
                <Send size={14} />
                Ask
              </button>
            </form>
          </article>
        </section>

        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <p className="text-sm inline-flex items-center gap-2">
            <ShieldCheck size={14} />
            {notice}
          </p>
        </div>

        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
          <p className="text-sm inline-flex items-center gap-2">
            <MoonStar size={14} />
            AI insights are supportive and informational. Consult your doctor for
            medical diagnosis or emergencies.
          </p>
        </div>
      </main>
    </div>
  );
};

export default HealthSummary;
