'use client';

import { useState } from 'react';
import {
  createGroup,
  getGroupByCode,
  createMember,
} from '@/lib/api';

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
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-5">
        <div className="w-full max-w-xs">
          <button
            onClick={() => { setView('home'); setError(''); }}
            className="text-[#555] text-xs mb-6 flex items-center gap-1 hover:text-[#ff6b2b] transition-colors"
          >
            ← 返回
          </button>

          <h1 className="text-lg font-semibold mb-0.5 text-[#e0e0e0]">開新 Group</h1>
          <p className="text-[#555] text-xs mb-5">建立一個新嘅夾錢 group</p>

          {error && (
            <div className="bg-[#ff6b2b]/8 border border-[#ff6b2b]/20 rounded-lg px-3 py-2 mb-4">
              <p className="text-[#ff6b2b] text-xs">{error}</p>
            </div>
          )}

          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
            <div>
              <label className="text-[#555] text-[10px] font-medium mb-1.5 block uppercase tracking-wider">你嘅名</label>
              <input
                type="text"
                placeholder="例如：小明"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#0c0c0c] border border-[#222] rounded-lg px-3 py-2.5 text-sm text-[#e0e0e0] placeholder-[#444] focus:border-[#ff6b2b]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[#555] text-[10px] font-medium mb-1.5 block uppercase tracking-wider">Group 名</label>
              <input
                type="text"
                placeholder="例如：日本旅行"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full bg-[#0c0c0c] border border-[#222] rounded-lg px-3 py-2.5 text-sm text-[#e0e0e0] placeholder-[#444] focus:border-[#ff6b2b]/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full mt-4 bg-[#ff6b2b] hover:bg-[#ff7f47] text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-30 transition-all active:scale-[0.98]"
          >
            {loading ? '建立中...' : '建立 Group'}
          </button>
        </div>
      </div>
    );
  }

  // ===== JOIN VIEW =====
  if (view === 'join') {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-5">
        <div className="w-full max-w-xs">
          <button
            onClick={() => { setView('home'); setError(''); }}
            className="text-[#555] text-xs mb-6 flex items-center gap-1 hover:text-[#ff6b2b] transition-colors"
          >
            ← 返回
          </button>

          <h1 className="text-lg font-semibold mb-0.5 text-[#e0e0e0]">加入 Group</h1>
          <p className="text-[#555] text-xs mb-5">用 group code 加入現有嘅 group</p>

          {error && (
            <div className="bg-[#ff6b2b]/8 border border-[#ff6b2b]/20 rounded-lg px-3 py-2 mb-4">
              <p className="text-[#ff6b2b] text-xs">{error}</p>
            </div>
          )}

          <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-4 space-y-3">
            <div>
              <label className="text-[#555] text-[10px] font-medium mb-1.5 block uppercase tracking-wider">你嘅名</label>
              <input
                type="text"
                placeholder="例如：小明"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#0c0c0c] border border-[#222] rounded-lg px-3 py-2.5 text-sm text-[#e0e0e0] placeholder-[#444] focus:border-[#ff6b2b]/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[#555] text-[10px] font-medium mb-1.5 block uppercase tracking-wider">Group Code</label>
              <input
                type="text"
                placeholder="6位 code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-[#0c0c0c] border border-[#222] rounded-lg px-3 py-2.5 text-base text-[#e0e0e0] placeholder-[#444] focus:border-[#ff6b2b]/50 focus:outline-none transition-colors tracking-[0.25em] text-center font-mono font-semibold"
              />
            </div>
          </div>

          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full mt-4 bg-[#ff6b2b] hover:bg-[#ff7f47] text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-30 transition-all active:scale-[0.98]"
          >
            {loading ? '加入中...' : '加入 Group'}
          </button>
        </div>
      </div>
    );
  }

  // ===== HOME VIEW =====
  return (
    <div className="min-h-screen bg-[#0c0c0c] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Logo */}
        <div className="w-12 h-12 bg-[#ff6b2b]/10 rounded-xl flex items-center justify-center mb-4 border border-[#ff6b2b]/15">
          <span className="text-xl">🧾</span>
        </div>

        <h1 className="text-xl font-semibold mb-1 text-[#e0e0e0] tracking-tight">夾錢計數</h1>
        <p className="text-[#555] text-xs mb-8">旅行夾錢，輕鬆計數</p>

        {/* Compact Info Row */}
        <div className="w-full max-w-xs flex gap-2 mb-8">
          <div className="flex-1 bg-[#141414] border border-[#1e1e1e] rounded-lg px-3 py-2.5 text-center">
            <p className="text-[#ff6b2b] text-base font-semibold">6</p>
            <p className="text-[#555] text-[10px]">位 code</p>
          </div>
          <div className="flex-1 bg-[#141414] border border-[#1e1e1e] rounded-lg px-3 py-2.5 text-center">
            <p className="text-[#e0e0e0] text-base font-semibold">∞</p>
            <p className="text-[#555] text-[10px]">免費</p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-6 space-y-2">
        <button
          onClick={() => setView('create')}
          className="w-full bg-[#ff6b2b] hover:bg-[#ff7f47] text-white rounded-lg py-3 font-semibold text-sm transition-all active:scale-[0.98]"
        >
          開新 Group
        </button>
        <button
          onClick={() => setView('join')}
          className="w-full bg-[#141414] border border-[#1e1e1e] hover:border-[#ff6b2b]/30 text-[#e0e0e0] rounded-lg py-3 font-semibold text-sm transition-all active:scale-[0.98]"
        >
          加入現有 Group
        </button>
      </div>
    </div>
  );
}
