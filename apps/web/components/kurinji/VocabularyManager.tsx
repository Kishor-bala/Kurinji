"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Search, ArrowLeft, RefreshCw, X } from "lucide-react";

export interface VocabEntry {
  word_id: string;
  language: string;
  tamil_meaning: string;
  english_meaning: string;
  optional_romanised_pronunciation?: string;
  notes?: string;
  clips?: string[];
}

interface VocabularyManagerProps {
  onClose: () => void;
  initialLanguage?: string;
}

export default function VocabularyManager({
  onClose,
  initialLanguage = "Badaga",
}: VocabularyManagerProps) {
  const [language, setLanguage] = useState(initialLanguage);
  const [search, setSearch] = useState("");
  const [vocabList, setVocabList] = useState<VocabEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [newWordId, setNewWordId] = useState("");
  const [newTamil, setNewTamil] = useState("");
  const [newEnglish, setNewEnglish] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVocabulary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vocabulary?language=${language}&limit=500`);
      if (res.ok) {
        const data = await res.json();
        setVocabList(data.entries || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load vocabulary:", err);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchVocabulary();
  }, [fetchVocabulary]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordId || !newTamil || !newEnglish) return;
    setFormMsg("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word_id: newWordId,
          language: language,
          tamil_meaning: newTamil,
          english_meaning: newEnglish,
          notes: newNotes,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setFormMsg("Word added successfully!");
        setNewWordId("");
        setNewTamil("");
        setNewEnglish("");
        setNewNotes("");
        setShowAddForm(false);
        fetchVocabulary();
      } else {
        setFormMsg(data.message || "Failed to add entry.");
      }
    } catch {
      setFormMsg("Unable to add entry at this time. Please verify details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEntries = vocabList.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.word_id.toLowerCase().includes(q) ||
      (item.english_meaning && item.english_meaning.toLowerCase().includes(q)) ||
      (item.tamil_meaning && item.tamil_meaning.includes(q)) ||
      (item.optional_romanised_pronunciation && item.optional_romanised_pronunciation.toLowerCase().includes(q))
    );
  });

  return (
    <div className="vocab-manager-view">
      {/* Top Header */}
      <div className="manager-header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            className="nav-link-btn"
            onClick={onClose}
            title="Back to Voice Recognition"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Vocabulary Management</h2>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {total.toLocaleString()} human-verified {language} vocabulary entries
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="lang-selector">
            <button
              type="button"
              className={`lang-btn ${language === "Badaga" ? "active" : ""}`}
              onClick={() => setLanguage("Badaga")}
            >
              Badaga
            </button>
            <button
              type="button"
              className={`lang-btn ${language === "Marwari" ? "active" : ""}`}
              onClick={() => setLanguage("Marwari")}
            >
              Marwari
            </button>
          </div>

          <button
            type="button"
            className="analyse-button"
            style={{ width: "auto", padding: "8px 16px", margin: 0, fontSize: "0.85rem" }}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={16} /> {showAddForm ? "Cancel" : "Add Verified Word"}
          </button>
        </div>
      </div>

      {/* Add Word Modal Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          style={{
            background: "var(--bg-subtle)",
            padding: "16px 20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Add Verified {language} Entry</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-clear-btn"
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                Word ID (e.g. BDG_W1000)
              </label>
              <input
                type="text"
                value={newWordId}
                onChange={(e) => setNewWordId(e.target.value)}
                placeholder="BDG_W..."
                required
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                Tamil Meaning (தமிழ்)
              </label>
              <input
                type="text"
                value={newTamil}
                onChange={(e) => setNewTamil(e.target.value)}
                placeholder="தமிழ் அர்த்தம்"
                required
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-tamil"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                English Meaning
              </label>
              <input
                type="text"
                value={newEnglish}
                onChange={(e) => setNewEnglish(e.target.value)}
                placeholder="English meaning"
                required
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: formMsg.includes("Error") ? "#dc2626" : "#059669" }}>
              {formMsg}
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="text-submit-btn"
              style={{ padding: "8px 20px" }}
            >
              {isSubmitting ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div style={{ position: "relative", marginBottom: "12px" }}>
        <Search size={16} style={{ position: "absolute", left: "12px", top: "11px", color: "var(--text-light)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${language} by Word ID, English, Tamil, or Romanised pronunciation...`}
          style={{
            width: "100%",
            padding: "9px 12px 9px 36px",
            fontSize: "0.85rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            background: "var(--bg-subtle)",
            outline: "none",
          }}
        />
      </div>

      {/* Table Container */}
      <div className="table-wrapper">
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", gap: "8px", color: "var(--text-muted)" }}>
            <RefreshCw size={18} className="animate-spin" />
            <span>Loading {language} vocabulary...</span>
          </div>
        ) : (
          <table className="vocab-table">
            <thead>
              <tr>
                <th style={{ width: "120px" }}>Word ID</th>
                <th>English Meaning</th>
                <th>Tamil Meaning</th>
                <th>Romanised Pronunciation</th>
                <th style={{ width: "90px" }}>Audio</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.slice(0, 200).map((item) => (
                <tr key={item.word_id}>
                  <td>
                    <span className="word-id-tag">{item.word_id}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.english_meaning}</td>
                  <td className="tamil-text" style={{ fontSize: "1rem" }}>
                    {item.tamil_meaning}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    {item.optional_romanised_pronunciation || "—"}
                  </td>
                  <td>
                    {item.clips && item.clips.length > 0 ? (
                      <span style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 600 }}>
                        ✓ {item.clips.length} clip{item.clips.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    No matching vocabulary entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
