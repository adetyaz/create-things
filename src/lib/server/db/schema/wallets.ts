/**
 * App-managed Sui accounts: one per user per network, made by the server so users never see a
 * wallet. The secret key is encrypted at rest (SOURCE_TOKEN_KEY) and never leaves the server.
 */
import { pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { userId, createdAt } from './columns';

export const suiAccounts = pgTable(
	'sui_accounts',
	{
		userId: userId(),
		/** 'testnet' or 'mainnet'. */
		network: text('network').notNull(),
		address: text('address').notNull().unique(),
		secretEncrypted: text('secret_encrypted').notNull(),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.userId, t.network] })]
);
