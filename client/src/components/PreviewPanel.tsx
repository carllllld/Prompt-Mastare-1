import { useState } from "react";
import { Monitor, Smartphone, Eye, BarChart3 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface PreviewPanelProps {
  text: string;
  headline?: string;
  address?: string;
  price?: number;
  livingArea?: number;
  rooms?: number;
  images?: string[];
}

type Platform = "hemnet" | "booli";
type Device = "desktop" | "mobile";

export function PreviewPanel({
  text,
  headline,
  address,
  price,
  livingArea,
  rooms,
  images = [],
}: PreviewPanelProps) {
  const [platform, setPlatform] = useState<Platform>("hemnet");
  const [device, setDevice] = useState<Device>("desktop");

  // Calculate text stats
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;
  const readingTime = Math.ceil(wordCount / 200); // avg reading speed
  const paragraphs = text.split("\n\n").filter(Boolean).length;

  // Truncate text for preview (first 150 chars)
  const truncatedText = text.length > 150 ? text.slice(0, 150) + "..." : text;

  // Format price
  const formattedPrice = price
    ? new Intl.NumberFormat("sv-SE").format(price) + " kr"
    : "Pris ej angivet";

  // Hemnet styling
  const hemnetStyles = {
    container: "bg-white rounded-lg shadow-lg overflow-hidden max-w-3xl mx-auto",
    image: "w-full h-64 object-cover bg-gray-200",
    content: "p-6",
    address: "text-2xl font-bold text-gray-900 mb-2",
    meta: "flex items-center gap-3 text-gray-600 text-sm mb-4",
    text: "text-gray-700 leading-relaxed",
    button: "mt-4 bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors",
  };

  // Booli styling
  const booliStyles = {
    container: "bg-white rounded-lg shadow-lg overflow-hidden max-w-3xl mx-auto",
    image: "w-full h-64 object-cover bg-gray-200",
    content: "p-6",
    address: "text-2xl font-bold text-gray-900 mb-2",
    meta: "flex items-center gap-3 text-gray-600 text-sm mb-4",
    text: "text-gray-700 leading-relaxed",
    button: "mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors",
  };

  const styles = platform === "hemnet" ? hemnetStyles : booliStyles;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Förhandsvisning</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Platform selector */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setPlatform("hemnet")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                platform === "hemnet"
                  ? "bg-red-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Hemnet
            </button>
            <button
              onClick={() => setPlatform("booli")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                platform === "booli"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Booli
            </button>
          </div>

          {/* Device selector */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setDevice("desktop")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                device === "desktop"
                  ? "bg-gray-700 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                device === "mobile"
                  ? "bg-gray-700 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobil
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className={`${device === "mobile" ? "max-w-sm mx-auto" : ""}`}>
        <div className={styles.container}>
          {/* Image */}
          {images.length > 0 ? (
            <img src={images[0]} alt="Property" className={styles.image} />
          ) : (
            <div className={`${styles.image} flex items-center justify-center text-gray-400`}>
              <span className="text-sm">Ingen bild</span>
            </div>
          )}

          {/* Content */}
          <div className={styles.content}>
            {/* Address */}
            {address && <h2 className={styles.address}>{address}</h2>}

            {/* Meta */}
            <div className={styles.meta}>
              {price && <span className="font-semibold">{formattedPrice}</span>}
              {livingArea && <span>· {livingArea} kvm</span>}
              {rooms && <span>· {rooms} rum</span>}
            </div>

            {/* Headline */}
            {headline && (
              <p className="text-lg font-semibold text-gray-800 mb-3">{headline}</p>
            )}

            {/* Text preview */}
            <p className={styles.text}>{truncatedText}</p>

            {/* Read more button */}
            <button className={styles.button}>Läs mer</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">Textstatistik</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Ord</p>
            <p className="text-lg font-semibold text-gray-900">{wordCount}</p>
            <Badge
              variant={wordCount >= 300 && wordCount <= 500 ? "success" : "warning"}
              size="sm"
              className="mt-1"
            >
              {wordCount >= 300 && wordCount <= 500 ? "Perfekt!" : "Justera"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Tecken</p>
            <p className="text-lg font-semibold text-gray-900">{charCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Lästid</p>
            <p className="text-lg font-semibold text-gray-900">{readingTime} min</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Stycken</p>
            <p className="text-lg font-semibold text-gray-900">{paragraphs}</p>
          </div>
        </div>

        {/* Readability tips */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">Läsbarhetstips:</p>
          <ul className="space-y-1">
            {wordCount < 300 && (
              <li className="text-xs text-amber-700 flex items-start gap-2">
                <span>⚠️</span>
                <span>Texten är kort ({wordCount} ord). Lägg till mer information för bättre SEO.</span>
              </li>
            )}
            {wordCount > 500 && (
              <li className="text-xs text-amber-700 flex items-start gap-2">
                <span>⚠️</span>
                <span>Texten är lång ({wordCount} ord). Överväg att korta ner för bättre läsbarhet.</span>
              </li>
            )}
            {wordCount >= 300 && wordCount <= 500 && (
              <li className="text-xs text-green-700 flex items-start gap-2">
                <span>✓</span>
                <span>Perfekt längd för både SEO och läsbarhet!</span>
              </li>
            )}
            {device === "mobile" && (
              <li className="text-xs text-blue-700 flex items-start gap-2">
                <span>📱</span>
                <span>Mobilvänlig: Texten är lätt att läsa på mobil</span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
