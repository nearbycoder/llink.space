import { ExternalLink } from "lucide-react"
import { LinkIcon } from "#/components/links/LinkIcon"

interface LinkCardProps {
	id: string
	title: string
	url: string
	description?: string | null
	iconUrl?: string | null
	cardBg?: string
	cardBorder?: string
	textColor?: string
	mutedTextColor?: string
	onClickRecord?: (linkId: string) => void
}

export function LinkCard({
	id,
	title,
	url,
	description,
	iconUrl,
	cardBg = "#FFFFFF",
	cardBorder = "#11110F",
	textColor = "#11110F",
	mutedTextColor = "#4B4B45",
	onClickRecord,
}: LinkCardProps) {
	const handleClick = () => {
		if (onClickRecord) {
			onClickRecord(id)
		}
	}

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			onClick={handleClick}
			className="group block w-full rounded-xl border-2 px-5 py-4 transition-all shadow-[3px_3px_0_0_#11110F] hover:-translate-y-0.5 active:translate-y-0"
			style={{
				backgroundColor: cardBg,
				borderColor: cardBorder,
			}}
		>
			<div className="flex items-center justify-between">
				<div className="min-w-0 flex items-center gap-3">
					<LinkIcon iconUrl={iconUrl} />
					<div className="min-w-0">
						<p
							className="font-medium text-sm truncate"
							style={{ color: textColor }}
						>
							{title}
						</p>
						{description && (
							<p
								className="text-xs mt-0.5 truncate"
								style={{ color: mutedTextColor }}
							>
								{description}
							</p>
						)}
					</div>
				</div>
				<ExternalLink
					className="w-3.5 h-3.5 ml-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
					style={{ color: mutedTextColor }}
				/>
			</div>
		</a>
	)
}
