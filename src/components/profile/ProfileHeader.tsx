import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";

interface Profile {
	username: string;
	displayName: string | null;
	bio: string | null;
	avatarUrl: string | null;
}

interface ProfileHeaderProps {
	profile: Profile;
	textColor?: string;
	mutedTextColor?: string;
}

export function ProfileHeader({
	profile,
	textColor = "#11110F",
	mutedTextColor = "#4B4B45",
}: ProfileHeaderProps) {
	return (
		<div className="flex flex-col items-center text-center mb-8">
			<Avatar className="w-20 h-20 mb-4 border-2 border-black shadow-[3px_3px_0_0_#11110F]">
				<AvatarImage
					src={profile.avatarUrl ?? undefined}
					alt={`${profile.displayName ?? profile.username} avatar`}
					loading="eager"
					fetchPriority="high"
					decoding="async"
				/>
				<AvatarFallback
					className="text-2xl font-semibold"
					style={{ backgroundColor: "#F5FF7B", color: textColor }}
				>
					{profile.displayName?.charAt(0).toUpperCase() ??
						profile.username.charAt(0).toUpperCase()}
				</AvatarFallback>
			</Avatar>

			<h1
				className="text-2xl font-bold tracking-tight"
				style={{ color: textColor, fontFamily: "'Archivo Black', sans-serif" }}
			>
				{profile.displayName ?? profile.username}
			</h1>

			{profile.bio && (
				<p
					className="mt-2 w-full max-w-xs text-left text-sm leading-relaxed"
					style={{ color: mutedTextColor }}
				>
					{profile.bio}
				</p>
			)}
		</div>
	);
}
