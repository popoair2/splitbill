'use client';

import { useState } from 'react';
import type { Group, Member } from '@/lib/types';
import {
  createGroup,
  getGroupByCode,
  createMember,
} from '@/lib/api';

function generateGroupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function HomePage() {
  const [view, setView] = useState<'home' | 'create' | 'join'>('home');
  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !groupName.trim()) {
      setError('請輸入你個名同 group 名');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const group = await createGroup(groupName.trim());
      const member = await createMember(group.id, name.trim());
      localStorage.setItem('splitbill_member', JSON.stringify({ ...member, groupCode: group.code, groupName: group.name }));
      window.location.href = `/group/${group.code}`;
    } catch (e: any) {
      setError(e.message || '建立失敗，請重試');
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!name.trim() || !joinCode.trim()) {
      setError('請輸入你個名同 group code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const group = await getGroupByCode(joinCode.trim());
      if (!group) {
        setError('搵唔到呢個 group，請檢查 code');
        setLoading(false);
        return;
      }
      const member = await createMember(group.id, name.trim());
      localStorage.setItem('splitbill_member', JSON.stringify({ ...member, groupCode: group.code, groupName: group.name }));
      window.location.href = `/group/${group.code}`;
    } catch (e: any) {
      setError(e.message || '加入失敗，請重試');
    }
    setLoading(false);
  };

  // ===== CREATE VIEW =====
  if (view === 'create') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="flex items-center mb-8">
            <button
              onClick={() => { setView('home'); setError(''); }}
              className="text-[#888] text-sm flex items-center gap-1 hover:text-[#ff6b2b] transition-colors"
            >
              ← 返回
            </button>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2 text-[#ededed]">開新 Group</h1>
          <p className="text-[#888] text-sm mb-8">建立一個新嘅夾錢 group</p>

          {/* Error */}
          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-3 mb-6">
              <p className="text-[#ef4444] text-sm">{error}</p>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-[#888] text-xs font-medium mb-2 block">你嘅名</label>
              <input
                type="text"
                placeholder="例如：小明"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-base text-[#ededed] placeholder-[#555] focus:border-[#ff6b2b] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[#888] text-xs font-medium mb-2 block">Group 名</label>
              <input
                type="text"
                placeholder="例如：日本旅行"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-base text-[#ededed] placeholder-[#555] focus:border-[#ff6b2b] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full mt-6 bg-[#ff6b2b] hover:bg-[#ff8555] text-white rounded-2xl py-4 font-bold text-base disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg shadow-[#ff6b2b]/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                建立中...
              </span>
            ) : (
              '建立 Group'
            )}
          </button>
        </div>
      </div>
    );
  }

  // ===== JOIN VIEW =====
  if (view === 'join') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="flex items-center mb-8">
            <button
              onClick={() => { setView('home'); setError(''); }}
              className="text-[#888] text-sm flex items-center gap-1 hover:text-[#ff6b2b] transition-colors"
            >
              ← 返回
            </button>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2 text-[#ededed]">加入 Group</h1>
          <p className="text-[#888] text-sm mb-8">用 group code 加入現有嘅 group</p>

          {/* Error */}
          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-3 mb-6">
              <p className="text-[#ef4444] text-sm">{error}</p>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-[#888] text-xs font-medium mb-2 block">你嘅名</label>
              <input
                type="text"
                placeholder="例如：小明"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-base text-[#ededed] placeholder-[#555] focus:border-[#ff6b2b] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[#888] text-xs font-medium mb-2 block">Group Code</label>
              <input
                type="text"
                placeholder="6位 code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-lg text-[#ededed] placeholder-[#555] focus:border-[#ff6b2b] focus:outline-none transition-colors tracking-[0.3em] text-center font-mono font-bold"
              />
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full mt-6 bg-[#22c55e] hover:bg-[#2ee06b] text-white rounded-2xl py-4 font-bold text-base disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg shadow-[#22c55e]/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                加入中...
              </span>
            ) : (
              '加入 Group'
            )}
          </button>
        </div>
      </div>
    );
  }

  // ===== HOME VIEW =====
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Top Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Logo / Icon */}
        <div className="w-20 h-20 bg-[#ff6b2b]/10 rounded-3xl flex items-center justify-center mb-6 border border-[#ff6b2b]/20">
          <span className="text-4xl">🧾</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-2 text-[#ededed] tracking-tight">夾錢計數</h1>
        <p className="text-[#888] text-base mb-10">旅行夾錢，輕鬆計數</p>

        {/* Stats / Info Cards */}
        <div className="w-full max-w-sm grid grid-cols-2 gap-3 mb-10">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 text-center">
            <p className="text-[#ff6b2b] text-2xl font-bold">6</p>
            <p className="text-[#888] text-xs mt-1">位 group code</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 text-center">
            <p className="text-[#22c55e] text-2xl font-bold">∞</p>
            <p className="text-[#888] text-xs mt-1">免費使用</p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="p-4 pb-8 space-y-3">
        <button
          onClick={() => setView('create')}
          className="w-full bg-[#ff6b2b] hover:bg-[#ff8555] text-white rounded-2xl py-4 font-bold text-lg transition-all active:scale-[0.98] shadow-lg shadow-[#ff6b2b]/20"
        >
          開新 Group
        </button>
        <button
          onClick={() => setView('join')}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#ff6b2b]/50 text-[#ededed] rounded-2xl py-4 font-bold text-lg transition-all active:scale-[0.98]"
        >
          加入現有 Group
        </button>
      </div>
    </div>
  );
}
