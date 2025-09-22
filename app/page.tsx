"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// Wijn in eigen kelder (Supabase)
interface Wine {
  id: number;
  name: string;
  grape?: string;
  country?: string;
  vintage?: number;
  location?: string;
  quantity: number;
  price?: number;
  photoUrl?: string;
}

// Wijn uit externe SampleAPI
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
    vintage: undefined,
    location: "",
    quantity: 1,
    price: undefined,
    photoUrl: "",
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔎 externe API zoekfunctie
  const [apiSearch, setApiSearch] = useState("");
  const [apiResults, setApiResults] = useState<ApiWine[]>([]);

  // ✅ Wijnen ophalen uit Supabase
  useEffect(() => {
    const fetchWines = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("wines").select("*");
      if (error) {
        console.error("Error loading wines:", error.message);
      } else {
        setWines(data as Wine[]);
      }
      setLoading(false);
    };
    fetchWines();
  }, []);

  // 📸 Foto upload naar Supabase bucket
  const handleUploadPhoto = async (file: File) => {
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("wine-photos")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error.message);
      return;
    }

    const { data } = supabase.storage
      .from("wine-photos")
      .getPublicUrl(fileName);

    setNewWine({ ...newWine, photoUrl: data.publicUrl });
  };

  // ➕ Nieuwe wijn toevoegen
  const handleAddWine = async () => {
    if (!newWine.name) return;

    const { data, error } = await supabase
      .from("wines")
      .insert([
        {
          name: newWine.name,
          grape: newWine.grape,
          country: newWine.country,
          vintage: newWine.vintage,
          location: newWine.location,
          quantity: newWine.quantity,
          price: newWine.price,
          photoUrl: newWine.photoUrl,
        },
      ])
      .select("*");

    if (error) {
      console.error("Error inserting wine:", error.message);
    } else {
      setWines([...wines, ...(data as Wine[])]);
      setNewWine({
        name: "",
        grape: "",
        country: "",
        vintage: undefined,
        location: "",
        quantity: 1,
        price: undefined,
        photoUrl: "",
      });
    }
  };

  // 🥂 Fles drinken
  const handleDrinkWine = async (id: number) => {
    const wine = wines.find((w) => w.id === id);
    if (!wine || wine.quantity <= 0) return;

    const newQty = wine.quantity - 1;
    const { error } = await supabase
      .from("wines")
      .update({ quantity: newQty })
      .eq("id", id);

    if (error) {
      console.error("Error updating wine:", error.message);
    } else {
      setWines(
        wines.map((w) =>
          w.id === id ? { ...w, quantity: newQty } : w
        )
      );
    }
  };

  // 🔎 Externe API zoeken
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

  // Filter eigen kelder
  const filteredWines = wines.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-3xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-4">🍷 Mijn Wijnkelder</h1>

      {/* Zoeken in eigen kelder */}
      <input
        placeholder="Zoek in mijn kelder..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full border p-2 rounded-lg"
      />

      {/* 🔎 Externe wijnbibliotheek */}
      <div className="mb-4">
        <input
          placeholder="Zoek in externe wijnbibliotheek..."
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
                onClick={() => {
                  setNewWine({
                    ...newWine,
                    name: wine.wine,
                    grape: wine.winery,
                    country: wine.location,
                  });
                  setApiResults([]);
                  setApiSearch("");
                }}
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
          onChange={(e) => setNewWine({ ...newWine, grape: e.target.value })}
        />
        <input
          className="border p-2 rounded-lg"
          placeholder="Land"
          value={newWine.country || ""}
          onChange={(e) => setNewWine({ ...newWine, country: e.target.value })}
        />
        <input
          className="border p-2 rounded-lg"
          placeholder="Jaargang"
          type="number"
          value={newWine.vintage?.toString() || ""}
          onChange={(e) =>
            setNewWine({ ...newWine, vintage: parseInt(e.target.value) })
          }
        />
        <input
          className="border p-2 rounded-lg"
          placeholder="Locatie"
          value={newWine.location || ""}
          onChange={(e) => setNewWine({ ...newWine, location: e.target.value })}
        />
        <input
          className="border p-2 rounded-lg"
          placeholder="Aantal flessen"
          type="number"
          value={newWine.quantity?.toString() || "1"}
          onChange={(e) =>
            setNewWine({ ...newWine, quantity: parseInt(e.target.value) })
          }
        />
        <input
          className="border p-2 rounded-lg"
          placeholder="Prijs (€)"
          type="number"
          value={newWine.price?.toString() || ""}
          onChange={(e) =>
            setNewWine({ ...newWine, price: parseFloat(e.target.value) })
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

      {loading ? (
        <p className="mt-4">⌛ Laden...</p>
      ) : (
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
              {wine.photoUrl && (
                <img
                  src={wine.photoUrl}
                  alt={wine.name}
                  className="w-full h-40 object-cover rounded-lg mb-2"
                />
              )}
              <h2 className="text-lg font-semibold">
                {wine.name} {wine.vintage ? `(${wine.vintage})` : ""}
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
              <button
                className="mt-2 bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50"
                onClick={() => handleDrinkWine(wine.id)}
                disabled={wine.quantity === 0}
              >
                🥂 Fles gedronken
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
