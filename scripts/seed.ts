import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { account, user } from "../src/db/auth-schema.ts";
import { clickEvents, links, linkSections, profiles } from "../src/db/schema.ts";

config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is not configured");
}

const SEED_PASSWORD = "SeedPassword123!";
const ICON_BG_COLORS = [
	"#F5FF7B",
	"#8AE1E7",
	"#F2B7E2",
	"#FF8A4C",
	"#BFE3FF",
	"#DFFCD2",
];

const seedProfiles = [
	{
		username: "alexstudio",
		displayName: "Alex Studio",
		bio: "Design drops, tutorials, and weekly resources for creators.",
		linkCount: 120,
		theme: "default",
		sectionTitles: ["Featured", "Design Tools", "Tutorials", "Community"],
	},
	{
		username: "maya.codes",
		displayName: "Maya Codes",
		bio: "Frontend engineer sharing UI experiments, talks, and templates.",
		linkCount: 95,
		theme: "sunset",
		sectionTitles: ["Now Shipping", "Code Labs", "Talks", "Downloads"],
	},
	{
		username: "noahfitness",
		displayName: "Noah Fitness",
		bio: "Training plans, nutrition notes, and coaching links.",
		linkCount: 85,
		theme: "mint",
		sectionTitles: ["Coaching", "Workouts", "Nutrition", "Recovery"],
	},
	{
		username: "luna.market",
		displayName: "Luna Market",
		bio: "Product launches, community links, and campaign pages.",
		linkCount: 75,
		theme: "ocean",
		sectionTitles: ["Launches", "Collections", "Community", "Support"],
	},
];

const linkTitlePrefixes = [
	"New release",
	"Starter guide",
	"Tool stack",
	"Newsletter",
	"Community",
	"Case study",
	"Template pack",
	"Video breakdown",
	"Live session",
	"Partner offer",
];

const linkDescriptionPrefixes = [
	"Updated weekly",
	"Most visited",
	"Beginner friendly",
	"In-depth walkthrough",
	"Top converting page",
	"Limited-time campaign",
	"Fan favorite",
	"Featured content",
];

function buildLinkRows(
	profileId: string,
	username: string,
	count: number,
	sectionIds: string[],
) {
	const unsectionedCount = Math.max(2, Math.floor(count * 0.07));

	return Array.from({ length: count }, (_, index) => {
		const titlePrefix = linkTitlePrefixes[index % linkTitlePrefixes.length];
		const descriptionPrefix =
			linkDescriptionPrefixes[index % linkDescriptionPrefixes.length];
		const color = ICON_BG_COLORS[index % ICON_BG_COLORS.length];
		const itemNumber = index + 1;
		const sectionId =
			index < unsectionedCount
				? null
				: sectionIds[(index - unsectionedCount) % sectionIds.length] ?? null;

		return {
			profileId,
			sectionId,
			title: `${titlePrefix} #${itemNumber}`,
			url: `https://example.com/${encodeURIComponent(username)}/link-${itemNumber}`,
			description: `${descriptionPrefix} - ${username}`,
			iconUrl: null,
			iconBgColor: color,
			isActive: true,
			sortOrder: index,
		};
	});
}

function buildClickRows(profileId: string, linkIds: string[]) {
	const maxLinksToUse = Math.min(linkIds.length, 25);
	const selectedIds = linkIds.slice(0, maxLinksToUse);
	const eventsPerLink = 8;
	const rows: Array<(typeof clickEvents.$inferInsert) & { clickedAt: Date }> = [];
	const now = Date.now();

	selectedIds.forEach((linkId, linkIndex) => {
		for (let eventIndex = 0; eventIndex < eventsPerLink; eventIndex += 1) {
			const minutesAgo = linkIndex * 12 + eventIndex * 19;
			rows.push({
				linkId,
				profileId,
				referrer:
					eventIndex % 3 === 0
						? "https://instagram.com"
						: eventIndex % 3 === 1
							? "https://youtube.com"
							: "",
				userAgent: "seed-script",
				country: eventIndex % 2 === 0 ? "US" : "CA",
				clickedAt: new Date(now - minutesAgo * 60_000),
			});
		}
	});

	return rows;
}

async function main() {
	const pool = new Pool({ connectionString: databaseUrl });
	const db = drizzle(pool);

	try {
		console.log("Resetting database tables...");
		await db.execute(sql`
			TRUNCATE TABLE
				"click_events",
				"link_sections",
				"links",
				"profiles",
				"session",
				"account",
				"verification",
				"user"
			RESTART IDENTITY CASCADE
		`);

		console.log("Seeding users, profiles, and links...");
		const hashedPassword = await hashPassword(SEED_PASSWORD);

		for (const [index, profileSeed] of seedProfiles.entries()) {
			const userId = `seed-user-${index + 1}`;
			const accountId = `seed-account-${index + 1}`;
			const now = new Date();

			await db.insert(user).values({
				id: userId,
				name: profileSeed.displayName,
				email: `${profileSeed.username}@seed.llink.space`,
				emailVerified: true,
				image: null,
				createdAt: now,
				updatedAt: now,
			});

			await db.insert(account).values({
				id: accountId,
				accountId: userId,
				providerId: "credential",
				userId,
				password: hashedPassword,
				createdAt: now,
				updatedAt: now,
			});

			const [insertedProfile] = await db
				.insert(profiles)
				.values({
					userId,
					username: profileSeed.username,
					displayName: profileSeed.displayName,
					bio: profileSeed.bio,
					avatarUrl: null,
					theme: profileSeed.theme,
					createdAt: now,
					updatedAt: now,
				})
				.returning({ id: profiles.id });

			if (!insertedProfile?.id) {
				throw new Error(`Failed to insert profile for ${profileSeed.username}`);
			}

			const insertedSections = await db
				.insert(linkSections)
				.values(
					profileSeed.sectionTitles.map((title, sortOrder) => ({
						profileId: insertedProfile.id,
						title,
						sortOrder,
						createdAt: now,
						updatedAt: now,
					})),
				)
				.returning({ id: linkSections.id });

			const sectionIds = insertedSections.map((section) => section.id);

			const insertedLinks = await db
				.insert(links)
				.values(
					buildLinkRows(
						insertedProfile.id,
						profileSeed.username,
						profileSeed.linkCount,
						sectionIds,
					),
				)
				.returning({ id: links.id });

			const clickRows = buildClickRows(
				insertedProfile.id,
				insertedLinks.map((link) => link.id),
			);
			if (clickRows.length > 0) {
				await db.insert(clickEvents).values(clickRows);
			}
		}

		console.log("Seed complete.");
		console.log("");
		console.log("Seed credentials (all users share this password):");
		console.log(`password: ${SEED_PASSWORD}`);
		console.log("");
		for (const profileSeed of seedProfiles) {
			console.log(
				`${profileSeed.username}@seed.llink.space -> /u/${profileSeed.username} (${profileSeed.linkCount} links)`,
			);
		}
	} finally {
		await pool.end();
	}
}

main().catch((error) => {
	console.error("Seed failed:", error);
	process.exit(1);
});
