// src/components/QuestionPlayer.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume,
  Volume2,
  VolumeX,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Plus,
  Minus,
  X as MultiplyIcon,
  Divide,
  AlertCircle,
  Loader2,
  Timer,
  SkipForward,
  SkipBack,
  ArrowLeft,
  Home,
  List,
  Eye,
  EyeOff,
  Layers,
  GripVertical,
  CheckCircle,
  Menu,
  X,
  Maximize2,
  Minimize2,
  Settings,
  Zap,
} from "lucide-react";
import { levelApi } from "../../services/api";

export const QuestionPlayer = () => {
  const { levelSlug, weekNumber } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const questionSetIds = queryParams.get("sets")
    ? queryParams.get("sets").split(",")
    : [];
  const isMultiSet = questionSetIds.length > 1;

  const [questions, setQuestions] = useState([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [questionSets, setQuestionSets] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [showSetArrangement, setShowSetArrangement] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [visibleOperators, setVisibleOperators] = useState([]);
  const [visibleDigits, setVisibleDigits] = useState([]);
  const [isSetTransition, setIsSetTransition] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [completedSets, setCompletedSets] = useState(new Set());
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [draggedSet, setDraggedSet] = useState(null);
  const [dragOverSet, setDragOverSet] = useState(null);

  const speechRef = useRef(null);
  const questionTimerRef = useRef(null);
  const stepTimerRef = useRef(null);
  const setTransitionTimerRef = useRef(null);
  const currentSequenceRef = useRef([]);
  const mainContainerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Indian female voice with English pronunciation
  const speakWithIndianEnglishVoice = (text, rate = playbackSpeed) => {
    if (!("speechSynthesis" in window) || isMuted) return;

    speechSynthesis.cancel();

    // Pre-process text to ensure English pronunciation
    const processedText = preprocessForEnglish(text);

    const speech = new SpeechSynthesisUtterance(processedText);
    speech.rate = rate;
    speech.pitch = 1;
    speech.volume = 1;
    speech.lang = "en-US"; // Force US English

    // Get available voices
    const voices = speechSynthesis.getVoices();

    // Filter for English female voices only
    const englishFemaleVoices = voices.filter((voice) => {
      const voiceName = voice.name.toLowerCase();
      const isEnglish = voice.lang.startsWith("en");
      const isFemale =
        voiceName.includes("female") ||
        voiceName.includes("samantha") ||
        voiceName.includes("zira") ||
        voiceName.includes("hazel") ||
        voiceName.includes("karen") ||
        voiceName.includes("tessa");

      // Exclude male voices explicitly
      const isMale =
        voiceName.includes("male") && !voiceName.includes("female");

      return isEnglish && isFemale && !isMale;
    });

    // If no English female voices found, try to find any English voice that sounds female
    let selectedVoice = null;

    if (englishFemaleVoices.length > 0) {
      // Prioritize US English Female
      selectedVoice =
        englishFemaleVoices.find(
          (v) => v.name.includes("US English") && v.name.includes("Female"),
        ) || englishFemaleVoices[0];
    } else {
      // Fallback: find any English voice that might sound female
      const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
      selectedVoice =
        englishVoices.find((v) => !v.name.toLowerCase().includes("male")) ||
        (englishVoices.length > 0 ? englishVoices[0] : null);
    }

    if (selectedVoice) {
      speech.voice = selectedVoice;
      speech.lang = "en-US";
      speech.text = processedText;
    }

    speechSynthesis.speak(speech);
    return speech;
  };

  // Add this helper function to preprocess text
  const preprocessForEnglish = (text) => {
    const str = text.toString().trim();

    // Check if it's a number
    if (/^\d+$/.test(str)) {
      const num = parseInt(str);
      if (isNaN(num)) return str;

      // Use proper English number words
      return speakNumber(num);
    }

    return str;
  };

  // Function to speak numbers in proper English
  const speakNumber = (number) => {
    const num = parseInt(number);
    if (isNaN(num)) return number.toString();

    // For numbers 0-19, speak normally
    if (num >= 0 && num <= 19) {
      const words = [
        "zero",
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "ten",
        "eleven",
        "twelve",
        "thirteen",
        "fourteen",
        "fifteen",
        "sixteen",
        "seventeen",
        "eighteen",
        "nineteen",
      ];
      return words[num];
    }

    // For numbers 20-99
    if (num >= 20 && num <= 99) {
      const tens = [
        "",
        "",
        "twenty",
        "thirty",
        "forty",
        "fifty",
        "sixty",
        "seventy",
        "eighty",
        "ninety",
      ];
      const ones = num % 10;
      const tensDigit = Math.floor(num / 10);

      if (ones === 0) {
        return tens[tensDigit];
      } else {
        return `${tens[tensDigit]} ${speakNumber(ones)}`;
      }
    }

    // For numbers 100-999
    if (num >= 100 && num <= 999) {
      const hundreds = Math.floor(num / 100);
      const remainder = num % 100;

      if (remainder === 0) {
        return `${speakNumber(hundreds)} hundred`;
      } else {
        return `${speakNumber(hundreds)} hundred and ${speakNumber(remainder)}`;
      }
    }

    // For numbers 1000-9999
    if (num >= 1000 && num <= 9999) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;

      if (remainder === 0) {
        return `${speakNumber(thousands)} thousand`;
      } else if (remainder < 100) {
        return `${speakNumber(thousands)} thousand and ${speakNumber(remainder)}`;
      } else {
        return `${speakNumber(thousands)} thousand ${speakNumber(remainder)}`;
      }
    }

    // For larger numbers, fall back to digit-by-digit
    return number.toString().split("").join(" ");
  };

  const speakItem = (item) => {
    if ("speechSynthesis" in window && !isMuted) {
      speechSynthesis.cancel();

      let text = "";
      if (item.type === "digit") {
        // Use proper English number pronunciation
        text = speakNumber(item.value);
      } else if (item.type === "operator") {
        text = getOperatorWord(item.value);
      }

      // Add a small delay and explicitly set language
      setTimeout(() => {
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = "en-US";
        speech.rate = playbackSpeed;
        speech.volume = 1;

        // Get voices and select English-speaking female voice only
        const voices = speechSynthesis.getVoices();

        // Filter for English female voices
        const englishFemaleVoices = voices.filter((voice) => {
          const voiceName = voice.name.toLowerCase();
          const isEnglish = voice.lang.startsWith("en");
          const isFemale =
            voiceName.includes("female") ||
            voiceName.includes("samantha") ||
            voiceName.includes("zira") ||
            voiceName.includes("hazel") ||
            voiceName.includes("karen") ||
            voiceName.includes("tessa") ||
            voiceName.includes("veena") ||
            voiceName.includes("rishi");

          return isEnglish && isFemale;
        });

        if (englishFemaleVoices.length > 0) {
          // Prioritize US English female voices
          const usFemaleVoice = englishFemaleVoices.find(
            (v) => v.name.includes("US English") && v.name.includes("Female"),
          );

          speech.voice = usFemaleVoice || englishFemaleVoices[0];
        }

        speechSynthesis.speak(speech);
      }, 10);
    }
  };

  const getEnglishSpeakingVoice = () => {
    const voices = speechSynthesis.getVoices();

    // List of known English-speaking female voices
    const englishFemaleVoices = [
      "Google UK English Female",
      "Google US English Female",
      "Microsoft Zira Desktop", // English (United States) female
      "Microsoft Hazel Desktop", // English (Great Britain) female
      "Samantha", // macOS US English female
      "Karen", // macOS Australian English female
      "Tessa", // macOS South African English female
      "Veena", // Indian English female (if available)
    ];

    // First, try to find a known English female voice
    for (const voiceName of englishFemaleVoices) {
      const voice = voices.find((v) => v.name.includes(voiceName));
      if (voice && voice.lang.startsWith("en")) {
        return voice;
      }
    }

    // Then try any English female voice
    const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
    const femaleVoice = englishVoices.find(
      (v) =>
        v.name.toLowerCase().includes("female") ||
        (!v.name.toLowerCase().includes("male") &&
          !v.name.toLowerCase().includes("david") &&
          !v.name.toLowerCase().includes("mark") &&
          !v.name.toLowerCase().includes("paul")),
    );

    if (femaleVoice) return femaleVoice;

    // Ultimate fallback
    if (englishVoices.length > 0) return englishVoices[0];
    if (voices.length > 0) return voices[0];

    return null;
  };

  // Update the voice initialization to be more aggressive
  // Update the voice initialization in useEffect
  useEffect(() => {
    const initializeVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log(
          "All voices:",
          voices.map((v) => `${v.name} (${v.lang})`),
        );

        // Find and log English-speaking female voices only
        const englishFemaleVoices = voices.filter((voice) => {
          const voiceName = voice.name.toLowerCase();
          const isEnglish = voice.lang.startsWith("en");
          const isFemale =
            voiceName.includes("female") ||
            voiceName.includes("samantha") ||
            voiceName.includes("zira") ||
            voiceName.includes("hazel") ||
            voiceName.includes("karen") ||
            voiceName.includes("tessa");
          const isMale =
            voiceName.includes("male") && !voiceName.includes("female");

          return isEnglish && isFemale && !isMale;
        });

        console.log(
          "English female voices:",
          englishFemaleVoices.map((v) => `${v.name} (${v.lang})`),
        );

        // Test if we can get an English female voice
        const testVoice = getEnglishSpeakingVoice();
        if (testVoice) {
          console.log(
            "Selected voice:",
            testVoice.name,
            testVoice.lang,
            "Gender:",
            testVoice.name.toLowerCase().includes("female")
              ? "Female"
              : "Unknown",
          );
        }
      }
    };

    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = initializeVoices;
    }

    // Try multiple times to load voices
    const interval = setInterval(initializeVoices, 500);
    setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      if (speechSynthesis.onvoiceschanged) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Add a voice selector option in the UI
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const speakAnnouncement = (text) => {
    if ("speechSynthesis" in window && !isMuted) {
      speakWithIndianEnglishVoice(text);
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Initialize voices
    const initializeVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Log available English female voices for debugging
        const englishFemaleVoices = voices.filter((voice) => {
          const voiceName = voice.name.toLowerCase();
          return (
            voice.lang.startsWith("en") &&
            (voiceName.includes("female") ||
              voiceName.includes("samantha") ||
              voiceName.includes("zira") ||
              voiceName.includes("hazel"))
          );
        });

        if (englishFemaleVoices.length > 0) {
          console.log(
            "Available English female voices:",
            englishFemaleVoices.map((v) => `${v.name} (${v.lang})`),
          );
        }
      }
    };

    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = initializeVoices;
    }

    setTimeout(initializeVoices, 100);

    if (levelSlug && weekNumber) {
      if (isMultiSet && questionSetIds.length > 0) {
        fetchMultipleQuestionSets();
      } else {
        const singleSetId = location.pathname.split("/").pop();
        if (singleSetId && singleSetId !== "multiple") {
          fetchQuestions(singleSetId);
        }
      }
    } else {
      setError("Invalid parameters");
      setIsLoading(false);
    }

    return () => {
      cleanupTimers();
      window.removeEventListener("resize", checkMobile);
      if (speechSynthesis.onvoiceschanged) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [levelSlug, weekNumber, location]);

  // Auto-hide controls on mobile
  useEffect(() => {
    if (isMobile && isPlaying) {
      const handleTouchStart = () => {
        setShowControls(true);
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      };

      document.addEventListener("touchstart", handleTouchStart);

      return () => {
        document.removeEventListener("touchstart", handleTouchStart);
        clearTimeout(controlsTimeoutRef.current);
      };
    }
  }, [isMobile, isPlaying]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const cleanupTimers = () => {
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    if (setTransitionTimerRef.current)
      clearTimeout(setTransitionTimerRef.current);
    if (speechRef.current) {
      speechSynthesis.cancel();
    }
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
  };

  const fetchMultipleQuestionSets = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const allQuestions = [];
      const allQuestionSets = [];

      for (const setId of questionSetIds) {
        const response = await levelApi.getQuestions(
          levelSlug,
          weekNumber,
          setId,
        );

        const data = response.data.data;
        allQuestionSets.push({
          id: data.question_set.id,
          name: data.question_set.name,
          totalQuestions: data.questions.length,
          type: data.question_set.question_type.name,
          originalOrder: allQuestionSets.length,
        });

        const questionsWithSet = data.questions.map((q, index) => ({
          ...q,
          setId: data.question_set.id,
          setIndex: allQuestionSets.length - 1,
          globalIndex: allQuestions.length + index,
          questionInSetIndex: index,
        }));

        allQuestions.push(...questionsWithSet);
      }

      setQuestionSets(allQuestionSets);
      setQuestions(allQuestions);

      if (allQuestions.length > 0) {
        setTimeout(() => {
          setIsPlaying(true);
          setIsAutoPlaying(true);
        }, 500);
      }
    } catch (error) {
      console.error("Error fetching multiple question sets:", error);
      setError("Failed to load question sets. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuestions = async (setId) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await levelApi.getQuestions(
        levelSlug,
        weekNumber,
        setId,
      );

      const data = response.data.data;
      setQuestionSets([
        {
          id: data.question_set.id,
          name: data.question_set.name,
          totalQuestions: data.questions.length,
          type: data.question_set.question_type.name,
          originalOrder: 0,
        },
      ]);

      const questionsWithSet = data.questions.map((q, index) => ({
        ...q,
        setId: data.question_set.id,
        setIndex: 0,
        globalIndex: index,
        questionInSetIndex: index,
      }));

      setQuestions(questionsWithSet);

      if (data.questions.length > 0) {
        setTimeout(() => {
          setIsPlaying(true);
          setIsAutoPlaying(true);
        }, 500);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      setError("Failed to load questions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionSet = questionSets[currentSetIndex];

  useEffect(() => {
    if (currentQuestion) {
      const sequence = currentQuestion.display_sequence || [];
      currentSequenceRef.current = sequence;
      setCurrentStep(0);
      setVisibleOperators([]);
      setVisibleDigits([]);
      setTimeRemaining(currentQuestion.time_limit || 10);

      if (isMultiSet) {
        const newSetIndex = currentQuestion.setIndex || 0;
        if (newSetIndex !== currentSetIndex) {
          setCurrentSetIndex(newSetIndex);
          setIsSetTransition(true);

          if (!isMuted) {
            speakAnnouncement(`Starting question set ${newSetIndex + 1}`);
          }

          setTimeout(() => {
            setIsSetTransition(false);
          }, 500);
        }
      }
    }
  }, [currentQuestion]);

  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex === questions.length - 1) {
      const lastQuestion = questions[questions.length - 1];
      if (
        lastQuestion &&
        currentStep === (lastQuestion.display_sequence?.length || 1) - 1
      ) {
        const timer = setTimeout(() => {
          setSessionCompleted(true);
          if (!isMuted) {
            speakAnnouncement("All questions completed. Well done!");
          }
          setTimeout(() => {
            navigateToAnswersPage();
          }, 3000);
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [currentQuestionIndex, currentStep, questions]);

  const navigateToAnswersPage = () => {
    const state = {
      questions,
      questionSets,
      levelSlug,
      weekNumber,
    };
    navigate(`/answers`, { state });
  };

  useEffect(() => {
    if (isPlaying && currentSequenceRef.current.length > 0) {
      startDisplaySequence();
    } else {
      cleanupTimers();
    }

    return () => cleanupTimers();
  }, [isPlaying, currentQuestionIndex]);

  const startDisplaySequence = () => {
    const sequence = currentSequenceRef.current;
    if (!sequence || sequence.length === 0) return;

    setCurrentStep(0);
    setVisibleOperators([]);
    setVisibleDigits([]);
    setTimeRemaining(currentQuestion.time_limit || 10);
    cleanupTimers();

    setTimeout(() => {
      // Calculate time per step based on playback speed
      const baseTimePerStep =
        ((currentQuestion.time_limit || 10) * 1000) / sequence.length;
      const adjustedTimePerStep = baseTimePerStep / playbackSpeed;

      let step = 0;

      // Adjust the timer interval based on playback speed
      questionTimerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1 / playbackSpeed) {
            clearInterval(questionTimerRef.current);
            return 0;
          }
          return prev - 1 / playbackSpeed;
        });
      }, 1000 / playbackSpeed);

      const processNextStep = () => {
        if (step < sequence.length) {
          setCurrentStep(step);
          const currentItem = sequence[step];

          if (currentItem.type === "digit") {
            setVisibleDigits((prev) => [...prev, currentItem]);
          } else if (currentItem.type === "operator") {
            setVisibleOperators((prev) => [...prev, currentItem]);
          }

          if (!isMuted) speakItem(currentItem);
          step++;

          if (step < sequence.length) {
            stepTimerRef.current = setTimeout(
              processNextStep,
              adjustedTimePerStep,
            );
          } else {
            clearInterval(questionTimerRef.current);
            if (
              currentQuestion.questionInSetIndex ===
              getQuestionsBySetIndex(currentQuestion.setIndex).length - 1
            ) {
              setCompletedSets(
                (prev) => new Set([...prev, currentQuestion.setIndex]),
              );
            }
            setTimeout(handleNextQuestion, 500 / playbackSpeed);
          }
        }
      };

      stepTimerRef.current = setTimeout(processNextStep, adjustedTimePerStep);
    }, 500 / playbackSpeed);
  };

  const getQuestionsBySetIndex = (setIndex) => {
    return questions.filter((q) => q.setIndex === setIndex);
  };

  const getOperatorWord = (operator) => {
    switch (operator) {
      case "+":
        return "add";
      case "-":
        return "less";
      case "*":
        return "into";
      case "/":
        return "divide by";
      default:
        return operator;
    }
  };

  const getOperatorIcon = (operator) => {
    switch (operator) {
      case "+":
        return <Plus className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />;
      case "-":
        return <Minus className="w-6 h-6 lg:w-8 lg:h-8 text-red-600" />;
      case "*":
        return (
          <MultiplyIcon className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
        );
      case "/":
        return <Divide className="w-6 h-6 lg:w-8 lg:h-8 text-orange-600" />;
      default:
        return operator;
    }
  };

  const getOperatorSymbol = (operator) => {
    switch (operator) {
      case "+":
        return "+";
      case "-":
        return "-";
      case "*":
        return "×";
      case "/":
        return "÷";
      default:
        return operator;
    }
  };

  const handlePlay = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      setIsAutoPlaying(true);
    } else {
      setIsPlaying(false);
      setIsAutoPlaying(false);
      cleanupTimers();
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextQuestionIndex = currentQuestionIndex + 1;

      if (!isMuted && isAutoPlaying) {
        const currentSet = currentQuestion.setIndex || 0;
        const nextSet = questions[nextQuestionIndex].setIndex || 0;

        if (isMultiSet && nextSet !== currentSet) {
          const nextSetName = questionSets[nextSet]?.name || "new set";
          speakAnnouncement(`Moving to ${nextSetName}`);
        } else {
          speakAnnouncement(`Next.`);
        }
      }

      setTimeout(() => {
        setCurrentQuestionIndex(nextQuestionIndex);
        setIsPlaying(true);
        setIsAutoPlaying(true);
        cleanupTimers();
      }, 200);
    } else {
      setIsPlaying(false);
      setIsAutoPlaying(false);
      cleanupTimers();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      cleanupTimers();
      setIsPlaying(false);
      setIsAutoPlaying(false);
    }
  };

  const handleRestartSession = () => {
    setCurrentQuestionIndex(0);
    setCurrentSetIndex(0);
    setCurrentStep(0);
    setVisibleOperators([]);
    setVisibleDigits([]);
    setIsPlaying(false);
    setIsAutoPlaying(false);
    setIsSetTransition(false);
    setCompletedSets(new Set());
    setSessionCompleted(false);
    cleanupTimers();
  };

  const handleGoHome = () => navigate("/");

  const formatTime = (seconds) => {
    const secs = Math.max(0, Math.floor(seconds));
    return `00:${secs.toString().padStart(2, "0")}`;
  };

  // Mobile Responsive Layout Components
  const renderMobileHeader = () => (
    <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-gray-800 truncate">
              {currentQuestionSet?.name || "Practice Session"}
            </h1>
            <p className="text-xs text-gray-500 truncate">
              Q{currentQuestionIndex + 1}/{questions.length} • Set{" "}
              {currentSetIndex + 1}/{questionSets.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!isMuted) {
                speakWithIndianEnglishVoice("Voice enabled");
              }
              setIsMuted(!isMuted);
            }}
            className="p-2 rounded-lg hover:bg-gray-100 relative group"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-red-500" />
            ) : (
              <div className="relative">
                <Volume2 className="w-5 h-5 text-green-500" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
              </div>
            )}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {isMuted ? "Enable Indian English voice" : "Indian English voice"}
            </div>
          </button>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderMobileMenu = () => (
    <AnimatePresence>
      {showMobileMenu && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="lg:hidden fixed top-16 right-4 bg-white rounded-lg shadow-xl border border-gray-200 z-50 w-64"
        >
          <div className="p-3 space-y-2">
            <button
              onClick={() => {
                setShowMobileMenu(false);
                navigateToAnswersPage();
              }}
              className="flex items-center gap-3 w-full p-3 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <List className="w-5 h-5" />
              View All Answers
            </button>
            <button
              onClick={() => {
                setShowMobileMenu(false);
                handleRestartSession();
              }}
              className="flex items-center gap-3 w-full p-3 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <RotateCcw className="w-5 h-5" />
              Restart Session
            </button>
            {isMultiSet && (
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowSetArrangement(true);
                }}
                className="flex items-center gap-3 w-full p-3 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Layers className="w-5 h-5" />
                Arrange Sets
              </button>
            )}
            <div className="border-t border-gray-200 pt-2">
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  handleGoHome();
                }}
                className="flex items-center gap-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Home className="w-5 h-5" />
                Exit Player
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderQuestionDisplay = () => {
    if (!currentQuestion) return null;

    const currentSequence = currentQuestion.display_sequence || [];
    const currentItem = currentSequence[currentStep];

    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Mobile Header */}
        {renderMobileHeader()}
        {renderMobileMenu()}

        {/* Selected Sets Bar - Desktop only */}
        {!isMobile && isMultiSet && (
          <div className="bg-linear-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">Playing Sets:</span>
                <div className="flex gap-2">
                  {questionSets.map((set, index) => (
                    <button
                      key={set.id}
                      onClick={() => {
                        const firstQuestionIndex = questions.findIndex(
                          (q) => q.setIndex === index,
                        );
                        if (firstQuestionIndex !== -1) {
                          setCurrentQuestionIndex(firstQuestionIndex);
                          setCurrentSetIndex(index);
                          setIsPlaying(false);
                          cleanupTimers();
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all duration-200 ${
                        currentSetIndex === index
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : completedSets.has(index)
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-white border-gray-300 text-gray-700 hover:border-blue-300"
                      }`}
                    >
                      <span className="font-medium">Set {index + 1}:</span>
                      <span>{set.name}</span>
                      {currentSetIndex === index && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                      {completedSets.has(index) && (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowSetArrangement(true)}
                className="flex items-center gap-2 px-4 py-1 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                <GripVertical className="w-4 h-4" />
                Arrange Sets
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={`flex-1 overflow-auto ${isMobile ? "pt-16" : ""}`}>
          <div className="h-full">
            <div className="h-full bg-white rounded-xl lg:rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              {/* Question Header */}
              <div className="p-4 lg:p-3 border-b border-gray-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {!isMobile && isMultiSet && (
                        <div className="inline-flex items-center gap-2 bg-blue-100 px-3 py-1.5 rounded-full border border-blue-200">
                          <span className="text-blue-700 font-medium text-sm">
                            Set {currentSetIndex + 1}/{questionSets.length}:{" "}
                            {currentQuestionSet?.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">
                        Question {currentQuestionIndex + 1}/{questions.length}
                      </span>
                      <span className="hidden lg:inline">•</span>
                      <span>
                        {currentQuestionSet?.type || "Mixed Operations"}
                      </span>
                      {!isMobile && isMultiSet && (
                        <>
                          <span>•</span>
                          <span>
                            Set {currentSetIndex + 1} of {questionSets.length}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Display Area */}
              <div className="flex-1 p-4 lg:p-8">
                <div className="h-full flex flex-col lg:flex-row">
                  {/* Current Item Display */}
                  <div
                    className={`${isMobile ? "mb-6" : "flex-1 flex flex-col items-center justify-center border-r border-gray-300 pr-0 lg:pr-8"}`}
                  >
                    {currentItem ? (
                      <motion.div
                        key={`${currentItem.type}-${currentItem.position}-${currentStep}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                      >
                        {currentItem.type === "digit" && (
                          <>
                            <div
                              className={`${isMobile ? "text-6xl" : "text-8xl lg:text-9xl"} font-bold text-gray-900 mb-4 lg:mb-6`}
                            >
                              <p>{currentItem.display || currentItem.value}</p>
                            </div>
                            <div className="text-lg lg:text-xl text-gray-600">
                              <p>Number {visibleDigits.length + 1}</p>
                            </div>
                          </>
                        )}
                        {currentItem.type === "operator" && (
                          <>
                            <div
                              className={`${isMobile ? "text-6xl" : "text-8xl lg:text-9xl"} text-blue-600 mb-4 lg:mb-6`}
                            >
                              <p>{getOperatorIcon(currentItem.value)}</p>
                            </div>
                            <div className="text-lg lg:text-xl text-gray-600">
                              <p>{getOperatorWord(currentItem.value)}</p>
                            </div>
                          </>
                        )}
                        {currentItem.type === "equals" && (
                          <>
                            <div
                              className={`${isMobile ? "text-6xl" : "text-8xl lg:text-9xl"} font-bold text-green-600 mb-4 lg:mb-6`}
                            >
                              =
                            </div>
                            <div className="text-xl lg:text-2xl font-bold text-gray-800">
                              Time to Calculate!
                            </div>
                          </>
                        )}
                      </motion.div>
                    ) : (
                      <div className="text-center text-gray-400">
                        <div className="text-6xl mb-4">👋</div>
                        <div className="text-xl">Ready to Start</div>
                      </div>
                    )}
                  </div>

                  {/* Traditional Arithmetic Layout */}
                  <div className={`${isMobile ? "" : "flex-1 pl-0 lg:pl-8"}`}>
                    <div className="h-full">
                      <div className={`${isMobile ? "mb-2" : "mb-2"}`}>
                        <p className="text-gray-600 text-sm lg:text-base">
                          Step {currentStep + 1} of {currentSequence.length}
                        </p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4 lg:p-8 border-2 border-gray-300">
                        <div className="space-y-4 lg:space-y-8">
                          {/* First number */}
                          {visibleDigits.length > 0 && (
                            <div className="flex justify-end mb-1">
                              <div className="text-right">
                                <div
                                  className={`${isMobile ? "text-3xl" : "text-4xl lg:text-5xl"} font-bold text-gray-800 font-mono tracking-wider`}
                                >
                                  <p>
                                    {visibleDigits[0].display ||
                                      visibleDigits[0].value}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Remaining digits with operators */}
                          {visibleDigits.slice(1).map((digit, index) => (
                            <div
                              key={`digit-${index}`}
                              className="flex items-center mb-1"
                            >
                              <div className="mr-4 lg:mr-6">
                                {visibleOperators[index] && (
                                  <div
                                    className={`${isMobile ? "text-3xl" : "text-4xl lg:text-5xl"} font-bold text-gray-800`}
                                  >
                                    <p>
                                      {getOperatorSymbol(
                                        visibleOperators[index].value,
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 text-right">
                                <div
                                  className={`${isMobile ? "text-3xl" : "text-4xl lg:text-5xl"} font-bold text-gray-800 font-mono tracking-wider pt-2`}
                                >
                                  <p>{digit.display || digit.value}</p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Horizontal line */}
                          {visibleDigits.length >= 2 && (
                            <div className="border-t-2 lg:border-t-4 border-gray-800 my-4"></div>
                          )}
                        </div>

                        {visibleDigits.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-48 lg:h-64 text-gray-400">
                            <div className="text-4xl lg:text-5xl mb-4">🧮</div>
                            <div className="text-lg lg:text-xl text-center">
                              <p>Numbers will appear here</p>
                            </div>
                            <div className="text-sm lg:text-base text-gray-500 mt-2 text-center">
                              <p>
                                This question has{" "}
                                {
                                  currentSequence.filter(
                                    (item) => item.type === "digit",
                                  ).length
                                }{" "}
                                digits
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Responsive Control Panel
  const renderControlPanel = () => {
    const totalSteps = currentQuestion?.display_sequence?.length || 0;
    const stepProgress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

    // Mobile controls (floating)
    if (isMobile) {
      return (
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-4 left-4 right-4 bg-white rounded-xl shadow-2xl border border-gray-300 z-50 p-4"
            >
              {/* Main Controls */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full disabled:opacity-40"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={handlePlay}
                  className={`flex items-center justify-center w-16 h-16 rounded-full shadow-lg ${
                    isPlaying && isAutoPlaying
                      ? "bg-red-500 text-white"
                      : "bg-green-500 text-white"
                  }`}
                >
                  {isPlaying && isAutoPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>

                <button
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full disabled:opacity-40"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Info */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-xs text-gray-600">Step</div>
                  <div className="font-bold text-sm">
                    {currentStep + 1}/{totalSteps}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Question</div>
                  <div className="font-bold text-sm">
                    {currentQuestionIndex + 1}/{questions.length}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Time</div>
                  <div className="font-mono font-bold text-sm text-green-700">
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              </div>

              {/* Speed Control */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume className="w-4 h-4 text-gray-600" />
                  <select
                    value={playbackSpeed}
                    onChange={(e) =>
                      setPlaybackSpeed(parseFloat(e.target.value))
                    }
                    className="bg-gray-100 border-0 rounded-lg px-2 py-1 text-sm"
                  >
                    <option value="0.75">0.75x</option>
                    <option value="1">1x</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                  </select>
                </div>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      );
    }

    // Desktop controls
    return (
      <div className="h-full bg-white border-t border-gray-200">
        <div className="h-full flex flex-col">
          {/* Top Controls */}
          <div className="flex-1 flex items-center justify-center gap-8 px-8">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-3 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
            >
              <SkipBack className="w-5 h-5" />
              <span className="font-medium">Previous Question</span>
            </button>

            <button
              onClick={handlePlay}
              className={`flex items-center gap-3 px-4 py-2 rounded-xl font-bold text-white transition-all shadow-md ${
                isPlaying && isAutoPlaying
                  ? "bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                  : "bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              }`}
            >
              {isPlaying && isAutoPlaying ? (
                <>
                  <Pause className="w-6 h-6" />
                  <span className="text-lg">Pause Auto-play</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  <span className="text-lg">Start Auto-play</span>
                </>
              )}
            </button>

            <button
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === questions.length - 1}
              className="flex items-center gap-3 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
            >
              <span className="font-medium">Next Question</span>
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between px-8 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-6">
              {/* Speed Control */}
              <div className="flex items-center gap-3">
                <label className="text-gray-700 font-medium">
                  Playback Speed:
                </label>
                <div className="relative">
                  <select
                    value={playbackSpeed}
                    onChange={(e) => {
                      const newSpeed = parseFloat(e.target.value);
                      setPlaybackSpeed(newSpeed);

                      if (isPlaying && currentQuestion) {
                        setIsPlaying(false);
                        setTimeout(() => {
                          setIsPlaying(true);
                        }, 100);
                      }
                    }}
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8"
                  >
                    <option value="0.5">0.5x (Very Slow)</option>
                    <option value="0.75">0.75x (Slow)</option>
                    <option value="1">1x (Normal)</option>
                    <option value="1.25">1.25x (Fast)</option>
                    <option value="1.5">1.5x (Faster)</option>
                    <option value="2">2x (Very Fast)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {/* Speed indicator badge */}
                <div className="flex items-center gap-2">
                  <div
                    className={`px-2 py-1 rounded-md text-xs font-medium ${
                      playbackSpeed < 1
                        ? "bg-blue-100 text-blue-800"
                        : playbackSpeed === 1
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {playbackSpeed === 1 ? "Normal" : `${playbackSpeed}x`}
                  </div>
                  {playbackSpeed !== 1 && (
                    <div className="text-xs text-gray-500">
                      {playbackSpeed < 1
                        ? `${Math.round((1 / playbackSpeed - 1) * 100)}% slower`
                        : `${Math.round((playbackSpeed - 1) * 100)}% faster`}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Info */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Step</div>
                  <div className="font-bold text-lg">
                    {currentStep + 1}/{totalSteps}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Question</div>
                  <div className="font-bold text-lg">
                    {currentQuestionIndex + 1}/{questions.length}
                  </div>
                </div>
                {isMultiSet && (
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Set</div>
                    <div className="font-bold text-lg">
                      {currentSetIndex + 1}/{questionSets.length}
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-sm text-gray-600">Time</div>
                  <div className="font-mono font-bold text-lg text-green-700">
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={navigateToAnswersPage}
                className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-purple-100 to-purple-50 text-purple-700 hover:from-purple-200 hover:to-purple-100 rounded-lg transition-all border border-purple-200 shadow-sm"
              >
                <List className="w-5 h-5" />
                <span className="font-medium">View All Answers</span>
              </button>

              <button
                onClick={handleRestartSession}
                className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-100 to-blue-50 text-blue-700 hover:from-blue-200 hover:to-blue-100 rounded-lg transition-all border border-blue-200 shadow-sm"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="font-medium">Restart Session</span>
              </button>

              <button
                onClick={handleGoHome}
                className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-gray-100 to-gray-50 text-gray-700 hover:from-gray-200 hover:to-gray-100 rounded-lg transition-all border border-gray-200 shadow-sm"
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Exit Player</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Set Arrangement Modal - Responsive
  const renderSetArrangementModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowSetArrangement(false)}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl lg:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg lg:text-2xl font-bold text-gray-800">
              Arrange Sets
            </h2>
            <button
              onClick={() => setShowSetArrangement(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
          </div>
          <p className="text-gray-600 mt-1 lg:mt-2 text-sm lg:text-base">
            Drag and drop to reorder sets. The first set will play first.
          </p>
        </div>

        <div className="p-4 lg:p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {questionSets.map((set, index) => (
              <div
                key={set.id}
                draggable
                onDragStart={(e) => {
                  setDraggedSet(index);
                  e.dataTransfer.setData("text/plain", index.toString());
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverSet(index);
                }}
                onDragLeave={() => setDragOverSet(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedSet === null || draggedSet === index) {
                    setDragOverSet(null);
                    setDraggedSet(null);
                    return;
                  }

                  const newSets = [...questionSets];
                  const [draggedItem] = newSets.splice(draggedSet, 1);
                  newSets.splice(index, 0, draggedItem);

                  const updatedSets = newSets.map((set, idx) => ({
                    ...set,
                    originalOrder: idx,
                  }));

                  setQuestionSets(updatedSets);

                  const reorderedQuestions = [];
                  updatedSets.forEach((set, setIndex) => {
                    const setQuestions = questions.filter(
                      (q) => q.setId === set.id,
                    );
                    const questionsWithUpdatedSet = setQuestions.map(
                      (q, qIndex) => ({
                        ...q,
                        setIndex,
                        globalIndex: reorderedQuestions.length + qIndex,
                        questionInSetIndex: qIndex,
                      }),
                    );
                    reorderedQuestions.push(...questionsWithUpdatedSet);
                  });

                  setQuestions(reorderedQuestions);

                  if (currentQuestionIndex >= 0) {
                    const currentQuestionId = currentQuestion?.id;
                    if (currentQuestionId) {
                      const newIndex = reorderedQuestions.findIndex(
                        (q) => q.id === currentQuestionId,
                      );
                      if (newIndex !== -1) {
                        setCurrentQuestionIndex(newIndex);
                      }
                    }
                  }

                  setDragOverSet(null);
                  setDraggedSet(null);
                }}
                onDragEnd={() => {
                  setDragOverSet(null);
                  setDraggedSet(null);
                }}
                className={`flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl border-2 transition-all duration-200 ${
                  draggedSet === index
                    ? "opacity-50 bg-blue-50 border-blue-300 shadow-lg"
                    : dragOverSet === index
                      ? "bg-blue-100 border-blue-400 scale-[1.02]"
                      : currentSetIndex === index
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-gray-200 hover:border-blue-300"
                } ${completedSets.has(index) ? "opacity-75" : ""}`}
              >
                <div className="cursor-move">
                  <GripVertical className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                        currentSetIndex === index
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate text-sm lg:text-base">
                        {set.name}
                      </h3>
                      <p className="text-xs lg:text-sm text-gray-600 truncate">
                        {set.totalQuestions} questions • {set.type}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {currentSetIndex === index && (
                    <span className="px-2 lg:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs lg:text-sm font-medium">
                      Current
                    </span>
                  )}
                  {completedSets.has(index) && (
                    <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 lg:p-6 border-t border-gray-200">
          <button
            onClick={() => setShowSetArrangement(false)}
            className="w-full px-4 py-3 lg:px-6 lg:py-3 bg-blue-500 text-white rounded-lg lg:rounded-xl hover:bg-blue-600 transition-colors font-medium text-sm lg:text-base"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  // Loading State
  const renderLoading = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      </motion.div>
      <h3 className="text-lg lg:text-2xl font-semibold text-gray-700 mt-4 lg:mt-6 text-center">
        {isMultiSet ? "Loading Multiple Question Sets" : "Loading Questions"}
      </h3>
      <p className="text-gray-500 mt-2 text-center">
        Preparing your practice session...
      </p>
    </div>
  );

  // Error State
  const renderError = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-8">
      <AlertCircle className="w-16 h-16 lg:w-20 lg:h-20 text-red-500 mb-4 lg:mb-6" />
      <h2 className="text-xl lg:text-3xl font-bold text-gray-700 mb-3 lg:mb-4 text-center">
        Unable to Load Questions
      </h2>
      <p className="text-gray-600 mb-6 lg:mb-8 text-center max-w-md">{error}</p>
      <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 lg:px-6 lg:py-3 bg-blue-500 text-white rounded-lg lg:rounded-xl hover:bg-blue-600 transition-colors font-medium shadow-md"
        >
          Try Again
        </button>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 lg:px-6 lg:py-3 bg-gray-500 text-white rounded-lg lg:rounded-xl hover:bg-gray-600 transition-colors font-medium shadow-md"
        >
          Go Back Home
        </button>
      </div>
    </div>
  );

  if (isLoading) return renderLoading();
  if (error) return renderError();
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4">
        <Calculator className="w-16 h-16 lg:w-20 lg:h-20 text-gray-400 mb-4 lg:mb-6" />
        <h2 className="text-lg lg:text-2xl font-bold text-gray-700 mb-2 lg:mb-3 text-center">
          No Questions Available
        </h2>
        <p className="text-gray-600 mb-6 lg:mb-8 text-center">
          {isMultiSet
            ? "The selected question sets don't have any questions yet."
            : "This question set doesn't have any questions yet."}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 lg:px-6 lg:py-3 bg-blue-500 text-white rounded-lg lg:rounded-xl hover:bg-blue-600 transition-colors font-medium shadow-md"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100" ref={mainContainerRef}>
      {/* Mobile Floating Controls Overlay */}
      {isMobile && renderControlPanel()}

      {/* Main Layout */}
      <div className="flex flex-col h-screen">
        {/* Question Display Area */}
        <div className={`flex-1 overflow-hidden ${isMobile ? "" : "h-[80vh]"}`}>
          {renderQuestionDisplay()}
        </div>

        {/* Desktop Control Panel */}
        {!isMobile && <div className="h-[20vh]">{renderControlPanel()}</div>}
      </div>

      {/* Set Arrangement Modal */}
      <AnimatePresence>
        {showSetArrangement && renderSetArrangementModal()}
      </AnimatePresence>

      {/* Session Completed Modal - Responsive */}
      <AnimatePresence>
        {sessionCompleted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-xl lg:rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6 lg:p-8 text-center">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
                  <CheckCircle className="w-8 h-8 lg:w-12 lg:h-12 text-green-600" />
                </div>
                <h2 className="text-xl lg:text-3xl font-bold text-gray-800 mb-2 lg:mb-3">
                  Session Completed!
                </h2>
                <p className="text-gray-600 mb-4 lg:mb-6 text-sm lg:text-base">
                  You've successfully completed all {questions.length} questions
                  from {questionSets.length} sets.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={navigateToAnswersPage}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg lg:rounded-xl hover:bg-blue-600 transition-colors font-medium shadow-md text-sm lg:text-base"
                  >
                    View All Answers
                  </button>
                  <button
                    onClick={() => setSessionCompleted(false)}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg lg:rounded-xl hover:bg-gray-200 transition-colors font-medium text-sm lg:text-base"
                  >
                    Continue Reviewing
                  </button>
                  <button
                    onClick={handleGoHome}
                    className="w-full py-3 bg-linear-to-r from-gray-200 to-gray-300 text-gray-700 rounded-lg lg:rounded-xl hover:from-gray-300 hover:to-gray-400 transition-colors font-medium text-sm lg:text-base"
                  >
                    Exit to Home
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
