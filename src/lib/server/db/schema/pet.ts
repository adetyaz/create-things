/** The pet, its feeds, and the item catalog. */
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { id, userId, stamp, createdAt, at } from './columns';
import { petStatus, foodSize, catalogKind, acquiredVia } from './enums';

export const pets = pgTable(
	'pets',
	{
		id: id(),
		userId: userId(),
		species: text('species').notNull(),
		breed: text('breed').notNull(),
		name: text('name').notNull(),
		sliders: jsonb('sliders').notNull().default({}),
		status: petStatus('status').notNull().default('alive'),
		growth: integer('growth').notNull().default(0),
		lastFedAt: at('last_fed_at').notNull().defaultNow(),
		foodToday: integer('food_today').notNull().default(0),
		foodTodayDate: date('food_today_date'),
		returningDays: integer('returning_days').notNull().default(0),
		bornAt: stamp('born_at'),
		diedAt: at('died_at'),
		memorialItemId: uuid('memorial_item_id'),
		paid: boolean('paid').notNull().default(false)
	},
	(t) => [index('pets_user_idx').on(t.userId)]
);

export const petFeeds = pgTable(
	'pet_feeds',
	{
		id: id(),
		petId: uuid('pet_id')
			.notNull()
			.references(() => pets.id, { onDelete: 'cascade' }),
		sourceType: text('source_type').notNull(),
		sourceId: uuid('source_id').notNull(),
		size: foodSize('size').notNull(),
		createdAt: createdAt()
	},
	// One feed per source, so the same step or session can't feed the pet twice.
	(t) => [uniqueIndex('pet_feeds_source_idx').on(t.petId, t.sourceType, t.sourceId)]
);

export const catalogItems = pgTable('catalog_items', {
	id: id(),
	kind: catalogKind('kind').notNull(),
	name: text('name').notNull(),
	slot: text('slot'),
	speciesOnly: text('species_only'),
	priceCredits: integer('price_credits'),
	earnRule: jsonb('earn_rule'),
	season: text('season'),
	availableFrom: at('available_from'),
	availableTo: at('available_to'),
	createdAt: createdAt()
});

export const userItems = pgTable(
	'user_items',
	{
		userId: userId(),
		catalogItemId: uuid('catalog_item_id')
			.notNull()
			.references(() => catalogItems.id),
		acquiredVia: acquiredVia('acquired_via').notNull(),
		equippedOnPetId: uuid('equipped_on_pet_id').references(() => pets.id, { onDelete: 'set null' }),
		acquiredAt: stamp('acquired_at')
	},
	(t) => [primaryKey({ columns: [t.userId, t.catalogItemId] })]
);
