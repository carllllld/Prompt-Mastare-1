import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import OpenAI from "openai";
import { optimizeRequestSchema, type PlanType, type User } from "@shared/schema";
import { setupAuth } from "./auth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPEN_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);

  app.post(api.optimize.path, async (req, res) => {
    try {
      const userId = req.session?.userId;
      let user: User | null = null;
      if (userId) user = await storage.getUserById(userId);

      const plan = (user?.plan as PlanType) || "free";
      const { prompt, type, platform } = optimizeRequestSchema.parse(req.body);

      const platformInstruction = platform === "hemnet" 
        ? "Du skriver för Hemnet. Fokusera helt på känsla och beskrivande adjektiv. Repetera INTE siffror (kvm/rum) då de redan finns i faktarutan." 
        : "Du skriver för en egen hemsida. Inkludera all fakta (kvm, rum, adress) naturligt i texten.";

      const finalSystemPrompt = `
        Du är Sveriges främsta fastighetsmäklare och copywriter. 
        Språket ska vara elegant, förtroendeingivande och säljande.
        ${platformInstruction}

        UPPGIFT:
        1. Skapa en säljande beskrivning (improvedPrompt).
        2. Skapa en engagerande text för sociala medier (socialCopy). 
           VIKTIGT: Använd ABSOLUT INGA emojis i socialCopy. Texten ska vara ren och professionell.

        Svara i JSON:
        {
          "improvedPrompt": "Huvudtexten...",
          "socialCopy": "Text utan emojis...",
          "improvements": ["förbättring 1", "förbättring 2"],
          "suggestions": ["tips 1", "tips 2"]
        }
      `;

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: `Typ: ${type}\nPlatform: ${platform}\nData: ${prompt}` }
        ],
        model: plan === "pro" ? "gpt-4o" : "gpt-4o-mini",
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      // VIKTIG FIX: Säkerställ att vi har strängar och arrayer innan vi sparar
      if (userId) {
        await storage.createOptimization({
          userId,
          originalPrompt: prompt,
          improvedPrompt: result.improvedPrompt || "Kunde inte generera text",
          socialCopy: result.socialCopy || "", // Om AI missar detta, skicka tom sträng istället för krasch
          category: type || "apartment",
          improvements: Array.isArray(result.improvements) ? result.improvements : [],
          suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        });
      }

      res.json(result);
    } catch (err) {
      console.error("Genereringsfel:", err); // Logga felet i terminalen så vi ser vad som händer
      res.status(500).json({ message: "Internt fel vid generering" });
    }
  });

  return httpServer;
}