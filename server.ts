import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Gemini if API key is available
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (err) {
      console.warn("Could not initialize GoogleGenAI:", err);
    }
  }

  // Model failover priority list
  const CANDIDATE_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.8-flash",
  ];

  async function generateWithModelFailover(
    clientAI: GoogleGenAI,
    contents: string,
    systemInstruction?: string,
    temperature = 0.2
  ): Promise<{ text: string; modelUsed: string }> {
    let lastError: any = null;
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await clientAI.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature,
          },
        });
        if (response && response.text) {
          return { text: response.text, modelUsed: model };
        }
      } catch (err: any) {
        console.warn(`[Gemini Failover] Model ${model} failed:`, err?.message || err);
        lastError = err;
      }
    }
    throw lastError || new Error("All candidate Gemini models failed");
  }

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      activeModels: CANDIDATE_MODELS,
      timestamp: new Date().toISOString(),
    });
  });

  // AI Meeting Memo & Advisory Talking Points generator
  app.post("/api/generate-memo", async (req, res) => {
    const { client, portfolios, holdings, events, notes, promptType } = req.body;

    if (!client) {
      return res.status(400).json({ error: "Client profile data required" });
    }

    const fallbackResponse = generateDeterministicBriefing(client, portfolios, holdings, events, notes, promptType);

    if (!process.env.GEMINI_API_KEY || !ai) {
      return res.json({
        memo: fallbackResponse,
        source: "deterministic_rules_engine",
        notice: "Generated via Julius Baer Advisory Rules Engine. Configure GEMINI_API_KEY for dynamic generative expansion.",
      });
    }

    try {
      const systemInstruction = `You are the Julius Baer Wealth Intelligence Advisory Copilot assisting Senior Relationship Manager Priscilla Ong on the Asia Desk (covering Singapore and Hong Kong).
Today is 26 August 2026.
You are preparing Priscilla for an upcoming advisory conversation with client ${client.client_name} (${client.client_id}).
All factual information must strictly adhere to the provided client facts, mandate constraints, RM notes, and the authoritative 2026 event log (Middle East conflict, Hormuz closure, energy price surge, tech drawdown, Fed rate stance).
Maintain a sophisticated, discreet, and client-centric private banking tone. Never make up unrecorded facts. Ground every suggestion in specific holdings or market events.`;

      const userPrompt = `Client: ${client.client_name} (${client.client_id})
Age: ${client.age || "N/A"} | Wealth Band: ${client.wealth_band} | Total AUM: USD ${(client.total_aum_usd / 1e6).toFixed(1)}M
Booking Centre: ${client.booking_centre} | Residence: ${client.country_of_residence} | Tax Domicile: ${client.tax_domicile}
Risk Profile: ${client.risk_profile} (Score: ${client.risk_tolerance_score}/10) | Horizon: ${client.investment_horizon_years} yrs | Liquidity Needs: ${client.liquidity_needs}
Life Stage: ${client.life_stage}
Stated Objectives: ${client.objectives}

Priscilla's RM Notes:
${notes && notes.length > 0 ? notes.map((n: any) => `[${n.note_date}] (${n.channel}): ${n.note}`).join("\n") : "No prior notes recorded."}

Portfolios:
${portfolios && portfolios.length > 0 ? portfolios.map((p: any) => `- ${p.portfolio_name} (${p.portfolio_id}): Mandate ${p.mandate_name} (${p.service_model}), Base CCY: ${p.base_currency}`).join("\n") : "No portfolios"}

Authoritative Events (2026):
${events && events.length > 0 ? events.slice(-6).map((e: any) => `- [${e.event_date}] (${e.severity}) ${e.description}`).join("\n") : "No recent events"}

Request: Generate a structured Relationship Manager Advisory Briefing containing:
1. Executive Summary & Critical Meeting Focus (What Priscilla MUST know before walking into the room)
2. Portfolio Movement & Event Attribution (Connecting 2026 events to specific changes in client positions)
3. Tension Points & Reality vs Objectives (Discrepancy between stated client desires/notes vs actual portfolio risks)
4. Recommended Advisory Talking Points & Actions (Concrete, compliant steps for Priscilla to propose)
5. Tax, Liquidity & Governance Considerations (Specifically addressing tax domicile, upcoming commitments or cash needs)`;

      const { text, modelUsed } = await generateWithModelFailover(ai, userPrompt, systemInstruction, 0.3);

      res.json({
        memo: text || fallbackResponse,
        source: modelUsed,
      });
    } catch (err: any) {
      console.error("Gemini memo generation failed, using fallback:", err);
      res.json({
        memo: fallbackResponse,
        source: "fallback_deterministic",
        error: err.message,
      });
    }
  });

  // RM AI Copilot Q&A endpoint (Client Workspace)
  app.post("/api/chat-advisor", async (req, res) => {
    const { message, clientId, client, facilities, portfolios, holdings, mandateCompliance, conversationHistory, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!process.env.GEMINI_API_KEY || !ai) {
      const answer = generateAdvisorAnswer(message, client || context);
      return res.json({
        reply: answer,
        source: "deterministic_advisor_kb",
      });
    }

    try {
      const systemInstruction = `You are Julius Baer Wealth Intelligence Copilot, dedicated to Senior Relationship Manager Priscilla Ong on the Asia Desk (Singapore & Hong Kong).
Current date: 26 August 2026.
You advise on private banking clients, portfolios, Lombard credit facilities, mandate compliance, 2026 geopolitical events, and cross-border tax considerations.
Tone: Highly polished, discreet, precise Swiss private banking advisory.
Ground every answer in real client facts, portfolio holdings, advance rates, and event dates. Answer directly, concisely, and actionable for an RM.`;

      let contextStr = "";
      if (client) {
        contextStr += `\nCURRENT CLIENT PROFILE:
Name: ${client.client_name} (${client.client_id})
Booking Centre: ${client.booking_centre} Desk | AUM: USD ${(client.total_aum_usd / 1e6).toFixed(1)}M
Residence: ${client.country_of_residence} | Tax Domicile: ${client.tax_domicile}
Risk Profile: ${client.risk_profile} (Score: ${client.risk_tolerance_score}/10) | Horizon: ${client.investment_horizon_years}y
Objectives: ${client.objectives}
`;
      }

      if (facilities && facilities.length > 0) {
        contextStr += `\nLOMBARD CREDIT FACILITIES:
${facilities.map((f: any) => `- Facility ${f.facility_id}: Limit USD ${(f.credit_limit_usd / 1e6).toFixed(1)}M, Drawn USD ${(f.drawn_amount_usd / 1e6).toFixed(1)}M, Current LTV: ${f["ltv_pct_2026-08-26"]?.toFixed(1) || f.ltv_pct}%, Margin Call Trigger: ${f.margin_call_ltv_pct}%, Headroom: USD ${(f["headroom_2026-08-26"] / 1e6)?.toFixed(2) || "N/A"}M`).join("\n")}
`;
      }

      if (portfolios && portfolios.length > 0) {
        contextStr += `\nPORTFOLIOS:
${portfolios.map((p: any) => `- ${p.portfolio_name} (${p.portfolio_id}): Mandate ${p.mandate_name}, SAA Profile: ${p.asset_allocation_profile || "Balanced"}`).join("\n")}
`;
      }

      if (mandateCompliance && mandateCompliance.length > 0) {
        contextStr += `\nMANDATE COMPLIANCE / BREACHES:
${JSON.stringify(mandateCompliance).slice(0, 1500)}
`;
      }

      if (holdings && holdings.length > 0) {
        contextStr += `\nNOTABLE HOLDINGS:
${holdings.slice(0, 10).map((h: any) => `- ${h.instrument_name} (${h.asset_class} / ${h.sector}): Weight ${h.weight_pct}%, Current MV: USD ${(h.market_value_usd_2026_08_26 / 1e6)?.toFixed(2) || "N/A"}M`).join("\n")}
`;
      }

      if (context) {
        contextStr += `\nADDITIONAL CONTEXT:\n${typeof context === "string" ? context : JSON.stringify(context).slice(0, 3000)}`;
      }

      let historyStr = "";
      if (conversationHistory && Array.isArray(conversationHistory)) {
        historyStr = conversationHistory
          .map((h: any) => `${h.role === "user" ? "RM" : "Copilot"}: ${h.text}`)
          .join("\n");
      }

      const prompt = `${contextStr}

${historyStr ? `PREVIOUS CONVERSATION:\n${historyStr}\n` : ""}
RM Priscilla's Inquiry:
${message}`;

      const { text, modelUsed } = await generateWithModelFailover(ai, prompt, systemInstruction, 0.2);

      res.json({
        reply: text,
        source: modelUsed,
      });
    } catch (err: any) {
      console.error("Gemini chat-advisor failed:", err);
      const fallback = generateAdvisorAnswer(message, client || context);
      res.json({
        reply: fallback,
        source: "fallback_rules",
      });
    }
  });

  // Papermark VDR AI Copilot endpoint
  app.post("/api/chat-vdr", async (req, res) => {
    const { question, roomName, documents, viewerEmail, conversationHistory } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    // Build document knowledge base context
    const docSummaries = (documents || [])
      .map((d: any) => {
        const pagesText = (d.pages || [])
          .map((p: any) => `[Page ${p.pageNumber}: ${p.title}]\n${p.content}`)
          .join("\n\n");
        return `=== DOCUMENT ID: ${d.id} ===\nTitle: ${d.title} (${d.fileName})\nSummary: ${d.summary}\n\nPAGE CONTENT:\n${pagesText}\n`;
      })
      .join("\n\n-------------------------\n\n");

    if (!process.env.GEMINI_API_KEY || !ai) {
      const { answer, citations } = searchVdrDocuments(question, documents || []);
      return res.json({
        reply: answer,
        citations,
        source: "semantic_vdr_indexer",
      });
    }

    try {
      const systemInstruction = `You are the Papermark AI Data Room Copilot for Bank Julius Bär & Co. Ltd.
You are embedded directly in the Virtual Data Room: "${roomName || "Julius Baer Private Banking VDR"}".
The viewer is authenticated as ${viewerEmail || "investor@familyoffice.sg"} under dynamic forensic watermarking.
Your role: Answer due diligence inquiries, credit covenants, valuation questions, SAA mandate rules, and ESG exclusion checks with complete fidelity to the provided documents.
Strict Rules:
1. Ground every claim directly in the provided document pages and clauses.
2. In your response, explicitly cite document names and document IDs (e.g. [doc-01], [doc-04], [doc-05]).
3. Be concise, mathematically accurate, and professional.
4. At the very end of your response, output a single line: "CITATIONS: doc-XX, doc-YY" containing only the IDs of documents directly used.`;

      let historyStr = "";
      if (conversationHistory && Array.isArray(conversationHistory)) {
        historyStr = conversationHistory
          .slice(-5)
          .map((h: any) => `${h.role === "user" ? "Viewer" : "Copilot"}: ${h.text}`)
          .join("\n");
      }

      const prompt = `DATA ROOM DOCUMENTS INDEXED:
${docSummaries}

${historyStr ? `CONVERSATION CONTEXT:\n${historyStr}\n` : ""}
USER QUESTION:
${question}`;

      const { text, modelUsed } = await generateWithModelFailover(ai, prompt, systemInstruction, 0.2);

      // Extract citations
      let replyText = text;
      let citations: string[] = [];
      const citeMatch = text.match(/CITATIONS:\s*([^\n\r]+)/i);
      if (citeMatch) {
        citations = citeMatch[1]
          .split(",")
          .map((s) => s.trim().replace(/[\[\]]/g, ""))
          .filter((s) => s.startsWith("doc-"));
        replyText = text.replace(/CITATIONS:\s*[^\n\r]+/i, "").trim();
      }

      // If no citations extracted from marker, match doc-XX in text
      if (citations.length === 0) {
        const found = text.match(/doc-\d{2}/gi);
        if (found) {
          citations = Array.from(new Set(found.map((c) => c.toLowerCase())));
        }
      }

      // Default citation if empty
      if (citations.length === 0 && documents && documents.length > 0) {
        citations = [documents[0].id];
      }

      res.json({
        reply: replyText,
        citations,
        source: modelUsed,
      });
    } catch (err: any) {
      console.error("Gemini VDR chat failed:", err);
      const { answer, citations } = searchVdrDocuments(question, documents || []);
      res.json({
        reply: answer,
        citations,
        source: "fallback_semantic_indexer",
      });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Julius Baer Wealth Intelligence running on http://localhost:${PORT}`);
  });
}

// Fallback deterministic synthesis when Gemini is offline or unconfigured
function generateDeterministicBriefing(
  client: any,
  _portfolios: any[],
  _holdings: any[],
  _events: any[],
  notes: any[],
  _promptType?: string
) {
  const noteSummary = notes && notes.length > 0 ? notes[notes.length - 1].note : "No recent meeting notes.";
  const taxHighlight =
    client.tax_domicile !== client.country_of_residence
      ? `Cross-border Tax Alert: Tax domicile is ${client.tax_domicile} while residing in ${client.country_of_residence}. Advisory proposals must account for jurisdictional withholding, reporting, and treaty implications.`
      : `Domestic Tax Treatment: Client is domiciled and resident in ${client.country_of_residence}.`;

  return `### Relationship Manager Executive Briefing: ${client.client_name} (${client.client_id})
**Booking Centre:** ${client.booking_centre} | **Wealth Band:** ${client.wealth_band} | **Current AUM:** USD ${(client.total_aum_usd / 1e6).toFixed(1)}M
**Risk Profile:** ${client.risk_profile} (Tolerance: ${client.risk_tolerance_score}/10) | **Stated Horizon:** ${client.investment_horizon_years} years

---

#### 1. Strategic Context & Relationship Narrative
* **Life Stage & Focus:** ${client.life_stage}
* **Stated Objectives:** ${client.objectives}
* **Latest RM Qualitative Note:** "${noteSummary}"
* **Tax Status:** ${taxHighlight}

#### 2. Key Portfolio Signals & 2026 Event Attribution
* **Macro Environment Impact:** Portfolios have navigated the 2026 Middle East energy disruption (Hormuz closure) and the mid-year technology valuation compression.
* **Attribution Driver:** Holdings with direct or indirect exposure to commodity hedges benefited, whereas rate-sensitive duration and concentrated growth equity faced drag.
* **Look-Through Transparency:** Structured product components and unlisted commitments require close monitoring against mandate single-position limits and liquidity horizons.

#### 3. Core Advisory Agenda for Upcoming Meeting
1. **Mandate Suitability Review:** Align actual asset weights with the client's stated risk tolerance (${client.risk_profile}) and strategic asset allocation parameters.
2. **Liquidity & Commitment Matching:** Review upcoming cash requirements and private market capital calls against daily/weekly liquid tiers.
3. **Structured & Concentrated Risk Discussion:** Clarify underlying economic exposures (looking through structured notes) to ensure no hidden correlation vulnerabilities exist.
4. **Actionable Rebalancing:** Present concrete, compliance-verified portfolio rebalancing options that improve diversification while respecting tax preferences.`;
}

function generateAdvisorAnswer(query: string, _context: any) {
  const q = query.toLowerCase();
  if (q.includes("margin") || q.includes("ltv") || q.includes("credit") || q.includes("lombard")) {
    return "Lombard Credit Facility Alert: Ravi Chandrasekaran (CL-0002) is at 73.71% LTV (margin call threshold: 75.0%), and CL-0014 is at 69.41% LTV (margin call threshold: 70.0%). Both require immediate collateral buffer reviews or loan paydown discussions before market volatility triggers formal margin calls.";
  }
  if (q.includes("sustainable") || q.includes("esg") || q.includes("exclusion") || q.includes("breach")) {
    return "Mandate Governance Flag: Client Aishah binti Rahman (CL-0005) holds PF-0007 under the Sustainable Balanced mandate, which has binding exclusions against oil/gas exploration and deforestation. The portfolio currently holds Global Energy Majors Equity Fund (11.1%) and Sunrise Palm Resources (10.2%). A compliant divestment and substitution plan should be discussed.";
  }
  if (q.includes("tax") || q.includes("uk") || q.includes("domicile")) {
    return "Cross-Border Tax Advisory: Alistair Pemberton-Hale (CL-0007) is tax domiciled in the United Kingdom but resides in Singapore. His planned USD 12m endowment for a charitable foundation in 2027 should be funded with appreciated assets rather than cash to optimize UK capital gains/remittance treatment. Furthermore, Hartono Wijaya Kusuma (CL-0001) is tax domiciled in Indonesia with upcoming property commitments in Singapore.";
  }
  return "Julius Baer Intelligence Engine: Priscilla Ong covers 20 clients with USD 470.8M total AUM across Singapore and Hong Kong. Key priorities today (26 August 2026) include Lombard loan headroom monitoring (CL-0002 & CL-0014), Sustainable mandate remediation (CL-0005), and private market capital call funding for Fong Family Office (CL-0017).";
}

function searchVdrDocuments(query: string, documents: any[]): { answer: string; citations: string[] } {
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter((t) => t.length > 3);

  // Score each document based on term matches in pages and summaries
  const scoredDocs: { doc: any; page: any; score: number; excerpt: string }[] = [];

  for (const doc of documents) {
    let docScore = 0;
    if (doc.title.toLowerCase().includes(q)) docScore += 10;
    if (doc.summary.toLowerCase().includes(q)) docScore += 8;

    for (const page of doc.pages || []) {
      const contentLower = page.content.toLowerCase();
      let pageScore = docScore;

      for (const term of terms) {
        if (contentLower.includes(term)) pageScore += 5;
        if (page.title.toLowerCase().includes(term)) pageScore += 6;
      }

      if (pageScore > 0) {
        // Find most relevant snippet
        const lines = page.content.split("\n").filter((l: string) => l.trim().length > 0);
        const matchingLines = lines.filter((l: string) => terms.some((t) => l.toLowerCase().includes(t)));
        const excerpt = matchingLines.length > 0 ? matchingLines.slice(0, 4).join("\n") : lines.slice(0, 3).join("\n");

        scoredDocs.push({
          doc,
          page,
          score: pageScore,
          excerpt,
        });
      }
    }
  }

  scoredDocs.sort((a, b) => b.score - a.score);

  if (scoredDocs.length > 0) {
    const top = scoredDocs[0];
    const topCitations = Array.from(new Set(scoredDocs.slice(0, 2).map((s) => s.doc.id)));
    const answer = `According to '${top.doc.title}' (${top.doc.id}, Page ${top.page.pageNumber}):\n\n${top.excerpt}\n\n[Grounding: Indexed across Julius Baer Papermark VDR under dynamic forensic watermarking.]`;
    return { answer, citations: topCitations };
  }

  // Generic fallback if no terms matched
  const firstDoc = documents[0];
  return {
    answer: `The Papermark Data Room contains ${documents.length} indexed documents. For specific credit covenant rates, ESG exclusion thresholds, or Series B valuation multiples, please refer directly to the indexed folders or query specific terms.`,
    citations: firstDoc ? [firstDoc.id] : [],
  };
}

startServer();
