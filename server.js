import express from "express";
import dotenv from "dotenv";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";

dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ ok: true, message: "Pet Content Opportunity Miner is running" });
});
app.post("/api/mine", async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword) {
      return res.status(400).json({ error: "Keyword required" });
    }

    const prompt = `
You are an SEO growth strategist for a pet care company.

Keyword: "${keyword}"

Return ONLY valid JSON in this structure:

{
  "intent": "short explanation of the search intent",
  "user_questions": ["question1","question2","question3","question4","question5"],
  "landing_page_ideas": ["idea1","idea2","idea3","idea4","idea5"],
  "faq_schema": ["faq1","faq2","faq3","faq4","faq5"],
  "page_brief": {
    "headline": "landing page headline",
    "sections": ["section1","section2","section3","section4"],
    "cta": "call to action"
  }
}

Do not include markdown. Only return JSON.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a helpful SEO growth assistant." },
        { role: "user", content: prompt }
      ]
    });

    const result = JSON.parse(completion.choices[0].message.content);

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI generation failed" });
  }
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});