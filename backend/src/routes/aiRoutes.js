import express from "express";
import multer from "multer";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

const parseJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const isQuotaErrorMessage = (message = "") =>
  /429|quota|rate limit|resource_exhausted|exceeded your current quota/i.test(
    String(message)
  );

const isProviderConfigErrorMessage = (message = "") =>
  /401|403|invalid authentication credentials|access_token_type_unsupported|api key|api_key|permission denied|unauthorized|forbidden|model .* not found|unsupported model/i.test(
    String(message)
  );

const buildChatFallback = (body, mode, detail) => ({
  process_id: `CHAT-FALLBACK-${Date.now()}`,
  report_id: body?.report_id || "",
  question: body?.question || "",
  answer:
    mode === "quota"
      ? "Your report is synced. MedVault is currently answering in basic assistance mode. Please retry in a few minutes for advanced AI reasoning."
      : "Your report is synced. MedVault AI provider is currently unavailable because of an authentication or model configuration issue. Basic assistance mode is active while the provider configuration is corrected.",
  fallback: true,
  fallback_reason: mode,
  provider_message: detail,
});

const buildInsightsFallback = (body, mode, detail) => ({
  process_id: `INSIGHTS-FALLBACK-${Date.now()}`,
  report_id: body?.report_id || "",
  summary: [
    "Report is synced successfully to AI service.",
    "MedVault is currently running in basic insights mode.",
    "You can still use chat and record sync normally.",
    mode === "quota"
      ? "Advanced AI insight quality is temporarily reduced because provider quota is exhausted."
      : "Advanced AI insight quality is temporarily reduced because the AI provider configuration needs attention.",
    "Retry after the AI provider issue is resolved for full AI-generated insights.",
  ],
  risk_predictions: [
    {
      risk: "AI generation unavailable",
      level: "low",
    },
  ],
  borderline_alerts: [
    {
      parameter: "AI service",
      note:
        mode === "quota"
          ? "Quota limit reached for Gemini model."
          : "AI provider authentication or model configuration failed.",
    },
  ],
  fallback: true,
  fallback_reason: mode,
  provider_message: detail,
});

const proxyJson = async (res, path, body) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      const upstreamMessage =
        payload?.detail ||
        payload?.message ||
        `AI service request failed for ${path}`;

      if (path === "/api/v2/chatbot/ask" && isQuotaErrorMessage(upstreamMessage)) {
        return res.status(200).json(buildChatFallback(body, "quota", upstreamMessage));
      }

      if (
        path === "/api/v2/chatbot/ask" &&
        isProviderConfigErrorMessage(upstreamMessage)
      ) {
        return res
          .status(200)
          .json(buildChatFallback(body, "provider_config", upstreamMessage));
      }

      if (
        path === "/api/v2/insights/analyse" &&
        isQuotaErrorMessage(upstreamMessage)
      ) {
        return res
          .status(200)
          .json(buildInsightsFallback(body, "quota", upstreamMessage));
      }

      if (
        path === "/api/v2/insights/analyse" &&
        isProviderConfigErrorMessage(upstreamMessage)
      ) {
        return res
          .status(200)
          .json(buildInsightsFallback(body, "provider_config", upstreamMessage));
      }

      return res.status(response.status).json({
        message: upstreamMessage,
      });
    }
    return res.status(200).json(payload || {});
  } catch (error) {
    return res.status(503).json({
      message:
        error instanceof Error
          ? error.message
          : "AI service is unreachable. Start medvault_ai server.",
    });
  }
};

router.get("/health", async (_req, res) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/health`);
    const payload = await parseJsonSafe(response);
    return res.status(response.ok ? 200 : 503).json(
      payload || {
        status: response.ok ? "ok" : "error",
      }
    );
  } catch (error) {
    return res.status(503).json({
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "AI service is unreachable. Start medvault_ai server.",
    });
  }
});

router.post("/insights/analyse", async (req, res) => {
  return proxyJson(res, "/api/v2/insights/analyse", req.body || {});
});

router.post("/insights/summary", async (req, res) => {
  return proxyJson(res, "/api/v2/insights/summary", req.body || {});
});

router.post("/insights/risks", async (req, res) => {
  return proxyJson(res, "/api/v2/insights/risks", req.body || {});
});

router.post("/insights/alerts", async (req, res) => {
  return proxyJson(res, "/api/v2/insights/alerts", req.body || {});
});

router.post("/insights/visualization", async (req, res) => {
  return proxyJson(res, "/api/v2/insights/visualization", req.body || {});
});

router.post("/chatbot/ask", async (req, res) => {
  return proxyJson(res, "/api/v2/chatbot/ask", req.body || {});
});

router.post("/pdf/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const form = new FormData();
    const contentType = req.file.mimetype || "application/pdf";
    const blob = new Blob([req.file.buffer], { type: contentType });
    form.append("file", blob, req.file.originalname || "report.pdf");
    form.append("patient_id", String(req.body?.patient_id || "medvault-user"));

    const response = await fetch(`${AI_SERVICE_URL}/api/v2/pdf/upload`, {
      method: "POST",
      body: form,
    });
    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      return res.status(response.status).json({
        message:
          payload?.detail || payload?.message || "AI PDF upload failed",
      });
    }
    return res.status(200).json(payload || {});
  } catch (error) {
    return res.status(503).json({
      message:
        error instanceof Error
          ? error.message
          : "AI service is unreachable. Start medvault_ai server.",
    });
  }
});

export default router;
