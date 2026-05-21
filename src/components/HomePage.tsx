'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Group, Member, Transaction, Payment, Settlement } from '@/lib/types';
import {
  createGroup,
  getGroupByCode,
  getGroup,
  createMember,
  getMembers,
  getTransactions,
  getPayments,
  createTransaction,
  createPayment,
  calculateBalances,
  calculateSettlements,
} from '@/lib/api';

// Helper to generate group code
function generateGroupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ==================== HOME PAGE ====================
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

  if (view === 'create') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
          <button onClick={() => setView('home')} className="text-blue-600 mb-4 text-sm">← 返回</button>
          <h1 className="text-xl font-bold mb-6">開新 Group</h1>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <input
            type="text"
            placeholder="你嘅名"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border rounded-lg px-4 py-3 mb-3 text-base"
          />
          <input
            type="text"
            placeholder="Group 名（例如：日本旅行）"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            className="w-full border rounded-lg px-4 py-3 mb-4 text-base"
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold text-base disabled:opacity-50"
          >
            {loading ? '建立中...' : '建立 Group'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
          <button onClick={() => setView('home')} className="text-blue-600 mb-4 text-sm">← 返回</button>
          <h1 className="text-xl font-bold mb-6">加入 Group</h1>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <input
            type="text"
            placeholder="你嘅名"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border rounded-lg px-4 py-3 mb-3 text-base"
          />
          <input
            type="text"
            placeholder="Group Code（6位）"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full border rounded-lg px-4 py-3 mb-4 text-base tracking-widest text-center font-mono text-lg"
          />
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full bg-green-600 text-white rounded-lg py-3 font-semibold text-base disabled:opacity-50"
          >
            {loading ? '加入中...' : '加入 Group'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🧾</div>
        <h1 className="text-2xl font-bold mb-2">夾錢計數</h1>
        <p className="text-gray-500 mb-8">旅行夾錢，輕鬆計數</p>
        <button
          onClick={() => setView('create')}
          className="w-full bg-blue-600 text-white rounded-lg py-4 font-semibold text-lg mb-3"
        >
          開新 Group
        </button>
        <button
          onClick={() => setView('join')}
          className="w-full bg-white border-2 border-gray-200 rounded-lg py-4 font-semibold text-lg"
        >
          加入現有 Group
        </button>
      </div>
    </div>
  );
}
