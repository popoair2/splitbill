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
    // Load current member from localStorage
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

  // Initialize forWhom with all members
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const memberMap = new Map(members.map(m => [m.id, m.name]));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg">{group?.name}</h1>
              <button onClick={copyCode} className="text-sm text-blue-600 font-mono">
                Code: {groupCode} 📋
              </button>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">你係</p>
              <p className="font-semibold text-sm">{currentMember?.name || '訪客'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-lg mx-auto flex">
          {(['transactions', 'balances', 'settle'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium ${
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500'
              }`}
            >
              {t === 'transactions' ? '交易' : t === 'balances' ? '結餘' : '還款'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4">
        {/* TRANSACTIONS TAB */}
        {tab === 'transactions' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">交易記錄</h2>
              <button
                onClick={() => setShowAddTx(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                + 新增交易
              </button>
            </div>

            {transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">未有交易記錄</p>
            ) : (
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div key={tx.id} className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">
                          {memberMap.get(tx.payer_id) || '未知'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {tx.description || '冇備註'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          分攤：{(tx.for_whom || []).map(id => memberMap.get(id)).filter(Boolean).join('、')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">¥{Number(tx.amount).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(tx.created_at).toLocaleDateString('zh-HK')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BALANCES TAB */}
        {tab === 'balances' && (
          <div>
            <h2 className="font-bold mb-4">各人結餘</h2>
            <div className="space-y-3">
              {members.map(member => {
                const balance = balances.get(member.id) || 0;
                return (
                  <div key={member.id} className="bg-white rounded-xl p-4 shadow-sm border flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        balance > 0 ? 'bg-green-500' : balance < 0 ? 'bg-red-500' : 'bg-gray-400'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <span className="font-medium">{member.name}</span>
                    </div>
                    <span className={`font-bold ${
                      balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-gray-400'
                    }`}>
                      {balance > 0 ? '+' : ''}{Math.round(balance).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>

            {settlements.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold mb-3">建議還款</h3>
                <div className="space-y-2">
                  {settlements.map((s, i) => (
                    <div key={i} className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                      <p className="font-medium">
                        <span className="text-red-600">{s.fromName}</span>
                        {' → '}
                        <span className="text-green-600">{s.toName}</span>
                      </p>
                      <p className="font-bold text-lg">¥{s.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SETTLE TAB */}
        {tab === 'settle' && (
          <div>
            <h2 className="font-bold mb-4">記錄還款</h2>
            <div className="bg-white rounded-xl p-4 shadow-sm border space-y-3">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">邊個還錢</label>
                <select
                  value={settleFrom}
                  onChange={e => setSettleFrom(e.target.value)}
                  className="w-full border rounded-lg px-4 py-3 text-base"
                >
                  <option value="">揀一個人</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">還俾邊個</label>
                <select
                  value={settleTo}
                  onChange={e => setSettleTo(e.target.value)}
                  className="w-full border rounded-lg px-4 py-3 text-base"
                >
                  <option value="">揀一個人</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">金額</label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={e => setSettleAmount(e.target.value)}
                  placeholder="0"
                  className="w-full border rounded-lg px-4 py-3 text-base"
                />
              </div>
              <button
                onClick={handleSettle}
                disabled={settleSubmitting}
                className="w-full bg-green-600 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
              >
                {settleSubmitting ? '記錄中...' : '確認還款'}
              </button>
            </div>

            {/* Payment history */}
            {payments.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold mb-3">還款記錄</h3>
                <div className="space-y-2">
                  {payments.map(p => (
                    <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border">
                      <p className="font-medium">
                        {memberMap.get(p.from_member_id)} → {memberMap.get(p.to_member_id)}
                      </p>
                      <p className="font-bold">¥{Number(p.amount).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('zh-HK')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddTx && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">新增交易</h2>
              <button onClick={() => setShowAddTx(false)} className="text-gray-400 text-2xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">邊個付錢</label>
                <select
                  value={txPayer}
                  onChange={e => setTxPayer(e.target.value)}
                  className="w-full border rounded-lg px-4 py-3 text-base"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-500 mb-1 block">金額（¥）</label>
                <input
                  type="number"
                  value={txAmount}
                  onChange={e => setTxAmount(e.target.value)}
                  placeholder="0"
                  className="w-full border rounded-lg px-4 py-3 text-2xl font-bold"
                />
              </div>

              <div>
                <label className="text-sm text-gray-500 mb-1 block">備註</label>
                <input
                  type="text"
                  value={txDesc}
                  onChange={e => setTxDesc(e.target.value)}
                  placeholder="例如：午餐、車費..."
                  className="w-full border rounded-lg px-4 py-3 text-base"
                />
              </div>

              <div>
                <label className="text-sm text-gray-500 mb-2 block">邊個要分攤</label>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => toggleForWhom(m.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        txForWhom.includes(m.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
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
                className="w-full bg-blue-600 text-white rounded-lg py-4 font-semibold text-lg disabled:opacity-50"
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
