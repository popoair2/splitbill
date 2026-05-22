'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Group, Member, Transaction, Payment, Settlement } from '@/lib/types';
import {
  getGroupByCode,
  getMembers,
  getTransactions,
  getPayments,
  createTransaction,
  createPayment,
  calculateBalances,
  calculateSettlements,
} from '@/lib/api';

interface StoredMember {
  id: string;
  group_id: string;
  name: string;
  groupCode: string;
  groupName: string;
}

export function GroupPage({ groupCode }: { groupCode: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentMember, setCurrentMember] = useState<StoredMember | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [tab, setTab] = useState<'transactions' | 'balances' | 'settle'>('transactions');
  const [showAddTx, setShowAddTx] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add transaction form
  const [txPayer, setTxPayer] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txForWhom, setTxForWhom] = useState<string[]>([]);
  const [txSubmitting, setTxSubmitting] = useState(false);

  // Settle form
  const [settleFrom, setSettleFrom] = useState('');
  const [settleTo, setSettleTo] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const g = await getGroupByCode(groupCode);
      if (!g) {
        setError('Group 唔存在');
        setLoading(false);
        return;
      }
      setGroup(g);
      const [m, t, p] = await Promise.all([
        getMembers(g.id),
        getTransactions(g.id),
        getPayments(g.id),
      ]);
      setMembers(m);
      setTransactions(t);
      setPayments(p);

      const bal = calculateBalances(m, t, p);
      setBalances(bal);
      setSettlements(calculateSettlements(m, bal));
    } catch (e: any) {
      setError(e.message || '載入失敗');
    }
    setLoading(false);
  }, [groupCode]);

  useEffect(() => {
    const stored = localStorage.getItem('splitbill_member');
    if (stored) {
      const member: StoredMember = JSON.parse(stored);
      if (member.groupCode === groupCode) {
        setCurrentMember(member);
        setTxPayer(member.id);
      }
    }
    loadData();
  }, [groupCode, loadData]);

  useEffect(() => {
    if (members.length > 0 && txForWhom.length === 0) {
      setTxForWhom(members.map(m => m.id));
    }
  }, [members]);

  const handleAddTransaction = async () => {
    if (!txPayer || !txAmount || txForWhom.length === 0) {
      alert('請填寫所有欄位');
      return;
    }
    setTxSubmitting(true);
    try {
      await createTransaction(
        group!.id,
        txPayer,
        parseFloat(txAmount),
        txDesc,
        txForWhom
      );
      setShowAddTx(false);
      setTxAmount('');
      setTxDesc('');
      await loadData();
    } catch (e: any) {
      alert(e.message || '新增失敗');
    }
    setTxSubmitting(false);
  };

  const handleSettle = async () => {
    if (!settleFrom || !settleTo || !settleAmount) {
      alert('請填寫所有欄位');
      return;
    }
    setSettleSubmitting(true);
    try {
      await createPayment(
        group!.id,
        settleFrom,
        settleTo,
        parseFloat(settleAmount)
      );
      setSettleFrom('');
      setSettleTo('');
      setSettleAmount('');
      await loadData();
    } catch (e: any) {
      alert(e.message || '記錄失敗');
    }
    setSettleSubmitting(false);
  };

  const toggleForWhom = (memberId: string) => {
    setTxForWhom(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const copyCode = () => {
    navigator.clipboard.writeText(groupCode);
    alert('Group Code 已複製！');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#ff6b2b]/30 border-t-[#ff6b2b] rounded-full animate-spin" />
          <p className="text-[#888] text-sm">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl p-6 text-center">
          <p className="text-[#ef4444] text-lg font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const memberMap = new Map(members.map(m => [m.id, m.name]));
  const totalSpent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-8">
      {/* Header Card */}
      <div className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <div className="max-w-lg mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-bold text-xl text-[#ededed]">{group?.name}</h1>
              <button onClick={copyCode} className="text-sm text-[#ff6b2b] font-mono mt-1 flex items-center gap-1">
                {groupCode} <span className="text-xs">📋</span>
              </button>
            </div>
            <div className="text-right">
              <p className="text-[#888] text-xs">你係</p>
              <p className="font-semibold text-sm text-[#ededed]">{currentMember?.name || '訪客'}</p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0a0a0a] rounded-xl p-3 text-center border border-[#2a2a2a]">
              <p className="text-[#ff6b2b] text-lg font-bold">{transactions.length}</p>
              <p className="text-[#888] text-xs">交易</p>
            </div>
            <div className="bg-[#0a0a0a] rounded-xl p-3 text-center border border-[#2a2a2a]">
              <p className="text-[#22c55e] text-lg font-bold">{members.length}</p>
              <p className="text-[#888] text-xs">成員</p>
            </div>
            <div className="bg-[#0a0a0a] rounded-xl p-3 text-center border border-[#2a2a2a]">
              <p className="text-[#ededed] text-lg font-bold">¥{totalSpent.toLocaleString()}</p>
              <p className="text-[#888] text-xs">總額</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <div className="max-w-lg mx-auto flex">
          {([
            { key: 'transactions', label: '交易', icon: '💳' },
            { key: 'balances', label: '結餘', icon: '📊' },
            { key: 'settle', label: '還款', icon: '💸' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'text-[#ff6b2b] border-b-2 border-[#ff6b2b]'
                  : 'text-[#888]'
              }`}
            >
              <span className="block text-base mb-0.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4">

        {/* ===== TRANSACTIONS TAB ===== */}
        {tab === 'transactions' && (
          <div>
            {transactions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#2a2a2a]">
                  <span className="text-3xl">📝</span>
                </div>
                <p className="text-[#888] text-base">未有交易記錄</p>
                <p className="text-[#666] text-sm mt-1">撳下面嘅按鈕新增第一筆交易</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div key={tx.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 bg-[#ff6b2b]/10 rounded-full flex items-center justify-center text-sm font-bold text-[#ff6b2b]">
                            {(memberMap.get(tx.payer_id) || '?').charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-[#ededed] text-sm">
                              {memberMap.get(tx.payer_id) || '未知'}
                            </p>
                            <p className="text-xs text-[#888]">
                              {new Date(tx.created_at).toLocaleDateString('zh-HK')}
                            </p>
                          </div>
                        </div>
                        {tx.description && (
                          <p className="text-[#aaa] text-sm mt-2 ml-10">{tx.description}</p>
                        )}
                        <p className="text-[#666] text-xs mt-1 ml-10">
                          分攤：{(tx.for_whom || []).map(id => memberMap.get(id)).filter(Boolean).join('、')}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="font-bold text-lg text-[#ff6b2b]">¥{Number(tx.amount).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FAB - Add Transaction */}
            <button
              onClick={() => setShowAddTx(true)}
              className="fixed bottom-6 right-6 w-14 h-14 bg-[#ff6b2b] hover:bg-[#ff8555] text-white rounded-2xl shadow-lg shadow-[#ff6b2b]/30 flex items-center justify-center text-2xl transition-all active:scale-95"
            >
              +
            </button>
          </div>
        )}

        {/* ===== BALANCES TAB ===== */}
        {tab === 'balances' && (
          <div>
            {members.map(member => {
              const balance = balances.get(member.id) || 0;
              const isPositive = balance > 0.01;
              const isNegative = balance < -0.01;
              return (
                <div key={member.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 mb-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      isPositive ? 'bg-[#22c55e]' : isNegative ? 'bg-[#ef4444]' : 'bg-[#333]'
                    }`}>
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-medium text-[#ededed]">{member.name}</span>
                      <p className="text-xs text-[#888]">
                        {isPositive ? '應收' : isNegative ? '應付' : '已結清'}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold text-lg ${
                    isPositive ? 'text-[#22c55e]' : isNegative ? 'text-[#ef4444]' : 'text-[#666]'
                  }`}>
                    {isPositive ? '+' : ''}{Math.round(balance).toLocaleString()}
                  </span>
                </div>
              );
            })}

            {settlements.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold mb-3 text-[#ededed] flex items-center gap-2">
                  <span className="text-[#ff6b2b]">⚡</span> 建議還款
                </h3>
                <div className="space-y-2">
                  {settlements.map((s, i) => (
                    <div key={i} className="bg-[#ff6b2b]/5 border border-[#ff6b2b]/20 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[#ef4444] font-medium text-sm">{s.fromName}</span>
                          <span className="text-[#ff6b2b]">→</span>
                          <span className="text-[#22c55e] font-medium text-sm">{s.toName}</span>
                        </div>
                        <span className="font-bold text-[#ff6b2b]">¥{s.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== SETTLE TAB ===== */}
        {tab === 'settle' && (
          <div>
            {/* Settle Form */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 space-y-4 mb-6">
              <h2 className="font-bold text-[#ededed] flex items-center gap-2">
                <span>💸</span> 記錄還款
              </h2>
              <div>
                <label className="text-[#888] text-xs font-medium mb-2 block">邊個還錢</label>
                <select
                  value={settleFrom}
                  onChange={e => setSettleFrom(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-base text-[#ededed] focus:border-[#ff6b2b] focus:outline-none transition-colors"
                >
                  <option value="">揀一個人</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[#888] text-xs font-medium mb-2 block">還俾邊個</label>
                <select
                  value={settleTo}
                  onChange={e => setSettleTo(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-base text-[#ededed] focus:border-[#ff6b2b] focus:outline-none transition-colors"
                >
                  <option value="">揀一個人</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[#888] text-xs font-medium mb-2 block">金額（¥）</label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={e => setSettleAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-base text-[#ededed] placeholder-[#555] focus:border-[#ff6b2b] focus:outline-none transition-colors"
                />
              </div>
              <button
                onClick={handleSettle}
                disabled={settleSubmitting}
                className="w-full bg-[#22c55e] hover:bg-[#2ee06b] text-white rounded-xl py-3 font-bold disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg shadow-[#22c55e]/20"
              >
                {settleSubmitting ? '記錄中...' : '確認還款'}
              </button>
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
              <div>
                <h3 className="font-bold mb-3 text-[#ededed]">還款記錄</h3>
                <div className="space-y-2">
                  {payments.map(p => (
                    <div key={p.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-[#ededed] text-sm">
                            {memberMap.get(p.from_member_id)} <span className="text-[#ff6b2b]">→</span> {memberMap.get(p.to_member_id)}
                          </p>
                          <p className="text-xs text-[#888] mt-1">
                            {new Date(p.created_at).toLocaleDateString('zh-HK')}
                          </p>
                        </div>
                        <span className="font-bold text-[#22c55e]">¥{Number(p.amount).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== ADD TRANSACTION MODAL ===== */}
      {showAddTx && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
          <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto border-t border-[#2a2a2a]">
            {/* Handle bar */}
            <div className="w-10 h-1 bg-[#333] rounded-full mx-auto mb-5" />

            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-lg text-[#ededed]">新增交易</h2>
              <button onClick={() => setShowAddTx(false)} className="text-[#888] text-2xl hover:text-[#ededed] transition-colors">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[#888] text-xs font-medium mb-2 block">邊個付錢</label>
                <select
                  value={txPayer}
                  onChange={e => setTxPayer(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-base text-[#ededed] focus:border-[#ff6b2b] focus:outline-none transition-colors"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#888] text-xs font-medium mb-2 block">金額（¥）</label>
                <input
                  type="number"
                  value={txAmount}
                  onChange={e => setTxAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-2xl font-bold text-[#ff6b2b] placeholder-[#555] focus:border-[#ff6b2b] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[#888] text-xs font-medium mb-2 block">備註</label>
                <input
                  type="text"
                  value={txDesc}
                  onChange={e => setTxDesc(e.target.value)}
                  placeholder="例如：午餐、車費..."
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-base text-[#ededed] placeholder-[#555] focus:border-[#ff6b2b] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[#888] text-xs font-medium mb-3 block">邊個要分攤</label>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => toggleForWhom(m.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        txForWhom.includes(m.id)
                          ? 'bg-[#ff6b2b] text-white shadow-lg shadow-[#ff6b2b]/20'
                          : 'bg-[#0a0a0a] text-[#888] border border-[#333]'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddTransaction}
                disabled={txSubmitting}
                className="w-full bg-[#ff6b2b] hover:bg-[#ff8555] text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg shadow-[#ff6b2b]/20 mt-2"
              >
                {txSubmitting ? '新增中...' : '確認新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
