"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  GraduationCap,
  Award,
  Trophy,
  Users,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Volume2,
  Volume1,
  Play,
  Plus,
  Trash2,
  Printer,
  Download,
  Search,
  Sparkles,
  BookOpen,
  FileText,
  Check,
  X,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Puzzle,
  Clock,
  Layers,
  HelpCircle,
} from "lucide-react";
import { CustomLanguagePackage } from "./PackageBuilder";

export interface AssessmentWord {
  id: string;
  language_code: string;
  language_name: string;
  source_word?: string; // Oral mother tongue word (e.g. "Kannu", "Naaku")
  tamil_meaning: string;
  english_meaning: string;
  category?: string;
  audio_url?: string;
  badaga_audio_assets?: { audio_url: string }[];
  audio_assets?: { audio_url: string }[];
  tamil_syllables?: string;
}

export interface AssessmentQuiz {
  id: string;
  title: string;
  description: string;
  targetLanguage: string; // "all" | "badaga" | "marwari" | custom package ID
  scriptMode: "ta" | "en";
  enforceSlowMotion: boolean;
  words: AssessmentWord[];
  createdAt: number;
  assignedClass: string;
}

export interface StudentResult {
  id: string;
  studentName: string;
  assessmentTitle: string;
  language: string;
  score: number;
  totalWords: number;
  percentage: number;
  accuracyBadge: "distinction" | "proficient" | "needs_practice";
  trickySyllables: string[];
  timeSpentSeconds: number;
  completedAt: string;
}

interface AssessmentCenterProps {
  vocabulary: any[];
  customPackages: CustomLanguagePackage[];
  playAudio: (url: string, key?: string) => void;
  playTtsAudio: (text: string, lang?: "ta" | "en") => Promise<void>;
  speakSyllable: (syllable: string, lang: "ta" | "en", key?: string) => Promise<void>;
  speakText: (text: string, lang?: string, key?: string) => Promise<void>;
  isSlowAudio: boolean;
  setIsSlowAudio: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Robust Tamil Grapheme / Syllable segmentation
 */
function getTamilSyllables(tamilWord: string, presetSyllables?: string): string[] {
  if (presetSyllables && presetSyllables.includes(" + ")) {
    return presetSyllables.split(" + ").map((s) => s.trim()).filter(Boolean);
  }
  if (!tamilWord) return [];
  if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter("ta", { granularity: "grapheme" });
      const segments = Array.from(segmenter.segment(tamilWord))
        .map((s: any) => s.segment.trim())
        .filter((s: string) => s.length > 0);
      if (segments.length > 0) return segments;
    } catch {}
  }
  const matches = tamilWord.match(/[\u0B85-\u0B94]|[\u0B95-\u0BB9][\u0BCB-\u0BCD\u0BBE-\u0BC8\u0BD7]?/g);
  return matches && matches.length > 0 ? matches : tamilWord.split("");
}

function getEnglishLetters(word: string): string[] {
  if (!word) return [];
  return word
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .filter(Boolean);
}

export default function AssessmentCenter({
  vocabulary,
  customPackages,
  playAudio,
  playTtsAudio,
  speakSyllable,
  speakText,
  isSlowAudio,
  setIsSlowAudio,
}: AssessmentCenterProps) {
  // Perspective Role: "learner" (Student doing assessment) vs "teacher" (Educator Portal)
  const [perspective, setPerspective] = useState<"learner" | "teacher">("learner");

  // Teacher Sub-Tabs: "analytics" | "creator" | "worksheet"
  const [teacherTab, setTeacherTab] = useState<"analytics" | "creator" | "worksheet">("analytics");

  // Teacher-created custom quizzes persisted in localStorage
  const [teacherCustomQuizzes, setTeacherCustomQuizzes] = useState<AssessmentQuiz[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kurinji_teacher_custom_quizzes");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  // Real student results logged from actual learner assessment sessions
  const [studentResults, setStudentResults] = useState<StudentResult[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kurinji_gradebook_results");
        if (saved) {
          const parsed: StudentResult[] = JSON.parse(saved);
          // Strictly purge any legacy mock/dummy data
          if (Array.isArray(parsed)) {
            return parsed.filter(
              (r) =>
                r.id !== "res_1" &&
                r.id !== "res_2" &&
                r.id !== "res_3" &&
                r.id !== "res_4" &&
                !r.id.startsWith("sim_") &&
                r.studentName !== "Kavitha R." &&
                r.studentName !== "Selvan M." &&
                r.studentName !== "Anand B." &&
                r.studentName !== "Divya K."
            );
          }
        }
      } catch {}
    }
    return [];
  });

  // Persist Teacher Quizzes & Verified Gradebook Results
  useEffect(() => {
    try {
      localStorage.setItem("kurinji_teacher_custom_quizzes", JSON.stringify(teacherCustomQuizzes));
    } catch {}
  }, [teacherCustomQuizzes]);

  useEffect(() => {
    try {
      localStorage.setItem("kurinji_gradebook_results", JSON.stringify(studentResults));
    } catch {}
  }, [studentResults]);

  // Convert raw vocabulary items into standardized AssessmentWord items
  const allAvailableWords = useMemo<AssessmentWord[]>(() => {
    const list: AssessmentWord[] = [];

    // 1. From live canonical vocabulary database records
    if (Array.isArray(vocabulary)) {
      vocabulary.forEach((item) => {
        list.push({
          id: item.id || `${item.language_code}_${item.external_word_id}`,
          language_code: item.language_code || "badaga",
          language_name: item.language_name || (item.language_code === "badaga" ? "Badaga" : "Marwari"),
          source_word: item.source_word,
          tamil_meaning: item.tamil_meaning || "",
          english_meaning: item.english_meaning || "",
          category: item.category || "General Vocabulary",
          audio_url: item.audio_url,
          badaga_audio_assets: item.badaga_audio_assets,
          audio_assets: item.audio_assets,
          tamil_syllables: item.tamil_syllables,
        });
      });
    }

    // 2. From user-recorded custom language packages
    if (Array.isArray(customPackages)) {
      customPackages.forEach((pkg) => {
        if (pkg.vocabulary && Array.isArray(pkg.vocabulary)) {
          pkg.vocabulary.forEach((v) => {
            list.push({
              id: `custom_${pkg.id}_${v.id}`,
              language_code: pkg.id,
              language_name: pkg.name,
              source_word: v.nativeWord,
              tamil_meaning: v.tamilMeaning,
              english_meaning: v.englishMeaning,
              category: v.category || "Custom Package",
              audio_url: v.audioData,
              tamil_syllables: v.tamilSyllables,
            });
          });
        }
      });
    }

    return list;
  }, [vocabulary, customPackages]);

  // Dynamically assemble production assessments from canonical database records grouped by real categories
  const autoGeneratedQuizzes = useMemo<AssessmentQuiz[]>(() => {
    if (!vocabulary || vocabulary.length === 0) return [];

    const quizzesList: AssessmentQuiz[] = [];
    const groups: Record<
      string,
      { langCode: string; langName: string; category: string; words: AssessmentWord[] }
    > = {};

    vocabulary.forEach((item) => {
      const langCode = item.language_code || "badaga";
      const langName = item.language_name || (langCode === "badaga" ? "Badaga" : "Marwari");
      const cat = item.category || "Core Vocabulary";
      const key = `${langCode}_${cat}`;

      if (!groups[key]) {
        groups[key] = {
          langCode,
          langName,
          category: cat,
          words: [],
        };
      }

      groups[key].words.push({
        id: item.id || `${item.language_code}_${item.external_word_id}`,
        language_code: langCode,
        language_name: langName,
        source_word: item.source_word,
        tamil_meaning: item.tamil_meaning || "",
        english_meaning: item.english_meaning || "",
        category: cat,
        audio_url: item.audio_url,
        badaga_audio_assets: item.badaga_audio_assets,
        audio_assets: item.audio_assets,
        tamil_syllables: item.tamil_syllables,
      });
    });

    // Create a real assessment for each canonical category that has at least 3 words
    Object.entries(groups).forEach(([key, group]) => {
      if (group.words.length >= 3) {
        quizzesList.push({
          id: `canonical_${key}`,
          title: `${group.langName}: ${group.category} Syllable Assessment`,
          description: `Phonemic syllable assessment covering ${group.words.length} verified ${group.langName} words in category ${group.category}.`,
          targetLanguage: group.langCode,
          scriptMode: "ta",
          enforceSlowMotion: false,
          assignedClass: `${group.langName} Heritage Class`,
          createdAt: Date.now(),
          words: group.words.slice(0, 12),
        });
      }
    });

    // Create an assessment for any custom language package created by the user
    customPackages.forEach((pkg) => {
      if (pkg.vocabulary && pkg.vocabulary.length >= 2) {
        quizzesList.push({
          id: `custom_pkg_${pkg.id}`,
          title: `${pkg.name}: Community Syllable Test`,
          description: `Syllable assessment compiled from the ${pkg.vocabulary.length} recorded words in custom package "${pkg.name}".`,
          targetLanguage: pkg.id,
          scriptMode: pkg.scriptType === "tamil" ? "ta" : "en",
          enforceSlowMotion: false,
          assignedClass: `${pkg.name} Language Section`,
          createdAt: pkg.createdAt || Date.now(),
          words: pkg.vocabulary.map((v) => ({
            id: `custom_${pkg.id}_${v.id}`,
            language_code: pkg.id,
            language_name: pkg.name,
            source_word: v.nativeWord,
            tamil_meaning: v.tamilMeaning,
            english_meaning: v.englishMeaning,
            category: v.category || "Custom Vocabulary",
            audio_url: v.audioData,
            tamil_syllables: v.tamilSyllables,
          })),
        });
      }
    });

    return quizzesList;
  }, [vocabulary, customPackages]);

  // Combined Quizzes: Teacher custom assessments + Real canonical category assessments
  const allQuizzes = useMemo<AssessmentQuiz[]>(() => {
    return [...teacherCustomQuizzes, ...autoGeneratedQuizzes];
  }, [teacherCustomQuizzes, autoGeneratedQuizzes]);

  // =========================================================================
  // LEARNER ASSESSMENT TEST RUNNER STATE
  // =========================================================================
  const [activeQuiz, setActiveQuiz] = useState<AssessmentQuiz | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [testScore, setTestScore] = useState<number>(0);
  const [testStreak, setTestStreak] = useState<number>(0);
  const [testStartTime, setTestStartTime] = useState<number>(0);
  const [testCompleted, setTestCompleted] = useState<boolean>(false);
  const [trickySyllablesIdentified, setTrickySyllablesIdentified] = useState<string[]>([]);
  const [learnerName, setLearnerName] = useState<string>("");
  const [hasLoggedResult, setHasLoggedResult] = useState<boolean>(false);

  // Active Word Assembly Game Inside Quiz
  const [assembledTiles, setAssembledTiles] = useState<{ id: string; char: string }[]>([]);
  const [availableTiles, setAvailableTiles] = useState<{ id: string; char: string }[]>([]);
  const [wordStatus, setWordStatus] = useState<"playing" | "success" | "wrong">("playing");
  const [firstAttemptWrong, setFirstAttemptWrong] = useState<boolean>(false);

  // =========================================================================
  // TEACHER QUIZ CREATOR FORM STATE
  // =========================================================================
  const [creatorTitle, setCreatorTitle] = useState("");
  const [creatorClass, setCreatorClass] = useState("Indigenous Language Section");
  const [creatorLang, setCreatorLang] = useState<string>("badaga");
  const [creatorScript, setCreatorScript] = useState<"ta" | "en">("ta");
  const [creatorSlow, setCreatorSlow] = useState(false);
  const [creatorSearchWord, setCreatorSearchWord] = useState("");
  const [creatorSelectedWordIds, setCreatorSelectedWordIds] = useState<string[]>([]);
  const [creatorFeedback, setCreatorFeedback] = useState<string | null>(null);

  // Worksheet Selected Quiz State
  const [worksheetQuizId, setWorksheetQuizId] = useState<string>("");

  const activeWorksheetQuiz = useMemo<AssessmentQuiz | null>(() => {
    if (allQuizzes.length === 0) return null;
    return allQuizzes.find((q) => q.id === worksheetQuizId) || allQuizzes[0];
  }, [allQuizzes, worksheetQuizId]);

  // =========================================================================
  // LEARNER ASSESSMENT METHODS
  // =========================================================================
  const startQuiz = (quiz: AssessmentQuiz) => {
    if (quiz.enforceSlowMotion) {
      setIsSlowAudio(true);
    }
    setActiveQuiz(quiz);
    setCurrentWordIndex(0);
    setTestScore(0);
    setTestStreak(0);
    setTestCompleted(false);
    setTrickySyllablesIdentified([]);
    setTestStartTime(Date.now());
    setHasLoggedResult(false);
    loadWordForAssembly(quiz.words[0], quiz.scriptMode);
  };

  const loadWordForAssembly = (word: AssessmentWord, scriptMode: "ta" | "en") => {
    if (!word) return;
    setWordStatus("playing");
    setFirstAttemptWrong(false);
    setAssembledTiles([]);

    const targetUnits =
      scriptMode === "en"
        ? getEnglishLetters(word.english_meaning)
        : getTamilSyllables(word.tamil_meaning, word.tamil_syllables);

    const tiles = targetUnits.map((char, index) => ({
      id: `${char}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      char,
    }));

    const shuffled = [...tiles].sort(() => Math.random() - 0.5);
    if (shuffled.map((t) => t.char).join("") === targetUnits.join("") && targetUnits.length > 1) {
      shuffled.reverse();
    }
    setAvailableTiles(shuffled);

    // Play oral prompt sound automatically
    if (word.badaga_audio_assets && word.badaga_audio_assets.length > 0) {
      playAudio(word.badaga_audio_assets[0].audio_url);
    } else if (word.audio_assets && word.audio_assets.length > 0) {
      playAudio(word.audio_assets[0].audio_url);
    } else if (word.audio_url) {
      playAudio(word.audio_url);
    } else if (word.tamil_meaning) {
      speakText(word.tamil_meaning, "ta");
    }
  };

  const handleTilePick = (tile: { id: string; char: string }) => {
    if (!activeQuiz || wordStatus === "success") return;

    // Immediately pronounce tile sound
    speakSyllable(tile.char, activeQuiz.scriptMode);

    const newAvailable = availableTiles.filter((t) => t.id !== tile.id);
    const newAssembled = [...assembledTiles, tile];
    setAvailableTiles(newAvailable);
    setAssembledTiles(newAssembled);

    const currentWord = activeQuiz.words[currentWordIndex];
    const targetUnits =
      activeQuiz.scriptMode === "en"
        ? getEnglishLetters(currentWord.english_meaning)
        : getTamilSyllables(currentWord.tamil_meaning, currentWord.tamil_syllables);

    // If assembled word matches length, check correctness
    if (newAssembled.length === targetUnits.length) {
      const assembledStr = newAssembled.map((t) => t.char).join("").toLowerCase();
      const targetStr = targetUnits.join("").toLowerCase();

      if (assembledStr === targetStr) {
        setWordStatus("success");
        if (!firstAttemptWrong) {
          setTestScore((prev) => prev + 1);
          setTestStreak((prev) => prev + 1);
        }

        // Celebrate with spoken full word
        setTimeout(() => {
          speakText(
            activeQuiz.scriptMode === "en" ? currentWord.english_meaning : currentWord.tamil_meaning,
            activeQuiz.scriptMode
          );
        }, 300);

        // Auto advance after 1.3s if more words remain
        setTimeout(() => {
          advanceToNextWord();
        }, 1300);
      } else {
        setWordStatus("wrong");
        setFirstAttemptWrong(true);
        setTestStreak(0);
        targetUnits.forEach((u) => {
          if (!trickySyllablesIdentified.includes(u)) {
            setTrickySyllablesIdentified((prev) => [...prev, u]);
          }
        });
      }
    } else {
      setWordStatus("playing");
    }
  };

  const handleTileReturn = (tile: { id: string; char: string }) => {
    const newAssembled = assembledTiles.filter((t) => t.id !== tile.id);
    const newAvailable = [...availableTiles, tile];
    setAssembledTiles(newAssembled);
    setAvailableTiles(newAvailable);
    setWordStatus("playing");
  };

  const handleResetWord = () => {
    if (!activeQuiz) return;
    const currentWord = activeQuiz.words[currentWordIndex];
    loadWordForAssembly(currentWord, activeQuiz.scriptMode);
  };

  const advanceToNextWord = () => {
    if (!activeQuiz) return;
    if (currentWordIndex + 1 < activeQuiz.words.length) {
      const nextIdx = currentWordIndex + 1;
      setCurrentWordIndex(nextIdx);
      loadWordForAssembly(activeQuiz.words[nextIdx], activeQuiz.scriptMode);
    } else {
      setTestCompleted(true);
    }
  };

  const exitAssessment = () => {
    setActiveQuiz(null);
    setTestCompleted(false);
  };

  // Log learner result to teacher gradebook
  const logStudentResult = () => {
    if (!activeQuiz || hasLoggedResult) return;
    const totalWords = activeQuiz.words.length;
    const percentage = Math.round((testScore / Math.max(1, totalWords)) * 100);
    const timeSpent = Math.max(1, Math.round((Date.now() - testStartTime) / 1000));

    const badge: "distinction" | "proficient" | "needs_practice" =
      percentage >= 85 ? "distinction" : percentage >= 60 ? "proficient" : "needs_practice";

    const newResult: StudentResult = {
      id: `verified_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studentName: learnerName.trim() || "Student Learner",
      assessmentTitle: activeQuiz.title,
      language:
        activeQuiz.targetLanguage === "badaga"
          ? "Badaga"
          : activeQuiz.targetLanguage === "marwari"
          ? "Marwari"
          : "Mother Tongue",
      score: testScore,
      totalWords,
      percentage,
      accuracyBadge: badge,
      trickySyllables: trickySyllablesIdentified,
      timeSpentSeconds: timeSpent,
      completedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setStudentResults((prev) => [newResult, ...prev]);
    setHasLoggedResult(true);
  };

  // =========================================================================
  // TEACHER METHODS
  // =========================================================================
  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatorTitle.trim()) {
      setCreatorFeedback("Please enter a title for the assessment.");
      return;
    }
    if (creatorSelectedWordIds.length === 0) {
      setCreatorFeedback("Please select at least 2 words to include in the assessment.");
      return;
    }

    const selectedWords = allAvailableWords.filter((w) => creatorSelectedWordIds.includes(w.id));

    const newQuiz: AssessmentQuiz = {
      id: `quiz_teacher_${Date.now()}`,
      title: creatorTitle.trim(),
      description: `Classroom assessment designed for ${creatorClass} (${selectedWords.length} words)`,
      targetLanguage: creatorLang,
      scriptMode: creatorScript,
      enforceSlowMotion: creatorSlow,
      assignedClass: creatorClass,
      createdAt: Date.now(),
      words: selectedWords,
    };

    setTeacherCustomQuizzes((prev) => [newQuiz, ...prev]);
    setCreatorTitle("");
    setCreatorSelectedWordIds([]);
    setCreatorFeedback("✅ Assessment created and published to class roster!");
    setTimeout(() => setCreatorFeedback(null), 3500);
  };

  const handleDeleteTeacherQuiz = (id: string) => {
    if (confirm("Are you sure you want to delete this custom assessment?")) {
      setTeacherCustomQuizzes((prev) => prev.filter((q) => q.id !== id));
      if (activeQuiz?.id === id) {
        setActiveQuiz(null);
      }
    }
  };

  // Classroom metrics calculations
  const classAverage = useMemo(() => {
    if (studentResults.length === 0) return 0;
    const sum = studentResults.reduce((acc, r) => acc + r.percentage, 0);
    return Math.round(sum / studentResults.length);
  }, [studentResults]);

  const mostChallengingSyllables = useMemo(() => {
    const freq: Record<string, number> = {};
    studentResults.forEach((r) => {
      r.trickySyllables.forEach((s) => {
        freq[s] = (freq[s] || 0) + 1;
      });
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([syl, count]) => ({ syl, count }));
  }, [studentResults]);

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="w-full h-full flex flex-col bg-slate-50 min-h-0 overflow-y-auto">
      {/* Top Header & Perspective Switcher Bar */}
      <header className="min-h-16 border-b border-slate-200 bg-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Syllable Assessment Suite</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                Word Builder
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Mother-Tongue Phonemic Assembly &amp; Classroom Teacher Portal
            </p>
          </div>
        </div>

        {/* Perspective Role Switcher & Audio Speed Toggle */}
        <div className="flex items-center space-x-2.5">
          {/* Slow Motion Speed Button */}
          <button
            type="button"
            onClick={() => setIsSlowAudio((prev) => !prev)}
            title={isSlowAudio ? "Slow Motion (0.65x) Active" : "Click to activate Slow Motion (0.65x)"}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95 shadow-2xs ${
              isSlowAudio
                ? "bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-300 shadow-sm"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            <span>{isSlowAudio ? "🐢 0.65x Slow Motion" : "🐰 1.0x Normal Speed"}</span>
          </button>

          {/* Perspective Toggle: Learner vs Teacher */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setPerspective("learner");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                perspective === "learner"
                  ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Puzzle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Learner Mode</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPerspective("teacher");
                if (activeQuiz) exitAssessment();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                perspective === "teacher"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Teacher Perspective</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* =========================================================================
            PERSPECTIVE 1: LEARNER MODE
            ========================================================================= */}
        {perspective === "learner" && (
          <div className="space-y-6">
            {/* If a quiz is active and NOT completed: Show Live Assessment Test Session */}
            {activeQuiz && !testCompleted && (
              <div className="bg-white border-2 border-indigo-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
                {/* Live Test Top Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <Puzzle className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900">{activeQuiz.title}</h3>
                      <p className="text-[10px] text-slate-400">
                        {activeQuiz.assignedClass} &bull;{" "}
                        {activeQuiz.scriptMode === "en" ? "English Letter Spelling" : "Tamil Script Syllables"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Progress Badge */}
                    <span className="text-xs font-bold text-indigo-950 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                      Word {currentWordIndex + 1} of {activeQuiz.words.length}
                    </span>

                    {/* Streak Badge */}
                    {testStreak > 1 && (
                      <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300 flex items-center space-x-1 animate-pulse">
                        <span>🔥</span>
                        <span>{testStreak} Streak</span>
                      </span>
                    )}

                    {/* Exit Assessment */}
                    <button
                      type="button"
                      onClick={exitAssessment}
                      className="text-xs font-medium text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                      title="Exit Assessment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(currentWordIndex / activeQuiz.words.length) * 100}%`,
                    }}
                  />
                </div>

                {/* Question Prompt Card */}
                {(() => {
                  const currentWord = activeQuiz.words[currentWordIndex];
                  const targetUnits =
                    activeQuiz.scriptMode === "en"
                      ? getEnglishLetters(currentWord.english_meaning)
                      : getTamilSyllables(currentWord.tamil_meaning, currentWord.tamil_syllables);

                  const fullWordTarget =
                    activeQuiz.scriptMode === "en"
                      ? currentWord.english_meaning.toUpperCase()
                      : currentWord.tamil_meaning;

                  return (
                    <div className="bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5">
                      {/* Oral Language Prompt with Audio Speaker */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Mother Tongue Oral Prompt ({currentWord.language_name}):
                          </span>
                          <div className="flex items-center space-x-2">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                              {currentWord.source_word || currentWord.tamil_meaning}
                            </h2>
                            <button
                              type="button"
                              onClick={() => {
                                if (currentWord.badaga_audio_assets && currentWord.badaga_audio_assets.length > 0) {
                                  playAudio(currentWord.badaga_audio_assets[0].audio_url);
                                } else if (currentWord.audio_assets && currentWord.audio_assets.length > 0) {
                                  playAudio(currentWord.audio_assets[0].audio_url);
                                } else if (currentWord.audio_url) {
                                  playAudio(currentWord.audio_url);
                                } else if (currentWord.tamil_meaning) {
                                  speakText(currentWord.tamil_meaning, "ta");
                                }
                              }}
                              title="Listen to native oral pronunciation"
                              className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 hover:scale-105 transition-all shadow-xs"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-slate-600">
                            Meaning: <strong className="text-slate-900">{currentWord.english_meaning}</strong> &bull;{" "}
                            Tamil: <strong className="text-slate-900">{currentWord.tamil_meaning}</strong>
                          </p>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                          <span className="text-[10px] text-slate-400">Assemble Word:</span>
                          <span className="text-sm font-black text-indigo-700 tracking-wide font-mono">
                            {fullWordTarget}
                          </span>
                        </div>
                      </div>

                      {/* Dropzone Slots (Assembled Word) */}
                      <div className="bg-white border-2 border-indigo-100 rounded-xl p-3 sm:p-4 shadow-inner space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                          <span>ASSEMBLED SLOTS:</span>
                          <span className="text-[9px] text-slate-400">(Tap any placed tile to return to bank)</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 min-h-[52px]">
                          {targetUnits.map((_, slotIdx) => {
                            const placedTile = assembledTiles[slotIdx];
                            return placedTile ? (
                              <button
                                key={`placed_${placedTile.id}`}
                                type="button"
                                onClick={() => handleTileReturn(placedTile)}
                                title="Tap to return to bank"
                                className={`px-4 py-2 rounded-xl font-black text-lg sm:text-xl shadow-xs transition-all active:scale-90 border ${
                                  wordStatus === "success"
                                    ? "bg-emerald-600 border-emerald-600 text-white animate-bounce shadow-md ring-2 ring-emerald-300"
                                    : wordStatus === "wrong"
                                    ? "bg-rose-50 border-rose-300 text-rose-800"
                                    : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                                }`}
                              >
                                {placedTile.char}
                              </button>
                            ) : (
                              <div
                                key={`empty_${slotIdx}`}
                                className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300 text-sm font-mono select-none"
                              >
                                {slotIdx + 1}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Success Celebration Banner */}
                      {wordStatus === "success" && (
                        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between shadow-xs animate-in zoom-in-95">
                          <div className="flex items-center space-x-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="text-xs font-bold text-emerald-950">🎉 Outstanding! Correct Syllables!</p>
                              <p className="text-[10px] text-emerald-800">Advancing to next word in a moment...</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={advanceToNextWord}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 flex items-center space-x-1"
                          >
                            <span>Next Word</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Incorrect Order Banner */}
                      {wordStatus === "wrong" && (
                        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between text-xs text-rose-900">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="text-[11px] font-medium">
                              Not in correct order yet. Tap any placed tile above to return it, or tap Reset.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleResetWord}
                            className="text-xs font-bold text-rose-700 underline hover:text-rose-900"
                          >
                            Reset
                          </button>
                        </div>
                      )}

                      {/* Available Syllable Bank */}
                      {availableTiles.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            <span>Available Syllable Tiles (Tap to hear &amp; place):</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {availableTiles.map((tile) => (
                              <button
                                key={tile.id}
                                type="button"
                                onClick={() => handleTilePick(tile)}
                                className="px-4 py-2.5 rounded-xl bg-white border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/60 text-slate-900 font-black text-lg sm:text-xl shadow-xs hover:shadow transition-all active:scale-90 flex items-center space-x-1.5 cursor-pointer"
                              >
                                <span>{tile.char}</span>
                                <Volume1 className="w-3.5 h-3.5 text-slate-400" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Test Completed Report Card */}
            {activeQuiz && testCompleted && (
              <div className="bg-white border-2 border-emerald-300 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                  <Trophy className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                    Assessment Completed!
                  </h2>
                  <p className="text-sm text-slate-500">{activeQuiz.title}</p>
                </div>

                {/* Score Stats Card */}
                <div className="max-w-md mx-auto grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
                    <p className="text-xl font-black text-slate-900">
                      {testScore} / {activeQuiz.words.length}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Accuracy</span>
                    <p className="text-xl font-black text-emerald-600">
                      {Math.round((testScore / Math.max(1, activeQuiz.words.length)) * 100)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Mastery</span>
                    <p className="text-xs font-bold text-indigo-700 mt-1">
                      {Math.round((testScore / Math.max(1, activeQuiz.words.length)) * 100) >= 85
                        ? "⭐ Distinction"
                        : "✓ Proficient"}
                    </p>
                  </div>
                </div>

                {/* Save to Teacher Gradebook Section */}
                <div className="max-w-md mx-auto p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl text-left space-y-2">
                  <span className="text-xs font-bold text-indigo-950 flex items-center space-x-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>Save Result to Teacher Gradebook</span>
                  </span>

                  {!hasLoggedResult ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={learnerName}
                        onChange={(e) => setLearnerName(e.target.value)}
                        placeholder="Enter your student name..."
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={logStudentResult}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-2xs"
                      >
                        Log Score
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Successfully recorded to Teacher Gradebook!</span>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => startQuiz(activeQuiz)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center space-x-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Assessment</span>
                  </button>
                  <button
                    type="button"
                    onClick={exitAssessment}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all"
                  >
                    Return to Assessments
                  </button>
                </div>
              </div>
            )}

            {/* Assessment Catalog (When no quiz is running) */}
            {!activeQuiz && (
              <div className="space-y-6">
                {/* Hero Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest flex items-center space-x-1">
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      <span>Phonemic Literacy &bull; Learner Challenge</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                      Test Your Mother Tongue Syllable Mastery
                    </h2>
                    <p className="text-xs text-indigo-200 max-w-xl">
                      Select an assessment below to assemble indigenous words from scrambled syllables, hear native oral pronunciations, and log verified results to the classroom gradebook.
                    </p>
                  </div>

                  {allQuizzes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => startQuiz(allQuizzes[0])}
                      className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 flex items-center space-x-2 shrink-0 self-start md:self-auto"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Primary Assessment</span>
                    </button>
                  )}
                </div>

                {/* Available Quizzes Grid */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Verified Classroom Assessments ({allQuizzes.length})</span>
                  </h3>

                  {allQuizzes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allQuizzes.map((quiz) => (
                        <div
                          key={quiz.id}
                          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-slate-900">{quiz.title}</h4>
                              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                                {quiz.words.length} Words
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{quiz.description}</p>
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                {quiz.assignedClass}
                              </span>
                              <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                {quiz.scriptMode === "en" ? "🔤 English Spelling" : "📖 Tamil Syllables"}
                              </span>
                              {quiz.enforceSlowMotion && (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  🐢 0.65x Slow Motion
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400">
                              Language: <strong className="text-slate-700 uppercase">{quiz.targetLanguage}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => startQuiz(quiz)}
                              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center space-x-1.5"
                            >
                              <span>Start Test</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                      Loading canonical assessments from database...
                    </div>
                  )}
                </div>

                {/* Real Learner Submissions Leaderboard (Only shown if real submissions exist) */}
                {studentResults.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span>Recent Class Submissions &amp; Leaderboard</span>
                    </h3>
                    <div className="divide-y divide-slate-100">
                      {studentResults.slice(0, 5).map((r) => (
                        <div key={r.id} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                              {r.studentName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{r.studentName}</p>
                              <p className="text-[10px] text-slate-400">{r.assessmentTitle}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-emerald-600">{r.percentage}%</span>
                            <p className="text-[9px] text-slate-400">
                              {r.score}/{r.totalWords} Correct &bull; {r.completedAt}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            PERSPECTIVE 2: TEACHER / EDUCATOR PORTAL
            ========================================================================= */}
        {perspective === "teacher" && (
          <div className="space-y-6">
            {/* Educator Banner */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Educator Command Center &bull; Indigenous Language Portal</span>
                </span>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Classroom Analytics, Assessment Builder &amp; Worksheets
                </h2>
                <p className="text-xs text-slate-400 max-w-xl">
                  Manage syllable assessments, track verified student accuracy in real time, and print offline classroom worksheets for community schools.
                </p>
              </div>

              {/* Sub Tabs */}
              <div className="flex items-center space-x-1.5 bg-slate-800 p-1.5 rounded-xl shrink-0 self-start md:self-auto border border-slate-700">
                <button
                  type="button"
                  onClick={() => setTeacherTab("analytics")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    teacherTab === "analytics" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Gradebook
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherTab("creator")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    teacherTab === "creator" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Create Quiz
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherTab("worksheet")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    teacherTab === "worksheet" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-300 hover:text-white"
                  }`}
                >
                  Worksheets
                </button>
              </div>
            </div>

            {/* TAB 1: ANALYTICS & GRADEBOOK */}
            {teacherTab === "analytics" && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Class Average</span>
                    <p className="text-2xl font-black text-indigo-600 mt-0.5">
                      {studentResults.length > 0 ? `${classAverage}%` : "—"}
                    </p>
                    <span className="text-[10px] text-slate-500 font-medium">Syllable Accuracy</span>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tests Taken</span>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">{studentResults.length}</p>
                    <span className="text-[10px] text-slate-500 font-medium">Completed Submissions</span>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Active Quizzes</span>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">{allQuizzes.length}</p>
                    <span className="text-[10px] text-slate-500 font-medium">Verified Assessments</span>
                  </div>

                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tricky Phonemes</span>
                    <div className="flex items-center space-x-1 mt-1">
                      {mostChallengingSyllables.length > 0 ? (
                        mostChallengingSyllables.map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-xs"
                            title={`${s.count} student errors`}
                          >
                            {s.syl}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">None recorded</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Identified from tests</span>
                  </div>
                </div>

                {/* Gradebook Table */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Student Assessment Submissions</h3>
                      <p className="text-xs text-slate-500">Live verified submissions logged by learners</p>
                    </div>

                    {studentResults.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Reset gradebook entries?")) {
                            setStudentResults([]);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 transition-colors"
                      >
                        Clear Entries
                      </button>
                    )}
                  </div>

                  {studentResults.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 uppercase text-[9px] font-bold">
                            <th className="py-2.5 px-3">Student</th>
                            <th className="py-2.5 px-3">Assessment Title</th>
                            <th className="py-2.5 px-3">Score</th>
                            <th className="py-2.5 px-3">Accuracy</th>
                            <th className="py-2.5 px-3">Tricky Syllables</th>
                            <th className="py-2.5 px-3">Duration</th>
                            <th className="py-2.5 px-3">Submitted</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {studentResults.map((res) => (
                            <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3 font-bold text-slate-900 flex items-center space-x-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                                  {res.studentName.charAt(0)}
                                </span>
                                <span>{res.studentName}</span>
                              </td>
                              <td className="py-3 px-3 text-slate-600 max-w-[180px] truncate">
                                {res.assessmentTitle}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-800">
                                {res.score} / {res.totalWords}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    res.accuracyBadge === "distinction"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : res.accuracyBadge === "proficient"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {res.percentage}%
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                {res.trickySyllables.length > 0 ? (
                                  <div className="flex items-center space-x-1">
                                    {res.trickySyllables.map((s, idx) => (
                                      <span
                                        key={idx}
                                        className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold"
                                      >
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">None (Clean)</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-slate-500 font-mono text-[10px]">
                                {res.timeSpentSeconds}s
                              </td>
                              <td className="py-3 px-3 text-slate-400 text-[10px]">{res.completedAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-xs space-y-1">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-600">No student assessment records found</p>
                      <p className="text-[11px] text-slate-400">
                        When students complete assessments in Learner Mode, their verified scores, time spent, and tricky syllables will appear in this gradebook.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ASSESSMENT CREATOR & ASSIGNER */}
            {teacherTab === "creator" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Create &amp; Assign Custom Syllable Assessment
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select words from canonical vocabulary or your custom mother-tongue packages to compile a quiz for your students.
                  </p>
                </div>

                {creatorFeedback && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold">
                    {creatorFeedback}
                  </div>
                )}

                <form onSubmit={handleCreateAssessment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Assessment Title *</label>
                      <input
                        type="text"
                        value={creatorTitle}
                        onChange={(e) => setCreatorTitle(e.target.value)}
                        placeholder="e.g., Badaga Unit 2: Household & Utensils Spelling"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Assign To Classroom Section</label>
                      <input
                        type="text"
                        value={creatorClass}
                        onChange={(e) => setCreatorClass(e.target.value)}
                        placeholder="e.g. Nilgiris Primary - Grade 4"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Language Deck</label>
                      <select
                        value={creatorLang}
                        onChange={(e) => setCreatorLang(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="badaga">Badaga (Oral Heritage)</option>
                        <option value="marwari">Marwari (Vocal)</option>
                        <option value="all">Multilingual (All)</option>
                        {customPackages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            Custom: {pkg.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Assessment Script Mode</label>
                      <select
                        value={creatorScript}
                        onChange={(e) => setCreatorScript(e.target.value as "ta" | "en")}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ta">Tamil Script Syllables (ம + ர + ம்)</option>
                        <option value="en">English Letter Phonics (N + O + S + E)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Speech Articulation</label>
                      <div className="pt-2 flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="slow_check"
                          checked={creatorSlow}
                          onChange={(e) => setCreatorSlow(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <label htmlFor="slow_check" className="text-xs text-slate-700 font-medium cursor-pointer">
                          Enforce Slow Motion (0.65x) for beginners
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Word Selector Bank */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        Select Words to Include ({creatorSelectedWordIds.length} Selected)
                      </label>

                      <div className="relative w-48 sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={creatorSearchWord}
                          onChange={(e) => setCreatorSearchWord(e.target.value)}
                          placeholder="Search words..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {allAvailableWords
                        .filter((w) => {
                          if (creatorLang !== "all" && w.language_code !== creatorLang) return false;
                          if (!creatorSearchWord.trim()) return true;
                          const q = creatorSearchWord.toLowerCase();
                          return (
                            (w.source_word && w.source_word.toLowerCase().includes(q)) ||
                            w.tamil_meaning.toLowerCase().includes(q) ||
                            w.english_meaning.toLowerCase().includes(q)
                          );
                        })
                        .slice(0, 80)
                        .map((w) => {
                          const isSelected = creatorSelectedWordIds.includes(w.id);
                          return (
                            <div
                              key={w.id}
                              onClick={() => {
                                setCreatorSelectedWordIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== w.id) : [...prev, w.id]
                                );
                              }}
                              className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all select-none ${
                                isSelected
                                  ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-bold shadow-2xs"
                                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                              }`}
                            >
                              <div className="truncate pr-1">
                                <span className="font-bold text-slate-900">{w.source_word || w.tamil_meaning}</span>
                                <span className="text-[10px] text-slate-500 ml-1">({w.english_meaning})</span>
                              </div>
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Publish Assessment to Learners</span>
                    </button>
                  </div>
                </form>

                {/* List of Teacher Custom Quizzes */}
                {teacherCustomQuizzes.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Your Published Custom Assessments ({teacherCustomQuizzes.length})
                    </h4>
                    <div className="space-y-2">
                      {teacherCustomQuizzes.map((q) => (
                        <div
                          key={q.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{q.title}</p>
                            <p className="text-[10px] text-slate-500">
                              {q.words.length} words &bull; {q.assignedClass}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacherQuiz(q.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white transition-colors"
                            title="Delete custom assessment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PRINTABLE CLASSROOM WORKSHEET */}
            {teacherTab === "worksheet" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Classroom Syllable Worksheet Generator
                    </h3>
                    <p className="text-xs text-slate-500">
                      Printable matching and assembly exercise for physical indigenous village classrooms
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Assessment Selector for Worksheet */}
                    {allQuizzes.length > 0 && (
                      <select
                        value={activeWorksheetQuiz?.id || ""}
                        onChange={(e) => setWorksheetQuizId(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
                      >
                        {allQuizzes.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.print();
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Worksheet (PDF)</span>
                    </button>
                  </div>
                </div>

                {/* Printable Formatted Worksheet Sheet */}
                {activeWorksheetQuiz && (
                  <div className="p-6 sm:p-8 border-2 border-dashed border-slate-300 rounded-2xl bg-white space-y-6 print:border-none print:p-0">
                    {/* Worksheet Header */}
                    <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                        {activeWorksheetQuiz.title}
                      </h2>
                      <p className="text-xs text-slate-600 font-medium">
                        {activeWorksheetQuiz.assignedClass} &bull; Phonemic Syllable Construction Exercise
                      </p>
                      <div className="grid grid-cols-3 gap-4 pt-4 text-xs font-semibold text-slate-700">
                        <div className="text-left">Student Name: _______________________</div>
                        <div className="text-center">Date: _______________</div>
                        <div className="text-right">Score: ____ / {activeWorksheetQuiz.words.length}</div>
                      </div>
                    </div>

                    {/* Section A: Syllable Unscramble */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-100 p-2 rounded">
                        Part A: Unscramble the syllables to form the correct word
                      </h4>

                      <div className="space-y-3">
                        {activeWorksheetQuiz.words.slice(0, 8).map((w, idx) => {
                          const syllables = getTamilSyllables(w.tamil_meaning, w.tamil_syllables);
                          const scrambled = [...syllables].reverse().join("  +  ");
                          return (
                            <div
                              key={w.id}
                              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 text-xs"
                            >
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900">
                                  {idx + 1}. Oral Clue: &ldquo;{w.source_word || w.tamil_meaning}&rdquo; ({w.english_meaning})
                                </span>
                                <p className="text-slate-500 font-mono text-[11px]">
                                  Scrambled Syllables: [ <span className="font-bold text-slate-800">{scrambled}</span> ]
                                </p>
                              </div>

                              <div className="font-mono text-slate-400">
                                Answer: [ ________________ ]
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section B: Syllable Breakdown Formula */}
                    <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-100 p-2 rounded">
                        Part B: Break down each word into its constituent syllables
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {activeWorksheetQuiz.words.slice(0, 6).map((w, idx) => {
                          const syllables = getTamilSyllables(w.tamil_meaning, w.tamil_syllables);
                          return (
                            <div key={w.id} className="p-3 border border-slate-200 rounded-lg">
                              <strong>
                                {idx + 1}. {w.tamil_meaning} ({w.english_meaning}):
                              </strong>{" "}
                              {syllables.map((_, sIdx) => (sIdx === 0 ? "________" : " + ________"))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
