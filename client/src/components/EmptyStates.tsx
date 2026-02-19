import { FileText, Users, Search, Plus, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function EmptyHistory() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen historik än</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        Dina objektbeskrivningar kommer att synas här när du börjar skapa.
      </p>
      <Link href="/">
        <Button className="inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Skapa din första beskrivning
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}

export function EmptyTeam() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Inget team än</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        Skapa ett team för att samarbeta på objektbeskrivningar med dina kollegor.
      </p>
      <Button className="inline-flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Skapa team
      </Button>
    </div>
  );
}

export function EmptySearch() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Inga sökresultat</h3>
      <p className="text-gray-500 max-w-sm mx-auto">
        Prova att justera dina sökfilter eller sökterm för att hitta det du letar efter.
      </p>
    </div>
  );
}

export function EmptyPersonalStyle() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen personlig stil än</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        Analysera din skrivstil för att få AI-genererade texter som låter som du.
      </p>
      <Button className="inline-flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Analysera skrivstil
      </Button>
    </div>
  );
}

export function EmptyAddressResults() {
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
        <Search className="w-6 h-6 text-gray-400" />
      </div>
      <h4 className="text-sm font-medium text-gray-900 mb-1">Inga adresser hittades</h4>
      <p className="text-xs text-gray-500">
        Försök med en mer specifik adress eller kontrollera stavningen.
      </p>
    </div>
  );
}

export function EmptyOptimizations() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Inga optimeringar än</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        Börja optimera dina prompter för att se förbättringsförslag och analyser.
      </p>
      <Link href="/">
        <Button className="inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Börja optimera
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}
