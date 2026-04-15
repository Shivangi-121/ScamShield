import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());

// =========================
// HEALTH CHECK
// =========================
app.get("/test", (req, res) => {
  res.json({ status: "backend working fine 🚀" });
});

// =========================
// 🧠 SCAM DETECTION (MOCK AI)
// =========================
app.post("/api/analyze", (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    let label = "Safe";
    let probability = 20;
    let reason = "Message looks normal.";

    const lowerText = text.toLowerCase();

    if (
      lowerText.includes("otp") ||
      lowerText.includes("bank") ||
      lowerText.includes("urgent") ||
      lowerText.includes("account blocked") ||
      lowerText.includes("click here") ||
      lowerText.includes("lottery") ||
      lowerText.includes("won")
    ) {
      label = "Scam";
      probability = 90;
      reason = "Contains common scam keywords.";
    } else if (
      lowerText.includes("offer") ||
      lowerText.includes("discount") ||
      lowerText.includes("call now")
    ) {
      label = "Suspicious";
      probability = 60;
      reason = "Looks promotional or suspicious.";
    }

    return res.json({
      label,
      probability,
      reason,
    });

  } catch (error) {
    console.error("Analyze error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// =========================
// 🔗 URL CHECKER
// =========================
app.post("/api/check-url", (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "No URL provided" });
    }

    const lowerUrl = url.toLowerCase();

    let riskScore = 20;
    let label = "Safe";
    let reasons = [];

    if (
      lowerUrl.includes("bit.ly") ||
      lowerUrl.includes("tinyurl") ||
      lowerUrl.includes("goo.gl")
    ) {
      riskScore += 30;
      reasons.push("Shortened URL can hide destination.");
    }

    if (
      lowerUrl.includes("login") ||
      lowerUrl.includes("verify") ||
      lowerUrl.includes("secure")
    ) {
      riskScore += 20;
      reasons.push("Contains login/verification wording.");
    }

    if (
      lowerUrl.includes("paypal") ||
      lowerUrl.includes("bank") ||
      lowerUrl.includes("amazon")
    ) {
      riskScore += 20;
      reasons.push("May impersonate trusted brand.");
    }

    if (
      lowerUrl.includes("alert") ||
      lowerUrl.includes("account")
    ) {
      riskScore += 10;
      reasons.push("Contains urgency/account-related words.");
    }

    if (riskScore >= 70) label = "Scam";
    else if (riskScore >= 45) label = "Suspicious";

    return res.json({
      url,
      label,
      risk_score: Math.min(riskScore, 100),
      reasons: reasons.length ? reasons : ["No obvious scam indicators found."],
    });

  } catch (error) {
    console.error("URL error:", error);
    return res.status(500).json({ error: "URL analysis failed" });
  }
});

// =========================
// 📩 FEEDBACK ROUTE
// =========================
app.post("/api/feedback", (req, res) => {
  try {
    const { input_data, original_label, user_label, type } = req.body;

    if (!input_data || !original_label || !user_label || !type) {
      return res.status(400).json({ error: "Missing feedback payload" });
    }

    console.log("📩 Feedback received:", {
      input_data,
      original_label,
      user_label,
      type,
      receivedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: "Feedback saved",
    });

  } catch (error) {
    console.error("Feedback error:", error);
    return res.status(500).json({ error: "Unable to save feedback" });
  }
});

// =========================
// 🚀 START SERVER (RENDER SAFE)
// =========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});