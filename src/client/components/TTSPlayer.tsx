import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Settings } from 'lucide-react';

interface Props {
  text: string;
  title?: string;
}

export default function TTSPlayer({ text, title }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rate, setRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textChunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);

  useEffect(() => {
    // Load voices
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      // Filter for Chinese and English voices
      const filteredVoices = availableVoices.filter(
        (v) => v.lang.startsWith('zh') || v.lang.startsWith('en')
      );
      setVoices(filteredVoices);

      // Default to first Chinese voice
      const defaultVoice = filteredVoices.find((v) => v.lang.startsWith('zh')) || filteredVoices[0];
      if (defaultVoice && !selectedVoice) {
        setSelectedVoice(defaultVoice.name);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    // Split text into chunks (sentences)
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const sentences = cleanText.match(/[^。！？.!?]+[。！？.!?]?/g) || [cleanText];
    textChunksRef.current = sentences;
  }, [text]);

  const speak = (startIndex = 0) => {
    speechSynthesis.cancel();
    currentChunkRef.current = startIndex;

    const speakChunk = () => {
      if (currentChunkRef.current >= textChunksRef.current.length) {
        setIsPlaying(false);
        setIsPaused(false);
        setProgress(100);
        return;
      }

      const chunk = textChunksRef.current[currentChunkRef.current];
      const utterance = new SpeechSynthesisUtterance(chunk);

      const voice = voices.find((v) => v.name === selectedVoice);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.rate = rate;
      utterance.pitch = 1;

      utterance.onend = () => {
        currentChunkRef.current++;
        setProgress((currentChunkRef.current / textChunksRef.current.length) * 100);
        speakChunk();
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    };

    setIsPlaying(true);
    setIsPaused(false);
    speakChunk();
  };

  const togglePlayPause = () => {
    if (!isPlaying) {
      speak(currentChunkRef.current);
    } else if (isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
    } else {
      speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const stop = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    currentChunkRef.current = 0;
  };

  const skipBackward = () => {
    const newIndex = Math.max(0, currentChunkRef.current - 3);
    speak(newIndex);
  };

  const skipForward = () => {
    const newIndex = Math.min(textChunksRef.current.length - 1, currentChunkRef.current + 3);
    speak(newIndex);
  };

  return (
    <div className="bg-gradient-to-r from-primary-500 to-blue-500 rounded-xl p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 size={20} />
          <span className="font-medium">朗读文章</span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>

      {title && (
        <p className="text-white/80 text-sm mb-3 line-clamp-1">{title}</p>
      )}

      {/* Progress bar */}
      <div className="h-1 bg-white/30 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={skipBackward}
          disabled={!isPlaying}
          className="p-2 hover:bg-white/20 rounded-full disabled:opacity-50 transition-colors"
        >
          <SkipBack size={20} />
        </button>

        <button
          onClick={togglePlayPause}
          className="p-4 bg-white text-primary-600 rounded-full hover:bg-white/90 transition-colors"
        >
          {isPlaying && !isPaused ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
        </button>

        <button
          onClick={stop}
          disabled={!isPlaying}
          className="p-2 hover:bg-white/20 rounded-full disabled:opacity-50 transition-colors"
        >
          <Square size={20} />
        </button>

        <button
          onClick={skipForward}
          disabled={!isPlaying}
          className="p-2 hover:bg-white/20 rounded-full disabled:opacity-50 transition-colors"
        >
          <SkipForward size={20} />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mt-4 p-3 bg-white/10 rounded-lg">
          <div className="mb-3">
            <label className="text-sm text-white/80 block mb-1">语音</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm focus:outline-none"
            >
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name} className="text-gray-900">
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-white/80 block mb-1">
              语速: {rate}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
