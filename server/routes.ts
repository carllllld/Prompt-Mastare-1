import { Switch, Route } from "wouter";
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import OpenAI from "openai";
import { optimizeRequestSchema, type PlanType, type User } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPEN_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// --- THE ELITE REALTOR DNA (MASSIVE DATA INJECTION) ---
const REALTOR_KNOWLEDGE_BASE = `
### DIN IDENTITET & EXPERTIS
Du är en Senior Marknadsstrateg och Mäklarcoach med 20 års erfarenhet av den svenska fastighetsmarknaden. Din expertis täcker arkitektur, materialvetenskap, fastighetsjuridik och konsumentpsykologi.

### ARKITEKTONISKT BIBLIOTEK (STYLE INJECTION)
- 1880-1920: Sekelskifte. Karaktär: Takhöjd (3m+), stuckatur, takrosetter, speglade golvsocklar (15-20cm), serveringsgångar, spegeldörrar med överstycken, fiskbensparkett, spröjsade korspostfönster, kakelugnar, gjutjärnsradiatorer. Retorik: "Kontinental elegans", "arkitektonisk tidsresa".
- 1920-tal: Nordisk klassicism (Swedish Grace). Karaktär: Stramare än sekelskiftet men med bevarad elegans. Smala spröjs, 6-delade fönster, diskreta taklister.
- 1930-1940: Funktionalism (Funkis). Karaktär: Runda fönster (oxögon), hörn fönster, slätspontade dörrar, teakdetaljer, smidesräcken, kolmårdsmarmor i trapphus. Retorik: "Ljusflöde", "form följer funktion".
- 1960-1970: Modernism/Tegel. Karaktär: Yteffektivitet, stora fönsterpartier, gillestugor, vidbyggda garage, platta tak eller sadeltak.
- Nyproduktion: Svanenmärkt, öppen planlösning, köksöar, hiss till garage, hållbarhetstänk.

### MATERIAL & TEKNIK (SENSORY RULES)
- Golv: Skilj på laminat, 3-stavsparkett, enstavsparkett (exklusivt), massiv furu, slipbar fiskbensparkett, kalksten (Öland/Jämtland), Carraramarmor.
- Teknik: Bergvärme, fjärrvärme, FTX-ventilation, solceller, laddstolpar. Om detta saknas i indata, SKALL det flaggas.
- Storytelling-regel: Koppla materialet till känslan. "De svala kalkstensgolven möter fötterna i hallen", "Ekgolvets varma lyster reflekterar eftermiddagsljuset".

### STRATEGISK ANALYS & PSYKOLOGI (TARGETING)
- BUDGET: Fokus på insteg, låg avgift, stabil Brf, närhet till T-bana/buss, framtida värdeökning.
- FAMILJ: Fokus på "det enkla livet". Groventré (viktigt!), tvättstuga, förvaring (klädkammare), bilfria vägar, skolgång.
- PREMIUM: Fokus på integritet, "extraordinärt", materialval, arkitektens namn, historik, exklusivitet.

### RETORISKA LAGAR (THE ANTI-AI SHIELD)
- TOTALFÖRBUD: "Ljus och fräsch", "Ett stenkast från", "Fantastisk", "Unik chans", "Hjärtat i huset", "Välplanerad", "Chans", "Magisk".
- EMOJI-FÖRBUD: Inga emojis i professionell copy eller social media.
- VERIFIERING: Ersätt adjektiv med bevis. Skriv inte "bra förvaring", skriv "en rymlig walk-in-closet om 6 kvadratmeter".
`;

  app.post(api.optimize.path, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Inloggning krävs" });

      const user = await storage.getUserById(userId);
      const plan = (user?.plan as PlanType) || "free";
      const { prompt, type, platform } = optimizeRequestSchema.parse(req.body);

      const finalSystemPrompt = `
        ${REALTOR_KNOWLEDGE_BASE}

        DIN ARBETSPROCESS (CHAIN OF THOUGHT & VERIFICATION):

        STEG 1: DJUP ANALYS. Läs igenom indatan. Var ligger objektet? Finns det kända fördelar eller framtida infrastruktur. Vilken tidsepok? Vilken prisklass? Vem är köparen? Vad har mäklaren GLÖMT? (Fiber? Pantbrev? Driftskostnad? Parkeringsplats?)

        STEG 2: STRATEGISK PLANERING. Bestäm tonläget. Om objektet är unikt (t.ex. en herrgård eller en liten stuga), anpassa din intelligens efter dess "själ".

        STEG 3: PRODUKTION. Skriv en huvudtext. Använd Grounded Sensory Storytelling.

        STEG 4: CHAIN OF VERIFICATION. Läs din text. Innehåller den förbudna ord? Om ja, skriv om. Är den för kort? Expandera. Innehåller den emojis? Ta bort.

        STEG 5: SLUTRESULTAT. Leverera i JSON format:
        {
          "internal_reasoning": "Dold analys",
          "analysis": {
            "target_group": "...",
            "usp": ["...", "...", "..."],
            "tone_choice": "...",
            "area_advantage": "Beskrivning av område/infrastruktur (t.ex. Tunnelbana i Nacka)"
          },
          "improvedPrompt": "Beskrivningen",
          "socialCopy": "Teaser",
          "critical_gaps": ["Lista på saker mäklaren bör lägga till/dubbelkolla"], 
          "pro_tips": ["Strategiska säljknep för visning/foto"]
        }
      `;

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: `OBJEKT: ${type}. PLATTFORM: ${platform}. RÅDATA: ${prompt}` }
        ],
        model: plan === "pro" ? "gpt-4o" : "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      await storage.createOptimization({
        userId,
        originalPrompt: prompt,
        improvedPrompt: result.improvedPrompt,
        socialCopy: result.socialCopy,
        category: type,
        improvements: [
          `Målgrupp: ${result.analysis?.target_group}`,
          `Strategi: ${result.analysis?.tone_choice}`,
          ...result.critical_gaps.map((g: string) => `KOM IHÅG: ${g}`)
        ],
        suggestions: result.pro_tips,
      });

      res.json(result);
    } catch (err) {
      console.error("KRITISKT FEL:", err);
      res.status(500).json({ message: "Strategimotorn kunde inte slutföra analysen pga tekniskt fel." });
    }
  });

  return httpServer;
}