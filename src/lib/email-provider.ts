async function brevo(path: string, key: string, body?: unknown) {
	const response = await fetch(`https://api.brevo.com/v3/${path}`, {
		method: body ? "POST" : "GET",
		headers: { "api-key": key, "content-type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
		signal: AbortSignal.timeout(8000),
		redirect: "error",
	});
	await response.body?.cancel();
	if (!response.ok)
		throw new Error(`Email provider returned ${response.status}`);
}
export async function verifyEmailProvider(key: string, listId: number) {
	await brevo(`contacts/lists/${listId}`, key);
}
export async function syncEmailContact(
	key: string,
	listId: number,
	email: string,
) {
	// Do not reset provider-side unsubscribe/blacklist preferences.
	await brevo("contacts", key, {
		email,
		listIds: [listId],
		updateEnabled: true,
	});
}

export async function removeEmailContact(
	key: string,
	listId: number,
	email: string,
) {
	await brevo(`contacts/lists/${listId}/contacts/remove`, key, {
		emails: [email],
	});
}
