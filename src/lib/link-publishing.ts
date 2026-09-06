export interface LinkSchedule {
	isActive?: boolean | null;
	publishAt?: string | null;
	expireAt?: string | null;
}
export function isLinkPublished(link: LinkSchedule, now = Date.now()) {
	return (
		link.isActive === true &&
		(!link.publishAt || Date.parse(link.publishAt) <= now) &&
		(!link.expireAt || Date.parse(link.expireAt) > now)
	);
}
export function validSchedule(link: LinkSchedule) {
	return (
		!link.publishAt ||
		!link.expireAt ||
		Date.parse(link.expireAt) > Date.parse(link.publishAt)
	);
}
export function localDateInput(value?: string | null) {
	if (!value) return "";
	const date = new Date(value);
	return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
		.toISOString()
		.slice(0, 16);
}
export function publishingStatus(link: LinkSchedule) {
	if (!link.isActive) return "Paused";
	if (link.expireAt && Date.parse(link.expireAt) <= Date.now())
		return "Expired";
	if (link.publishAt && Date.parse(link.publishAt) > Date.now())
		return "Scheduled";
	return "Live";
}
