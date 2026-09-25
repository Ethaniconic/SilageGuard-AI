/**
 * SILAGEGUARD AI — useAdvisorySpeech Custom Hook
 * Handles offline Text-to-Speech narration for farmer advisories.
 */

import { useState, useCallback } from "react";
import { LanguageCode } from "../utils/constants";

export function useAdvisorySpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string, language: LanguageCode = "en") => {
    try {
      setIsSpeaking(true);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.95;
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
      } else {
        const Speech = require("expo-speech");
        Speech.speak(text, {
          language,
          rate: 0.9,
          onDone: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false)
        });
      }
    } catch (e) {
      console.warn("Speech API notice:", e);
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      } else {
        const Speech = require("expo-speech");
        Speech.stop();
      }
      setIsSpeaking(false);
    } catch (e) {
      console.warn("Speech stop notice:", e);
    }
  }, []);

  return { speak, stop, isSpeaking };
}
