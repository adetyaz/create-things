/** Credits ledger, AI quota and Sui payments. */
import { bigint, date, index, integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { id, userId, stamp, createdAt, at } from './columns';
import { ledgerReason, suiCoin, paymentPurpose } from './enums';

/** Append-only. Balance changes are written here and to `credit_balances` in one transaction. */
export const creditLedger = pgTable(
	'credit_ledger',
	{
		id: id(),
		userId: userId(),
		delta: integer('delta').notNull(),
		reason: ledgerReason('reason').notNull(),
		ref: text('ref'),
		createdAt: createdAt()
	},
	(t) => [index('credit_ledger_user_idx').on(t.userId, t.createdAt)]
);

export const creditBalances = pgTable('credit_balances', {
	userId: text('user_id').primaryKey(),
	balance: integer('balance').notNull().default(0),
	updatedAt: stamp('updated_at')
});

export const aiUsageDaily = pgTable(
	'ai_usage_daily',
	{
		userId: userId(),
		day: date('day').notNull(),
		freeUsed: integer('free_used').notNull().default(0)
	},
	(t) => [primaryKey({ columns: [t.userId, t.day] })]
);

export const suiPayments = pgTable('sui_payments', {
	id: id(),
	userId: userId(),
	txDigest: text('tx_digest').notNull().unique(),
	/** Raw coin units (USDC has 6 decimals, SUI has 9). */
	amount: bigint('amount', { mode: 'bigint' }).notNull(),
	coin: suiCoin('coin').notNull(),
	purpose: paymentPurpose('purpose').notNull(),
	confirmedAt: at('confirmed_at'),
	createdAt: createdAt()
});
