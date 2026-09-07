export const featureGroups = [
	{
		id: "design",
		label: "Make it yours",
		eyebrow: "01 / Create",
		color: "#E9EDB5",
		intro:
			"A page with your personality. Room to experiment before anything goes live.",
		features: [
			{
				name: "Design undo & redo",
				description:
					"Step back through up to 50 draft changes, then redo the ones you love.",
			},
			{
				name: "Style backups",
				description:
					"Download your theme and content blocks as a file. Validate and preview a restore before publishing.",
			},
			{
				name: "Content block duplication",
				description:
					"Copy a block with its placement intact, then edit the copy independently.",
			},
			{
				name: "FAQ blocks",
				description:
					"Give common questions a home with keyboard-accessible, expandable answers.",
			},
			{
				name: "Quotes & testimonials",
				description:
					"Publish a quote with attribution and an optional link to its source.",
			},
			{
				name: "Event blocks",
				description:
					"Share event details in your visitor’s time zone, with a downloadable calendar entry.",
			},
		],
	},
	{
		id: "manage",
		label: "Keep it together",
		eyebrow: "02 / Organize",
		color: "#C5E6E9",
		intro:
			"Less hunting through links. More control over what goes out, and when.",
		features: [
			{
				name: "Campaign URL builder",
				description:
					"Add campaign tracking parameters, preview the finished URL, and apply it to your link.",
			},
			{
				name: "Duplicate destination review",
				description:
					"Spot links to the same destination, including tracking variants. Choose what to edit; nothing is deleted automatically.",
			},
			{
				name: "Publishing calendar",
				description:
					"Review upcoming start and expiry dates over 7, 30, or 90 days. Export them to your calendar.",
			},
			{
				name: "Saved filter views",
				description:
					"Name and restore up to 10 combinations of search, status, and section filters. Saved in this browser.",
			},
			{
				name: "Dashboard sorting",
				description:
					"Sort by title or creation date within each section. Your public page order stays yours to arrange.",
			},
			{
				name: "Bulk URL copying",
				description:
					"Select the links you need and copy their destinations together, one URL per line.",
			},
			{
				name: "Page readiness checks",
				description:
					"Review your draft’s profile details, live links, descriptions, and text contrast before publishing.",
			},
		],
	},
	{
		id: "share",
		label: "Take it everywhere",
		eyebrow: "03 / Share",
		color: "#F1D0BF",
		intro:
			"On a poster, in a document, or in someone’s contacts. Your page travels well.",
		features: [
			{
				name: "QR share kit",
				description:
					"Download a profile QR code as a PNG or SVG for print, packaging, or your next event.",
			},
			{
				name: "Browser bookmark export",
				description:
					"Turn your links and sections into a bookmark file you can import into a browser.",
			},
			{
				name: "Markdown export",
				description:
					"Download a formatted collection of links and descriptions for documents, notes, or a repository.",
			},
			{
				name: "Contact card downloads",
				description:
					"Let visitors save your public name, bio, and page URL as a vCard. Your account email stays private.",
			},
		],
	},
	{
		id: "explore",
		label: "Make yourself easy to find",
		eyebrow: "04 / Explore",
		color: "#DCD4EC",
		intro:
			"A little less scrolling. A reason to come back. A page that works beyond the screen.",
		features: [
			{
				name: "Section jump navigation",
				description:
					"Pages with multiple visible sections get a compact menu that jumps straight to the right place.",
			},
			{
				name: "Visitor reading lists",
				description:
					"Visitors can save, revisit, remove, or clear links without an account. Lists stay in their browser, with a visible session-only fallback if storage is blocked.",
			},
			{
				name: "Print-friendly pages",
				description:
					"Print the complete link list with destination URLs and clean styling. Collapsed groups open for printing, then return to their previous state.",
			},
		],
	},
] as const;
