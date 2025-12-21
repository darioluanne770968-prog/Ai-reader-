import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Calendar, Check, Flame, Award, Target } from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  is_active: number;
  is_completed: number;
  checkins?: any[];
  streak?: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_earned: number;
  earned_at?: string;
}

export default function ChallengePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    challengeType: 'articles',
    targetValue: 7,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchChallenges();
    fetchBadges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const response = await fetch('/api/challenges');
      const data = await response.json();
      setChallenges(data);
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
    }
  };

  const fetchBadges = async () => {
    try {
      const response = await fetch('/api/challenges/badges/all');
      const data = await response.json();
      setBadges(data);
    } catch (error) {
      console.error('Failed to fetch badges:', error);
    }
  };

  const fetchChallengeDetail = async (id: string) => {
    try {
      const response = await fetch(`/api/challenges/${id}`);
      const data = await response.json();
      setSelectedChallenge(data);
    } catch (error) {
      console.error('Failed to fetch challenge:', error);
    }
  };

  const createChallenge = async () => {
    try {
      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChallenge)
      });
      const challenge = await response.json();
      setChallenges([challenge, ...challenges]);
      setShowCreateModal(false);
      setNewChallenge({
        title: '',
        description: '',
        challengeType: 'articles',
        targetValue: 7,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Failed to create challenge:', error);
    }
  };

  const checkin = async (challengeId: string) => {
    try {
      await fetch(`/api/challenges/${challengeId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 1 })
      });
      fetchChallenges();
      if (selectedChallenge?.id === challengeId) {
        fetchChallengeDetail(challengeId);
      }
      // 检查是否获得新徽章
      checkBadges();
    } catch (error: any) {
      alert(error.message || '打卡失败');
    }
  };

  const checkBadges = async () => {
    try {
      const response = await fetch('/api/challenges/badges/check', { method: 'POST' });
      const data = await response.json();
      if (data.newBadges?.length > 0) {
        alert(`恭喜获得新徽章: ${data.newBadges.map((b: any) => b.name).join(', ')}`);
        fetchBadges();
      }
    } catch (error) {
      console.error('Failed to check badges:', error);
    }
  };

  const getProgress = (challenge: Challenge) => {
    return Math.min((challenge.current_value / challenge.target_value) * 100, 100);
  };

  const getDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          阅读挑战
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          创建挑战
        </button>
      </div>

      {/* 进行中的挑战 */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">进行中的挑战</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.filter(c => c.is_active).map((challenge) => (
            <div
              key={challenge.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => fetchChallengeDetail(challenge.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{challenge.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{challenge.description}</p>
                </div>
                <Target className="w-6 h-6 text-blue-500" />
              </div>

              {/* 进度条 */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>{challenge.current_value} / {challenge.target_value}</span>
                  <span>{Math.round(getProgress(challenge))}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${getProgress(challenge)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>剩余 {getDaysLeft(challenge.end_date)} 天</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    checkin(challenge.id);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Check className="w-4 h-4" />
                  打卡
                </button>
              </div>
            </div>
          ))}

          {challenges.filter(c => c.is_active).length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>暂无进行中的挑战</p>
              <p className="text-sm mt-2">创建一个新挑战开始你的阅读之旅</p>
            </div>
          )}
        </div>
      </div>

      {/* 徽章墙 */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-yellow-500" />
          我的徽章
        </h2>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`flex flex-col items-center p-3 rounded-xl ${
                badge.is_earned
                  ? 'bg-yellow-50 dark:bg-yellow-900/30'
                  : 'bg-gray-100 dark:bg-gray-700 opacity-50'
              }`}
              title={badge.description}
            >
              <span className="text-3xl">{badge.icon}</span>
              <span className="text-xs mt-1 text-center">{badge.name}</span>
              {badge.is_earned && (
                <Check className="w-4 h-4 text-green-500 mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 已完成的挑战 */}
      {challenges.filter(c => c.is_completed).length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">已完成的挑战</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {challenges.filter(c => c.is_completed).map((challenge) => (
              <div
                key={challenge.id}
                className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 border border-green-200 dark:border-green-800"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-green-600" />
                  <span className="font-medium">{challenge.title}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  完成 {challenge.target_value} 次目标
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 挑战详情弹窗 */}
      {selectedChallenge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{selectedChallenge.title}</h3>
                  <p className="text-gray-500 mt-1">{selectedChallenge.description}</p>
                </div>
                <button
                  onClick={() => setSelectedChallenge(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* 进度 */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-2xl font-bold">
                    {selectedChallenge.current_value} / {selectedChallenge.target_value}
                  </span>
                  <span className="text-gray-500">{Math.round(getProgress(selectedChallenge))}%</span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${getProgress(selectedChallenge)}%` }}
                  />
                </div>
              </div>

              {/* 连续打卡 */}
              {selectedChallenge.streak !== undefined && selectedChallenge.streak > 0 && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                  <Flame className="w-6 h-6 text-orange-500" />
                  <span className="font-medium">连续打卡 {selectedChallenge.streak} 天</span>
                </div>
              )}

              {/* 打卡日历 */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">打卡记录</h4>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - 27 + i);
                    const dateStr = date.toISOString().split('T')[0];
                    const hasCheckin = selectedChallenge.checkins?.some(
                      (c: any) => c.checkin_date === dateStr
                    );
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded ${
                          hasCheckin
                            ? 'bg-green-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                        title={dateStr}
                      />
                    );
                  })}
                </div>
              </div>

              {selectedChallenge.is_active ? (
                <button
                  onClick={() => {
                    checkin(selectedChallenge.id);
                  }}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  今日打卡
                </button>
              ) : (
                <div className="text-center py-3 text-green-600 font-medium">
                  挑战已完成！
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 创建挑战弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4">创建新挑战</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">挑战名称</label>
                  <input
                    type="text"
                    value={newChallenge.title}
                    onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    placeholder="例如：7天阅读挑战"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">描述</label>
                  <textarea
                    value={newChallenge.description}
                    onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    placeholder="挑战描述..."
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">目标次数</label>
                  <input
                    type="number"
                    value={newChallenge.targetValue}
                    onChange={(e) => setNewChallenge({ ...newChallenge, targetValue: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    min={1}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">开始日期</label>
                    <input
                      type="date"
                      value={newChallenge.startDate}
                      onChange={(e) => setNewChallenge({ ...newChallenge, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">结束日期</label>
                    <input
                      type="date"
                      value={newChallenge.endDate}
                      onChange={(e) => setNewChallenge({ ...newChallenge, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={createChallenge}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
