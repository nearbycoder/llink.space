import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { readableTextColor } from "#/lib/utils";

interface Profile {
	username: string;
	displayName: string | null;
	bio: string | null;
	avatarUrl: string | null;
}

interface ProfileHeaderProps {
	fontFamily?: string;
	accentColor?: string;
	profile: Profile;
	textColor?: string;
	mutedTextColor?: string;
}

export function ProfileHeader({
	profile,
	fontFamily,
	accentColor = "#FF5F1F",
	textColor = "#16140F",
	mutedTextColor = "#5F5A51",
}: ProfileHeaderProps) {
	const initial = (profile.displayName?.trim() || profile.username)
		.charAt(0)
		.toUpperCase();
	return (
		<div className="mb-7 flex flex-col items-center text-center">
			<div
				className="mb-5 rounded-full p-1"
				style={{
					background: `conic-gradient(from 210deg, ${accentColor}, color-mix(in srgb, ${accentColor} 25%, transparent), ${accentColor})`,
				}}
			>
				<Avatar
					className="size-[5.5rem] border-[3px]"
					style={{ borderColor: "var(--public-card-bg, #fff)" }}
				>
					<AvatarImage
						src={profile.avatarUrl ?? undefined}
						alt={`${profile.displayName ?? profile.username} avatar`}
						loading="eager"
						fetchPriority="high"
						decoding="async"
					/>
					<AvatarFallback
						className="text-[2rem] font-semibold"
						style={{
							backgroundColor: accentColor,
							color: /^#[0-9a-f]{6}$/i.test(accentColor)
								? readableTextColor(accentColor)
								: "#16140F",
							fontFamily: "var(--type-display)",
						}}
					>
						{initial}
					</AvatarFallback>
				</Avatar>
			</div>

			<h1
				className="text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.025em] text-balance"
				style={{
					color: textColor,
					fontFamily: fontFamily ?? "var(--type-display)",
				}}
			>
				{profile.displayName ?? profile.username}
			</h1>
			<p
				className="mt-1.5 font-mono text-xs tracking-tight"
				style={{ color: mutedTextColor }}
			>
				@{profile.username}
			</p>

			{profile.bio && (
				<p
					className="mt-3.5 w-full max-w-sm text-center text-[15px] leading-relaxed text-pretty"
					style={{ color: mutedTextColor }}
				>
					{profile.bio}
				</p>
			)}
		</div>
	);
}
