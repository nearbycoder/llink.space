import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import type { ContentBlock } from "#/lib/page-design";

export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().defaultRandom(),
	userId: text("user_id").notNull().unique(),
	username: text().notNull().unique(),
	displayName: text("display_name"),
	bio: text(),
	avatarUrl: text("avatar_url"),
	pageBackgroundType: text("page_background_type")
		.notNull()
		.default("gradient"),
	pageBackgroundColor: text("page_background_color")
		.notNull()
		.default("sun-cream"),
	pageBackgroundGradient: text("page_background_gradient")
		.notNull()
		.default("kinetic-neon"),
	pageBackgroundImageUrl: text("page_background_image_url"),
	signupEnabled: boolean("signup_enabled").notNull().default(false),
	signupTitle: text("signup_title").notNull().default("Stay in the loop"),
	theme: text().default("default"),
	fontFamily: text("font_family").notNull().default("work"),
	buttonStyle: text("button_style").notNull().default("rounded"),
	accentColor: text("accent_color"),
	contentBlocks: jsonb("content_blocks")
		.$type<ContentBlock[]>()
		.notNull()
		.default([]),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export const linkSections = pgTable(
	"link_sections",
	{
		id: uuid().primaryKey().defaultRandom(),
		profileId: uuid("profile_id")
			.notNull()
			.references(() => profiles.id, { onDelete: "cascade" }),
		title: text().notNull(),
		sortOrder: integer("sort_order").default(0),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => [
		index("link_sections_profile_order_idx").on(
			table.profileId,
			table.sortOrder,
		),
	],
);

export const links = pgTable(
	"links",
	{
		id: uuid().primaryKey().defaultRandom(),
		profileId: uuid("profile_id")
			.notNull()
			.references(() => profiles.id, { onDelete: "cascade" }),
		sectionId: uuid("section_id").references(() => linkSections.id, {
			onDelete: "set null",
		}),
		title: text().notNull(),
		url: text().notNull(),
		description: text(),
		iconUrl: text("icon_url"),
		iconBgColor: text("icon_bg_color").notNull().default("#F5FF7B"),
		healthState: text("health_state"),
		healthStatusCode: integer("health_status_code"),
		healthFinalUrl: text("health_final_url"),
		healthCheckedAt: timestamp("health_checked_at", { withTimezone: true }),
		featured: boolean().notNull().default(false),
		featureImageUrl: text("feature_image_url"),
		ctaLabel: text("cta_label"),
		publishAt: timestamp("publish_at", { withTimezone: true, mode: "string" }),
		expireAt: timestamp("expire_at", { withTimezone: true, mode: "string" }),
		isActive: boolean("is_active").default(true),
		sortOrder: integer("sort_order").default(0),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at").defaultNow(),
	},
	(table) => [
		index("links_profile_order_idx").on(table.profileId, table.sortOrder),
		index("links_section_idx").on(table.sectionId),
		uniqueIndex("links_one_featured_idx")
			.on(table.profileId)
			.where(sql`${table.featured} = true`),
	],
);

export const clickEvents = pgTable(
	"click_events",
	{
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
	},
	(table) => [
		index("click_events_profile_date_idx").on(table.profileId, table.clickedAt),
		index("click_events_link_idx").on(table.linkId),
	],
);

/** Short-lived, hashed counters shared by all app instances. */
export const analyticsGuards = pgTable(
	"analytics_guards",
	{
		key: text().primaryKey(),
		count: integer().notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	},
	(table) => [index("analytics_guards_expiry_idx").on(table.expiresAt)],
);

export const subscribers = pgTable(
	"subscribers",
	{
		id: uuid().primaryKey().defaultRandom(),
		profileId: uuid("profile_id")
			.notNull()
			.references(() => profiles.id, { onDelete: "cascade" }),
		email: text().notNull(),
		name: text().notNull().default(""),
		consentText: text("consent_text").notNull(),
		consentAt: timestamp("consent_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		unsubscribeHash: text("unsubscribe_hash").notNull().unique(),
		unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
		syncedAt: timestamp("synced_at", { withTimezone: true }),
		providerRemovedAt: timestamp("provider_removed_at", { withTimezone: true }),
	},
	(t) => [
		uniqueIndex("subscribers_profile_email_idx").on(t.profileId, t.email),
		index("subscribers_profile_created_idx").on(t.profileId, t.consentAt),
	],
);
export const emailConnections = pgTable("email_connections", {
	profileId: uuid("profile_id")
		.primaryKey()
		.references(() => profiles.id, { onDelete: "cascade" }),
	encryptedKey: text("encrypted_key").notNull(),
	listId: integer("list_id").notNull(),
	syncLease: uuid("sync_lease"),
	leaseUntil: timestamp("lease_until", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
