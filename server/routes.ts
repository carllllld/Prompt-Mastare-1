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

      // System prompt to guide the AI
      const systemPrompt = `Du är en expert på prompt engineering. Din uppgift är att optimera användarens prompt för en AI-modell.
      Användarens prompt-kategori är: ${type}.
      
      Du ska returnera svaret EXAKT i JSON-format med följande struktur:
      {
        "improvedPrompt": "Den förbättrade, kompletta prompten",
        "improvements": ["Punkt 1 om vad som förbättrades", "Punkt 2...", "Punkt 3..."],
        "suggestions": ["Förslag 1 för att göra den ännu bättre", "Förslag 2...", "Förslag 3..."]
      }
      
      Regler:
      1. Den förbättrade prompten ska vara tydlig, strukturerad och effektiv.
      2. 'improvements' ska förklara vad du ändrade (t.ex. "Lade till kontext", "Tydliggjorde målet").
      3. 'suggestions' ska vara konkreta tips (t.ex. "Be om utdata i tabellform", "Lägg till exempel").
      4. Håll språket i 'improvements' och 'suggestions' på Svenska. Den förbättrade prompten ska vara på samma språk som originalprompten (eller engelska om det är kodning/tekniskt och lämpligare).`;

      try {
        const completion = await openai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          model: "gpt-4o", // Or a suitable model available in Replit AI
          response_format: { type: "json_object" },
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
