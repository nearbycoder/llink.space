import {
	boolean,
	pgTable,
	text,
	timestamp,
	uuid,
	integer,
} from "drizzle-orm/pg-core"

export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().defaultRandom(),
	userId: text("user_id").notNull().unique(),
	username: text().notNull().unique(),
	displayName: text("display_name"),
	bio: text(),
	avatarUrl: text("avatar_url"),
	theme: text().default("default"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
})

export const links = pgTable("links", {
	id: uuid().primaryKey().defaultRandom(),
	profileId: uuid("profile_id")
		.notNull()
		.references(() => profiles.id, { onDelete: "cascade" }),
	title: text().notNull(),
	url: text().notNull(),
	description: text(),
	iconUrl: text("icon_url"),
	iconBgColor: text("icon_bg_color").notNull().default("#F5FF7B"),
	isActive: boolean("is_active").default(true),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
})

export const clickEvents = pgTable("click_events", {
	id: uuid().primaryKey().defaultRandom(),
	linkId: uuid("link_id")
		.notNull()
		.references(() => links.id, { onDelete: "cascade" }),
	profileId: uuid("profile_id")
		.notNull()
		.references(() => profiles.id, { onDelete: "cascade" }),
	referrer: text(),
	userAgent: text("user_agent"),
	country: text(),
	clickedAt: timestamp("clicked_at").defaultNow(),
})
