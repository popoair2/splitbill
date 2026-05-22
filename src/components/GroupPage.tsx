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

// ===== Circular Progress Ring Component =====
function SpendingRing({ spent, total, size = 56 }: { spent: number; total: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? Math.min(spent / total, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1e1e1e"
        strokeWidth="3"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#ff6b2b"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500"
      />
    </svg>
  );
}

// ===== Member Spending Card =====
function MemberSpendingCard({
  member,
  spent,
  total,
  balance,
  memberName,
}: {
  member: Member;
  spent: number;
  total: number;
  balance: number;
  memberName: string;
}) {
  const isPositive = balance > 0.01;
  const isNegative = balance < -0.01;

  return (
    <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-3.5 flex items-center gap-3">
      {/* Ring Chart */}
      <div className="relative flex-shrink-0">
        <SpendingRing spent={spent} total={total} size={52} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-medium text-[#e0e0e0]">
            {total > 0 ? Math.round((spent / total) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="font-medium text-[#e0e0e0] text-sm truncate">{memberName}</span>
          <span className={`text-xs font-semibold tabular-nums ${
            isPositive ? 'text-[#22c55e]' : isNegative ? 'text-[#ef4444]' : 'text-[#555]'
          }`}>
            {isPositive ? '+' : ''}{Math.round(balance).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#555] tabular-nums">
            洗咗 ¥{spent.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#444]">
            {isPositive ? '應收' : isNegative ? '應付' : '結清'}
          </span>
        </div>
      </div>
    </div>
  );
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

  const [txPayer, setTxPayer] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txForWhom, setTxForWhom] = useState<string[]>([]);
  const [txSubmitting, setTxSubmitting] = useState(false);

  const [settleFrom, setSettleFrom] = useState('');
  const [settleTo, setSettleTo] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const g = await getGroupByCode(groupCode);
      if (!g) { setError('Group 唔存在'); setLoading(false); return; }
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
    if (!txPayer || !txAmount || txForWhom.length === 0) { alert('請填寫所有欄位'); return; }
    setTxSubmitting(true);
    try {
      await createTransaction(group!.id, txPayer, parseFloat(txAmount), txDesc, txForWhom);
      setShowAddTx(false);
      setTxAmount(''); setTxDesc('');
      await loadData();
    } catch (e: any) { alert(e.message || '新增失敗'); }
    setTxSubmitting(false);
  };

  const handleSettle = async () => {
    if (!settleFrom || !settleTo || !settleAmount) { alert('請填寫所有欄位'); return; }
    setSettleSubmitting(true);
    try {
      await createPayment(group!.id, settleFrom, settleTo, parseFloat(settleAmount));
      setSettleFrom(''); setSettleTo(''); setSettleAmount('');
      await loadData();
    } catch (e: any) { alert(e.message || '記錄失敗'); }
    setSettleSubmitting(false);
  };

  const toggleForWhom = (memberId: string) => {
    setTxForWhom(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(groupCode);
    alert('Group Code 已複製');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#ff6b2b]/20 border-t-[#ff6b2b] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-5">
        <p className="text-[#ef4444] text-sm">{error}</p>
      </div>
    );
  }

  const memberMap = new Map(members.map(m => [m.id, m.name]));
  const totalSpent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

  // Calculate per-member spending (what they paid)
  const memberSpending = new Map<string, number>();
  for (const tx of transactions) {
    const current = memberSpending.get(tx.payer_id) || 0;
    memberSpending.set(tx.payer_id, current + Number(tx.amount));
  }

  const tabs = [
    { key: 'transactions' as const, label: '交易' },
    { key: 'balances' as const, label: '結餘' },
    { key: 'settle' as const, label: '還款' },
  ];

  return (
    <div className="min-h-screen bg-[#0c0c0c] pb-6">
      {/* ===== HEADER ===== */}
      <div className="bg-[#141414] border-b border-[#1e1e1e]">
        <div className="max-w-md mx-auto px-4 py-4">
          {/* Top row: name + code */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-semibold text-sm text-[#e0e0e0]">{group?.name}</h1>
              <button onClick={copyCode} className="text-[10px] text-[#ff6b2b] font-mono mt-0.5">
                {groupCode}
              </button>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#555]">你係</p>
              <p className="text-xs font-medium text-[#e0e0e0]">{currentMember?.name || '訪客'}</p>
            </div>
          </div>

          {/* Big total + mini stats */}
          <div className="flex items-end gap-4">
            <div>
              <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">總支出</p>
              <p className="text-2xl font-bold text-[#e0e0e0] tabular-nums leading-none">
                ¥{totalSpent.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-3 pb-0.5">
              <div>
                <p className="text-[10px] text-[#555]">{transactions.length} 交易</p>
              </div>
              <div>
                <p className="text-[10px] text-[#555]">{members.length} 人</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="bg-[#141414] border-b border-[#1e1e1e]">
        <div className="max-w-md mx-auto flex">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                tab === t.key
                  ? 'text-[#ff6b2b] border-b-2 border-[#ff6b2b]'
                  : 'text-[#555]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== CONTENT ===== */}
      <div className="max-w-md mx-auto px-4 pt-3">

        {/* ===== TRANSACTIONS TAB ===== */}
        {tab === 'transactions' && (
          <div>
            {transactions.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-[#555] text-sm">未有交易記錄</p>
                <p className="text-[#444] text-xs mt-1">撳 + 新增第一筆</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="bg-[#141414] border border-[#1e1e1e] rounded-xl px-3.5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#ff6b2b]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-[#ff6b2b]">
                          {(memberMap.get(tx.payer_id) || '?').charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#e0e0e0] truncate">
                          {memberMap.get(tx.payer_id) || '未知'}
                        </p>
                        <p className="text-[10px] text-[#555] truncate">
                          {tx.description || '冇備註'} · {new Date(tx.created_at).toLocaleDateString('zh-HK')}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#ff6b2b] tabular-nums ml-3 flex-shrink-0">
                      ¥{Number(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* FAB */}
            <button
              onClick={() => setShowAddTx(true)}
              className="fixed bottom-5 right-5 w-11 h-11 bg-[#ff6b2b] hover:bg-[#ff7f47] text-white rounded-xl flex items-center justify-center text-lg transition-all active:scale-95 shadow-lg shadow-black/40"
            >
              +
            </button>
          </div>
        )}

        {/* ===== BALANCES TAB (with spending rings) ===== */}
        {tab === 'balances' && (
          <div className="space-y-2">
            {members.map(member => {
              const spent = memberSpending.get(member.id) || 0;
              const balance = balances.get(member.id) || 0;
              return (
                <MemberSpendingCard
                  key={member.id}
                  member={member}
                  spent={spent}
                  total={totalSpent}
                  balance={balance}
                  memberName={memberMap.get(member.id) || '未知'}
                />
              );
            })}

            {/* Settlements */}
            {settlements.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#1e1e1e]">
                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">建議還款</p>
                <div className="space-y-1.5">
                  {settlements.map((s, i) => (
                    <div key={i} className="bg-[#141414] border border-[#1e1e1e] rounded-lg px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[#e0e0e0]">{s.fromName}</span>
                        <span className="text-[#ff6b2b]">→</span>
                        <span className="text-[#e0e0e0]">{s.toName}</span>
                      </div>
                      <span className="text-xs font-semibold text-[#ff6b2b] tabular-nums">
                        ¥{s.amount.toLocaleString()}
                      </span>
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
            <div className="bg-[#141414] border border-[#1e1e1e] rounded-xl p-4 space-y-3 mb-4">
              <p className="text-[10px] text-[#555] uppercase tracking-wider">記錄還款</p>

              <div>
                <label className="text-[#555] text-[10px] mb-1 block">邊個還錢</label>
                <select
                  value={settleFrom}
                  onChange={e => setSettleFrom(e.target.value)}
                  className="w-full bg-[#0c0c0c] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e0e0e0] focus:border-[#ff6b2b]/40 focus:outline-none"
                >
                  <option value="">揀人</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[#555] text-[10px] mb-1 block">還俾邊個</label>
                <select
                  value={settleTo}
                  onChange={e => setSettleTo(e.target.value)}
                  className="w-full bg-[#0c0c0c] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e0e0e0] focus:border-[#ff6b2b]/40 focus:outline-none"
                >
                  <option value="">揀人</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[#555] text-[10px] mb-1 block">金額</label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={e => setSettleAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#0c0c0c] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e0e0e0] placeholder-[#444] focus:border-[#ff6b2b]/40 focus:outline-none"
                />
              </div>
              <button
                onClick={handleSettle}
                disabled={settleSubmitting}
                className="w-full bg-[#ff6b2b] hover:bg-[#ff7f47] text-white rounded-lg py-2.5 font-semibold text-sm disabled:opacity-30 transition-all active:scale-[0.98]"
              >
                {settleSubmitting ? '記錄中...' : '確認'}
              </button>
            </div>

            {payments.length > 0 && (
              <div>
                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">還款記錄</p>
                <div className="space-y-1.5">
                  {payments.map(p => (
                    <div key={p.id} className="bg-[#141414] border border-[#1e1e1e] rounded-lg px-3 py-2 flex items-center justify-between">
                      <p className="text-xs text-[#e0e0e0]">
                        {memberMap.get(p.from_member_id)} → {memberMap.get(p.to_member_id)}
                      </p>
                      <span className="text-xs font-semibold text-[#22c55e] tabular-nums">
                        ¥{Number(p.amount).toLocaleString()}
                      </span>
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-[#141414] w-full max-w-md rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto border-t border-[#1e1e1e]">
            <div className="w-8 h-0.5 bg-[#333] rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-[#e0e0e0]">新增交易</h2>
              <button onClick={() => setShowAddTx(false)} className="text-[#555] text-lg hover:text-[#e0e0e0] transition-colors">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[#555] text-[10px] mb-1 block">邊個付錢</label>
                <select
                  value={txPayer}
                  onChange={e => setTxPayer(e.target.value)}
                  className="w-full bg-[#0c0c0c] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e0e0e0] focus:border-[#ff6b2b]/40 focus:outline-none"
                >
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[#555] text-[10px] mb-1 block">金額（¥）</label>
                <input
                  type="number"
                  value={txAmount}
                  onChange={e => setTxAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#0c0c0c] border border-[#222] rounded-lg px-3 py-2.5 text-xl font-bold text-[#ff6b2b] placeholder-[#444] focus:border-[#ff6b2b]/40 focus:outline-none tabular-nums"
                />
              </div>

              <div>
                <label className="text-[#555] text-[10px] mb-1 block">備註</label>
                <input
                  type="text"
                  value={txDesc}
                  onChange={e => setTxDesc(e.target.value)}
                  placeholder="例如：午餐、車費..."
                  className="w-full bg-[#0c0c0c] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#e0e0e0] placeholder-[#444] focus:border-[#ff6b2b]/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#555] text-[10px] mb-1.5 block">分攤</label>
                <div className="flex flex-wrap gap-1.5">
                  {members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => toggleForWhom(m.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        txForWhom.includes(m.id)
                          ? 'bg-[#ff6b2b] text-white'
                          : 'bg-[#0c0c0c] text-[#555] border border-[#222]'
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
                className="w-full bg-[#ff6b2b] hover:bg-[#ff7f47] text-white rounded-lg py-3 font-semibold text-sm disabled:opacity-30 transition-all active:scale-[0.98] mt-1"
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
