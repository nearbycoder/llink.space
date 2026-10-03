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
				name: "Audio blocks",
				description:
					"Share a direct audio file with a native player. Visitors choose when to press play.",
			},
			{
				name: "Call-to-action blocks",
				description:
					"Add a prominent website link with a label and supporting text.",
			},
			{
				name: "Divider blocks",
				description:
					"Give your page a little breathing room with a line and an optional label.",
			},
			{
				name: "Code snippets",
				description:
					"Publish plain code as text, with a copy button. Nothing is executed.",
			},
			{
				name: "Visitor checklists",
				description:
					"Share up to 30 items that visitors can check off during their visit.",
			},
			{
				name: "Business hours",
				description:
					"Display opening hours by weekday, with an explicit time zone.",
			},
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
				name: "Batch duplication",
				description:
					"Copy up to 50 links into paused drafts, keeping their sections and card content.",
			},
			{
				name: "Batch scheduling",
				description:
					"Set publish and expiry times together. Preview the schedule and choose whether to activate paused links.",
			},
			{
				name: "Batch descriptions",
				description:
					"Update or clear descriptions across a selection in one validated save.",
			},
			{
				name: "Batch icon styling",
				description: "Give selected links a shared icon and background color.",
			},
			{
				name: "Find and replace titles",
				description:
					"Preview literal title replacements across selected links before applying them.",
			},
			{
				name: "Find and replace destinations",
				description:
					"Update destination text across a selection. Invalid results block the entire save.",
			},
			{
				name: "Batch tracking cleanup",
				description:
					"Preview the removal of attribution parameters while keeping destination parameters and fragments.",
			},
			{
				name: "Save sorted page order",
				description:
					"Preview an alphabetical or date-based order, then save it within each section.",
			},
			{
				name: "Bookmark HTML import",
				description:
					"Bring up to 50 browser bookmarks into paused drafts, with title and URL validation.",
			},
			{
				name: "JSON catalog import",
				description:
					"Import titles, destinations, descriptions and icons from a validated JSON file. Duplicates are skipped.",
			},
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
				name: "JSON catalog export",
				description:
					"Download a portable catalog of your links, descriptions, icons and section labels.",
			},
			{
				name: "Website badges",
				description:
					"Customize a badge that links to your page. Copy its HTML or download it for your website.",
			},
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
	{
		id: "insights",
		label: "Understand your audience",
		eyebrow: "05 / Insights",
		color: "#DAE5D3",
		intro: "See which devices people use and when your links get attention.",
		features: [
			{
				name: "Device breakdown",
				description:
					"Compare mobile, desktop, tablet and unknown-device clicks for your selected range, then export the counts.",
			},
			{
				name: "Weekly click heatmap",
				description:
					"Explore every weekday and hour in UTC. Find busy periods and export all 168 time buckets.",
			},
		],
	},
] as const;
