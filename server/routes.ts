import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

// Initialize OpenAI client - Replit AI integration handles the key automatically
// if configured, otherwise falls back to environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-mock-if-needed",
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post(api.optimize.path, async (req, res) => {
    try {
      const { prompt, type } = api.optimize.input.parse(req.body);

      // System prompt baserat på användarens önskemål
      const systemPrompt = `Du är en expert på prompt engineering och AI-kommunikation.
Ditt mål är att förbättra användarens prompt enligt bästa praxis.

Svara ALLTID i detta format (JSON):
{
  "improvedPrompt": "Den förbättrade prompten här...",
  "improvements": ["Punkt 1", "Punkt 2"],
  "suggestions": ["Förslag 1", "Förslag 2"]
}

Regler:
1. Den förbättrade prompten ska vara tydlig, strukturerad och effektiv.
2. 'improvements' ska förklara vad du ändrade (Svenska).
3. 'suggestions' ska vara konkreta tips (Svenska).`;

      try {
        const completion = await openai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Prompt-typ: ${type}\n\nAnvändarens prompt:\n${prompt}`
            },
          ],
          model: "gpt-4o",
          response_format: { type: "json_object" },
          temperature: 0.4,
        });

        const content = completion.choices[0].message.content;
        if (!content) {
          throw new Error("No content received from OpenAI");
        }

        const result = JSON.parse(content);
        
        // Validate result structure roughly
        const responseData = {
          improvedPrompt: result.improvedPrompt || "Kunde inte generera prompt.",
          improvements: Array.isArray(result.improvements) ? result.improvements : [],
          suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        };

        // Save to history (fire and forget)
        storage.createOptimization({
          originalPrompt: prompt,
          improvedPrompt: responseData.improvedPrompt,
          category: type,
          improvements: responseData.improvements,
          suggestions: responseData.suggestions,
        }).catch(err => console.error("Failed to save history:", err));

        res.json(responseData);
      } catch (openaiError: any) {
        console.error("OpenAI Error:", openaiError);
        
        // Fallback mock response if API fails (e.g. no credits/key)
        const mockResponse = {
          improvedPrompt: `[MOCK - AI API Error: ${openaiError.message}]\n\nHär är en förbättrad version av din prompt:\n\n"Agera som en expert inom ${type}. ${prompt}..."`,
          improvements: ["Simulerad förbättring 1", "Simulerad förbättring 2"],
          suggestions: ["Kontrollera API-nyckeln", "Prova igen senare"],
        };
        res.json(mockResponse);
      }

    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
