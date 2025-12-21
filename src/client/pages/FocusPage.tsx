import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, Square, Volume2, VolumeX, Coffee, Target, Flame } from 'lucide-react';

interface FocusSession {
  id: string;
  duration_minutes: number;
  break_minutes: number;
  ambient_sound: string;
  is_completed: number;
  started_at: string;
}

interface AmbientSound {
  id: string;
  name: string;
  icon: string;
}

export default function FocusPage() {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [ambientSound, setAmbientSound] = useState('none');
  const [isMuted, setIsMuted] = useState(false);
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [overallStats, setOverallStats] = useState<any>(null);
  const [ambientSounds, setAmbientSounds] = useState<AmbientSound[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchAmbientSounds();
    fetchTodayStats();
    fetchOverallStats();
  }, []);

  useEffect(() => {
    if (isActive && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, timeLeft]);

  const fetchAmbientSounds = async () => {
    try {
      const response = await fetch('/api/focus/ambient-sounds');
      const data = await response.json();
      setAmbientSounds(data);
    } catch (error) {
      console.error('Failed to fetch ambient sounds:', error);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const response = await fetch('/api/focus/today');
      const data = await response.json();
      setTodayStats(data);
    } catch (error) {
      console.error('Failed to fetch today stats:', error);
    }
  };

  const fetchOverallStats = async () => {
    try {
      const response = await fetch('/api/focus/stats?days=30');
      const data = await response.json();
      setOverallStats(data);
    } catch (error) {
      console.error('Failed to fetch overall stats:', error);
    }
  };

  const startSession = async () => {
    try {
      const response = await fetch('/api/focus/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMinutes: focusDuration,
          breakMinutes: breakDuration,
          ambientSound
        })
      });
      const session = await response.json();
      setCurrentSession(session);
      setTimeLeft(focusDuration * 60);
      setIsActive(true);
      setIsPaused(false);
      setIsBreak(false);

      // Play notification sound
      playNotification();
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const endSession = async (completed: boolean) => {
    if (!currentSession) return;

    try {
      await fetch(`/api/focus/${currentSession.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });

      setIsActive(false);
      setIsPaused(false);
      setCurrentSession(null);
      setTimeLeft(focusDuration * 60);
      fetchTodayStats();
      fetchOverallStats();

      if (completed) {
        playNotification();
      }
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const handleTimerComplete = () => {
    if (isBreak) {
      // 休息结束，开始新的专注
      setIsBreak(false);
      setTimeLeft(focusDuration * 60);
      playNotification();
    } else {
      // 专注结束
      endSession(true);
      // 开始休息
      setIsBreak(true);
      setTimeLeft(breakDuration * 60);
      playNotification();
    }
  };

  const playNotification = () => {
    // 使用Web Audio API播放提示音
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isBreak
    ? ((breakDuration * 60 - timeLeft) / (breakDuration * 60)) * 100
    : ((focusDuration * 60 - timeLeft) / (focusDuration * 60)) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Target className="w-8 h-8 text-blue-600" />
          专注模式
        </h1>
        <p className="text-gray-500 mt-2">番茄钟 + 环境音，让阅读更专注</p>
      </div>

      {/* 计时器 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
        <div className="flex flex-col items-center">
          {/* 圆形进度 */}
          <div className="relative w-64 h-64 mb-8">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={2 * Math.PI * 120}
                strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                className={isBreak ? 'text-green-500' : 'text-blue-600'}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-mono font-bold ${isBreak ? 'text-green-600' : ''}`}>
                {formatTime(timeLeft)}
              </span>
              <span className="text-gray-500 mt-2">
                {isBreak ? '休息中' : isActive ? '专注中' : '准备开始'}
              </span>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center gap-4">
            {!isActive ? (
              <button
                onClick={startSession}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 text-lg"
              >
                <Play className="w-6 h-6" />
                开始专注
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-lg ${
                    isPaused
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-yellow-500 text-white hover:bg-yellow-600'
                  }`}
                >
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  {isPaused ? '继续' : '暂停'}
                </button>
                <button
                  onClick={() => endSession(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 text-lg"
                >
                  <Square className="w-5 h-5" />
                  结束
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 设置区域 */}
      {!isActive && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 时间设置 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Timer className="w-5 h-5" />
              时间设置
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-2">专注时长</label>
                <div className="flex items-center gap-4">
                  {[15, 25, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        setFocusDuration(mins);
                        setTimeLeft(mins * 60);
                      }}
                      className={`px-4 py-2 rounded-lg ${
                        focusDuration === mins
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {mins}分钟
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-2">休息时长</label>
                <div className="flex items-center gap-4">
                  {[5, 10, 15].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setBreakDuration(mins)}
                      className={`px-4 py-2 rounded-lg ${
                        breakDuration === mins
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {mins}分钟
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 环境音设置 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              环境音
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {ambientSounds.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => setAmbientSound(sound.id)}
                  className={`flex flex-col items-center p-3 rounded-lg ${
                    ambientSound === sound.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <span className="text-2xl">{sound.icon}</span>
                  <span className="text-xs mt-1">{sound.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 统计区域 */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* 今日统计 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">今日统计</h3>
          {todayStats && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">专注次数</span>
                <span className="text-2xl font-bold">{todayStats.completed_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">专注时长</span>
                <span className="text-2xl font-bold">{todayStats.total_focus_time || 0}分钟</span>
              </div>
            </div>
          )}
        </div>

        {/* 连续记录 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            连续专注
          </h3>
          {overallStats && (
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500">{overallStats.currentStreak}</div>
              <div className="text-gray-500 mt-1">天</div>
              <div className="text-sm text-gray-400 mt-4">最高记录: {overallStats.maxStreak} 天</div>
            </div>
          )}
        </div>

        {/* 总体统计 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">历史统计</h3>
          {overallStats?.overall && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">总专注时长</span>
                <span>{Math.round(overallStats.overall.total_focus_time / 60)}小时</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">完成次数</span>
                <span>{overallStats.overall.completed_sessions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">平均时长</span>
                <span>{Math.round(overallStats.overall.avg_session_length || 0)}分钟</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
