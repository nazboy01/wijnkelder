"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// Eigen wijn die in jouw kelder zit
interface Wine {
  id: number;
  name: string;
  grape?: string;
  country?: string;
  vintage?: string | number;
  location?: string;
  quantity: number;
  price?: string | number;
  photoUrl?: string; // ✅ nieuwe veld voor foto
}

// Wijn uit de externe SampleAPI
interface ApiWine {
  id: number;
  wine: string;
  winery: string;
  location: string;
  rating?: {
    average: string;
    reviews: string;
  };
}

export default function WineCellarApp() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [newWine, setNewWine] = useState<Partial<Wine>>({
    name: "",
    grape: "",
    country: "",
    vintage: "",
    location: "",
    quantity: 1,
    price: "",
    photoUrl: "",
  });
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "stats">("list");

  // Resultaten van externe bibliotheek
  const [apiSearch, setApiSearch] = useState("");
  const [apiResults, setApiResults] = useState<ApiWine[]>([]);

  // Data laden en opslaan in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("wines");
    if (stored) setWines(JSON.parse(stored));
  }, []);
  useEffect(() => {
    localStorage.setItem("wines", JSON.stringify(wines));
  }, [wines]);

  // ✅ Fix: dubbele id voorkomen
  const handleAddWine = () => {
    if (!newWine.name) return;

    const wineToAdd: Wine = {
      id: Date.now(),
      name: newWine.name || "",
      grape: newWine.grape,
      country: newWine.country,
      vintage: newWine.vintage,
      location: newWine.location,
      quantity: newWine.quantity ?? 1,
      price: newWine.price,
      photoUrl: newWine.photoUrl,
    };

    setWines([...wines, wineToAdd]);
    setNewWine({
      name: "",
      grape: "",
      country: "",
      vintage: "",
      location: "",
      quantity: 1,
      price: "",
      photoUrl: "",
    });
  };

  const handleDrinkWine = (id: number) => {
    setWines(
      wines.map((wine) =>
        wine.id === id && wine.quantity > 0
          ? { ...wine, quantity: wine.quantity - 1 }
          : wine
      )
    );
  };

  const filteredWines = wines.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  // 🔍 Zoeken in SampleAPIs
  useEffect(() => {
    if (apiSearch.length < 3) {
      setApiResults([]);
      return;
    }
    const fetchData = async () => {
      try {
        const res = await fetch("https://api.sampleapis.com/wines/reds");
        const data: ApiWine[] = await res.json();

        const filtered = data.filter((item: ApiWine) =>
          item.wine.toLowerCase().includes(apiSearch.toLowerCase())
        );
        setApiResults(filtered);
      } catch (err) {
        console.error("Fout bij SampleAPI:", err);
      }
    };
    fetchData();
  }, [apiSearch]);

  const handleSelectApiWine = (wine: ApiWine) => {
    setNewWine({
      ...newWine,
      name: wine.wine || "",
      grape: wine.winery || "",
      country: wine.location || "",
    });
    setApiResults([]);
    setApiSearch("");
  };

  // 📸 Foto upload naar Supabase
  const handleUploadPhoto = async (file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("wine-photos")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      return;
    }

    const { data } = supabase.storage
      .from("wine-photos")
      .getPublicUrl(fileName);

    setNewWine({ ...newWine, photoUrl: data.publicUrl });
  };

  // Statistieken
  const totalBottles = wines.reduce((sum, w) => sum + w.quantity, 0);
  const totalValue = wines.reduce(
    (sum, w) =>
      sum + ((parseFloat(w.price as string) || 0) * w.quantity),
    0
  );
  const bottlesPerCountry = wines.reduce((acc: Record<string, number>, w) => {
    const c = w.country || "Onbekend";
    acc[c] = (acc[c] || 0) + w.quantity;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-3xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-4">🍷 Mijn Wijnkelder</h1>

      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded-lg ${
            view === "list" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setView("list")}
        >
          📋 Wijnlijst
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            view === "stats" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setView("stats")}
        >
          📊 Statistieken
        </button>
      </div>

      {view === "list" && (
        <>
          <input
            placeholder="Zoek in mijn kelder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 w-full border p-2 rounded-lg"
          />

          {/* Zoek in SampleAPI */}
          <div className="mb-4">
            <input
              placeholder="Zoek in Sample wijnbibliotheek..."
              value={apiSearch}
              onChange={(e) => setApiSearch(e.target.value)}
              className="w-full border p-2 rounded-lg"
            />
            {apiResults.length > 0 && (
              <ul className="border rounded-lg mt-1 bg-white shadow">
                {apiResults.map((wine: ApiWine) => (
                  <li
                    key={wine.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSelectApiWine(wine)}
                  >
                    {wine.wine} ({wine.location})
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Formulier nieuwe wijn */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <input
              className="border p-2 rounded-lg"
              placeholder="Naam"
              value={newWine.name || ""}
              onChange={(e) => setNewWine({ ...newWine, name: e.target.value })}
            />
            <input
              className="border p-2 rounded-lg"
              placeholder="Druif"
              value={newWine.grape || ""}
              onChange={(e) =>
                setNewWine({ ...newWine, grape: e.target.value })
              }
            />
            <input
              className="border p-2 rounded-lg"
              placeholder="Land"
              value={newWine.country || ""}
              onChange={(e) =>
                setNewWine({ ...newWine, country: e.target.value })
              }
            />
            <input
              className="border p-2 rounded-lg"
              placeholder="Jaargang"
              type="number"
              value={newWine.vintage?.toString() || ""}
              onChange={(e) =>
                setNewWine({ ...newWine, vintage: e.target.value })
              }
            />
            <input
              className="border p-2 rounded-lg"
              placeholder="Locatie"
              value={newWine.location || ""}
              onChange={(e) =>
                setNewWine({ ...newWine, location: e.target.value })
              }
            />
            <input
              className="border p-2 rounded-lg"
              placeholder="Aantal flessen"
              type="number"
              min="1"
              value={newWine.quantity?.toString() || "1"}
              onChange={(e) =>
                setNewWine({
                  ...newWine,
                  quantity: parseInt(e.target.value),
                })
              }
            />
            <input
              className="border p-2 rounded-lg"
              placeholder="Prijs per fles (€)"
              type="number"
              min="0"
              value={newWine.price?.toString() || ""}
              onChange={(e) =>
                setNewWine({ ...newWine, price: e.target.value })
              }
            />

            {/* 📸 Foto upload */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="border p-2 rounded-lg col-span-2"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadPhoto(file);
              }}
            />
          </div>

          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            onClick={handleAddWine}
          >
            ➕ Voeg wijn toe
          </button>

          <div className="mt-6 grid gap-3">
            {filteredWines.map((wine) => (
              <div
                key={wine.id}
                className={`p-4 rounded-lg shadow ${
                  wine.quantity === 0
                    ? "bg-red-100 border border-red-400"
                    : "bg-white"
                }`}
              >
                {/* Foto */}
                {wine.photoUrl && (
                  <img
                    src={wine.photoUrl}
                    alt={wine.name}
                    className="w-full h-40 object-cover rounded-lg mb-2"
                  />
                )}
                <h2 className="text-lg font-semibold">
                  {wine.name} ({wine.vintage})
                </h2>
                <p className="text-sm text-gray-600">
                  {wine.grape} - {wine.country}
                </p>
                <p className="text-sm">📍 {wine.location}</p>
                <p className="text-sm">
                  💶 {wine.price ? `€${wine.price}` : "-"} per fles
                </p>
                <p
                  className={`text-sm font-medium ${
                    wine.quantity === 0 ? "text-red-600 font-bold" : ""
                  }`}
                >
                  🍾 Aantal: {wine.quantity}
                </p>
                {wine.quantity === 0 && (
                  <p className="text-red-700 font-semibold">
                    ⚠️ Deze wijn is op!
                  </p>
                )}
                <button
                  className="mt-2 bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700"
                  onClick={() => handleDrinkWine(wine.id)}
                  disabled={wine.quantity === 0}
                >
                  🥂 Fles gedronken
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "stats" && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg shadow bg-white">
            <h2 className="text-lg font-semibold mb-2">📊 Statistieken</h2>
            <p>
              Totale flessen: <strong>{totalBottles}</strong>
            </p>
            <p>
              Totale waarde: <strong>€{totalValue.toFixed(2)}</strong>
            </p>
          </div>

          <div className="p-4 rounded-lg shadow bg-white">
            <h3 className="text-md font-semibold mb-2">🍇 Flessen per land</h3>
            <ul className="list-disc list-inside">
              {Object.entries(bottlesPerCountry).map(([country, qty]) => (
                <li key={country}>
                  {country || "Onbekend"}: {qty}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
