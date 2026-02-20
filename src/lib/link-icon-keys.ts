export const LINK_ICON_KEYS = [
	"globe",
	"link-2",
	"house",
	"mail",
	"phone",
	"message-circle",
	"calendar",
	"shopping-bag",
	"badge-dollar-sign",
	"ticket",
	"podcast",
	"music",
	"video",
	"camera",
	"newspaper",
	"file-text",
	"map-pin",
	"gamepad-2",
	"book-open",
	"rss",
	"instagram",
	"youtube",
	"x",
	"facebook",
	"linkedin",
	"github",
	"twitch",
	"slack",
	"figma",
	"dribbble",
] as const

export type LinkIconKey = (typeof LINK_ICON_KEYS)[number]

const linkIconKeySet = new Set<string>(LINK_ICON_KEYS)

export function isLinkIconKey(value: string): value is LinkIconKey {
	return linkIconKeySet.has(value)
}
