import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";

function key() {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (!secret || secret.length < 32)
		throw new Error(
			"A stable authentication secret is required for provider connections",
		);
	return createHash("sha256").update(`llink/provider/v1/${secret}`).digest();
}
export function encryptCredential(value: string, profileId: string) {
	const iv = randomBytes(12),
		cipher = createCipheriv("aes-256-gcm", key(), iv);
	cipher.setAAD(Buffer.from(profileId));
	const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
	return [
		"v1",
		iv.toString("base64url"),
		cipher.getAuthTag().toString("base64url"),
		body.toString("base64url"),
	].join(".");
}
export function decryptCredential(value: string, profileId: string) {
	const [version, iv, tag, body] = value.split(".");
	if (version !== "v1" || !iv || !tag || !body)
		throw new Error("Invalid provider credential");
	const cipher = createDecipheriv(
		"aes-256-gcm",
		key(),
		Buffer.from(iv, "base64url"),
	);
	cipher.setAAD(Buffer.from(profileId));
	cipher.setAuthTag(Buffer.from(tag, "base64url"));
	return Buffer.concat([
		cipher.update(Buffer.from(body, "base64url")),
		cipher.final(),
	]).toString("utf8");
}
