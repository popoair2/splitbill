import { supabase } from './supabase';
import type { Group, Member, Transaction, Payment, Settlement } from './types';

// Generate a random 6-character group code
export function generateGroupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GROUPS
export async function createGroup(name: string): Promise<Group> {
  const code = generateGroupCode();
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, code })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getGroupByCode(code: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getGroup(id: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// MEMBERS
export async function createMember(groupId: string, name: string): Promise<Member> {
  const { data, error } = await supabase
    .from('members')
    .insert({ group_id: groupId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMembers(groupId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at');
  if (error) throw error;
  return data || [];
}

// TRANSACTIONS
export async function createTransaction(
  groupId: string,
  payerId: string,
  amount: number,
  description: string,
  forWhom: string[]
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      group_id: groupId,
      payer_id: payerId,
      amount,
      description,
      for_whom: forWhom,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTransactions(groupId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// PAYMENTS
export async function createPayment(
  groupId: string,
  fromMemberId: string,
  toMemberId: string,
  amount: number
): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      group_id: groupId,
      from_member_id: fromMemberId,
      to_member_id: toMemberId,
      amount,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPayments(groupId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// BALANCE CALCULATION
export function calculateBalances(
  members: Member[],
  transactions: Transaction[],
  payments: Payment[]
): Map<string, number> {
  const balances = new Map<string, number>();

  // Initialize all members with 0
  for (const member of members) {
    balances.set(member.id, 0);
  }

  // Process transactions
  for (const tx of transactions) {
    // Payer paid, so they are owed money
    const shareCount = tx.for_whom.length;
    const shareAmount = Number(tx.amount) / shareCount;

    // Payer gets credited the full amount
    const payerBalance = balances.get(tx.payer_id) || 0;
    balances.set(tx.payer_id, payerBalance + Number(tx.amount));

    // Each person in for_whom owes their share
    for (const memberId of tx.for_whom) {
      const currentBalance = balances.get(memberId) || 0;
      balances.set(memberId, currentBalance - shareAmount);
    }
  }

  // Process payments (settlements)
  for (const payment of payments) {
    const fromBalance = balances.get(payment.from_member_id) || 0;
    balances.set(payment.from_member_id, fromBalance + Number(payment.amount));

    const toBalance = balances.get(payment.to_member_id) || 0;
    balances.set(payment.to_member_id, toBalance - Number(payment.amount));
  }

  return balances;
}

// Calculate simplified settlements (who pays whom)
export function calculateSettlements(
  members: Member[],
  balances: Map<string, number>
): Settlement[] {
  const memberMap = new Map(members.map(m => [m.id, m.name]));

  // Separate into creditors (owed money) and debtors (owe money)
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [memberId, balance] of balances) {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded > 0.01) {
      creditors.push({ id: memberId, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ id: memberId, amount: -rounded });
    }
  }

  // Sort by amount (largest first)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.01) {
      settlements.push({
        fromId: debtors[i].id,
        fromName: memberMap.get(debtors[i].id) || 'Unknown',
        toId: creditors[j].id,
        toName: memberMap.get(creditors[j].id) || 'Unknown',
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}
