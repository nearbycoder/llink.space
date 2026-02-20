import type { LucideIcon } from "lucide-react"
import {
	BadgeDollarSign,
	BookOpen,
	Camera,
	Calendar,
	Dribbble,
	Facebook,
	Figma,
	FileText,
	Gamepad2,
	Github,
	Globe,
	House,
	Instagram,
	Link2,
	Linkedin,
	Mail,
	MapPin,
	MessageCircle,
	Music,
	Newspaper,
	Phone,
	Podcast,
	Rss,
	ShoppingBag,
	Slack,
	Ticket,
	Twitch,
	Video,
	X,
	Youtube,
} from "lucide-react"

import type { LinkIconKey } from "#/lib/link-icon-keys"

export interface LinkIconOption {
	key: LinkIconKey
	label: string
	Icon: LucideIcon
}

export const LINK_ICON_OPTIONS: LinkIconOption[] = [
	{ key: "globe", label: "Website", Icon: Globe },
	{ key: "link-2", label: "Link", Icon: Link2 },
	{ key: "house", label: "Home", Icon: House },
	{ key: "mail", label: "Email", Icon: Mail },
	{ key: "phone", label: "Phone", Icon: Phone },
	{ key: "message-circle", label: "Chat", Icon: MessageCircle },
	{ key: "calendar", label: "Schedule", Icon: Calendar },
	{ key: "shopping-bag", label: "Shop", Icon: ShoppingBag },
	{ key: "badge-dollar-sign", label: "Donate", Icon: BadgeDollarSign },
	{ key: "ticket", label: "Tickets", Icon: Ticket },
	{ key: "podcast", label: "Podcast", Icon: Podcast },
	{ key: "music", label: "Music", Icon: Music },
	{ key: "video", label: "Video", Icon: Video },
	{ key: "camera", label: "Photos", Icon: Camera },
	{ key: "newspaper", label: "News", Icon: Newspaper },
	{ key: "file-text", label: "Articles", Icon: FileText },
	{ key: "map-pin", label: "Location", Icon: MapPin },
	{ key: "gamepad-2", label: "Gaming", Icon: Gamepad2 },
	{ key: "book-open", label: "Courses", Icon: BookOpen },
	{ key: "rss", label: "Updates", Icon: Rss },
	{ key: "instagram", label: "Instagram", Icon: Instagram },
	{ key: "youtube", label: "YouTube", Icon: Youtube },
	{ key: "x", label: "X", Icon: X },
	{ key: "facebook", label: "Facebook", Icon: Facebook },
	{ key: "linkedin", label: "LinkedIn", Icon: Linkedin },
	{ key: "github", label: "GitHub", Icon: Github },
	{ key: "twitch", label: "Twitch", Icon: Twitch },
	{ key: "slack", label: "Slack", Icon: Slack },
	{ key: "figma", label: "Figma", Icon: Figma },
	{ key: "dribbble", label: "Dribbble", Icon: Dribbble },
]

export const LINK_ICON_OPTIONS_BY_KEY: Record<LinkIconKey, LinkIconOption> =
	Object.fromEntries(LINK_ICON_OPTIONS.map((option) => [option.key, option])) as Record<
		LinkIconKey,
		LinkIconOption
	>
