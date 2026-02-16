import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, Image, Loader2 } from "lucide-react";
import { type OptimizeResponse } from "@shared/schema";

interface PdfExportProps {
  result: OptimizeResponse;
}

export function PdfExport({ result }: PdfExportProps) {
  const [logo, setLogo] = useState<string | null>(() => {
    try { return localStorage.getItem("broker_logo"); } catch { return null; }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogo(dataUrl);
      try { localStorage.setItem("broker_logo", dataUrl); } catch {}
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogo(null);
    try { localStorage.removeItem("broker_logo"); } catch {}
  };

  const generatePdf = async () => {
    setIsGenerating(true);

    try {
      // Build HTML content for PDF
      const sections: { title: string; content: string }[] = [];

      if (result.headline) {
        sections.push({ title: "Rubrik", content: result.headline });
      }
      sections.push({ title: "Objektbeskrivning", content: result.improvedPrompt });
      if (result.instagramCaption) {
        sections.push({ title: "Instagram / Facebook", content: result.instagramCaption });
      }
      if (result.showingInvitation) {
        sections.push({ title: "Visningsinbjudan", content: result.showingInvitation });
      }
      if (result.shortAd) {
        sections.push({ title: "Kortannons", content: result.shortAd });
      }
      if (result.socialCopy) {
        sections.push({ title: "Social media (kort)", content: result.socialCopy });
      }

      const dateStr = new Date().toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #1D2939; padding: 48px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 24px; border-bottom: 2px solid #E8E5DE; margin-bottom: 32px; }
    .header-logo img { max-height: 48px; max-width: 200px; }
    .header-date { font-size: 11px; color: #9CA3AF; }
    .kit-badge { display: inline-block; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #2D6A4F; background: #E8F5E9; padding: 4px 12px; border-radius: 100px; margin-bottom: 24px; }
    .section { margin-bottom: 32px; page-break-inside: avoid; }
    .section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: #9CA3AF; margin-bottom: 8px; }
    .section-content { font-family: 'Lora', Georgia, serif; font-size: 14px; line-height: 1.7; color: #1D2939; white-space: pre-wrap; }
    .section-headline .section-content { font-size: 20px; font-weight: 600; line-height: 1.3; }
    .divider { height: 1px; background: #F0EDE6; margin: 24px 0; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E8E5DE; font-size: 10px; color: #D1D5DB; text-align: center; }
    .highlights { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
    .highlight-tag { font-size: 11px; background: #F0FDF4; color: #166534; padding: 4px 12px; border-radius: 100px; border: 1px solid #BBF7D0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-logo">
      ${logo ? `<img src="${logo}" alt="Logo" />` : '<div style="font-size: 14px; font-weight: 600; color: #2D6A4F;">Mäklarens Textkit</div>'}
    </div>
    <div class="header-date">${dateStr}</div>
  </div>

  <div class="kit-badge">Komplett Textkit</div>

  ${result.highlights && result.highlights.length > 0 ? `
  <div class="highlights">
    ${result.highlights.map(h => `<span class="highlight-tag">${h}</span>`).join("")}
  </div>` : ""}

  ${sections.map((s, i) => `
  ${i > 0 ? '<div class="divider"></div>' : ""}
  <div class="section ${s.title === 'Rubrik' ? 'section-headline' : ''}">
    <div class="section-label">${s.title}</div>
    <div class="section-content">${s.content}</div>
  </div>`).join("")}

  <div class="footer">Genererad med Mäklarens AI-Textkit — optiprompt.se</div>
</body>
</html>`;

      // Open in new window for printing/saving as PDF
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        // Auto-trigger print dialog after a short delay for fonts to load
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Logo upload */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />

      {logo ? (
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="h-6 max-w-[80px] object-contain rounded" />
          <button onClick={removeLogo} className="text-[10px] underline" style={{ color: "#9CA3AF" }}>
            Ta bort
          </button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="h-7 text-[11px]"
          style={{ color: "#9CA3AF" }}
        >
          <Upload className="w-3 h-3 mr-1" />
          Logga
        </Button>
      )}

      {/* PDF download */}
      <Button
        variant="outline"
        size="sm"
        onClick={generatePdf}
        disabled={isGenerating}
        className="h-8 text-xs font-medium"
        style={{ borderColor: "#D1D5DB", color: "#374151" }}
      >
        {isGenerating ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5 mr-1.5" />
        )}
        Ladda ner PDF
      </Button>
    </div>
  );
}
