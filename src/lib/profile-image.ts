export const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const allowedImageMimeTypes = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
]);

export function hasExpectedImageSignature(bytes: Uint8Array, mimeType: string) {
	switch (mimeType) {
		case "image/jpeg":
			return (
				bytes.length >= 3 &&
				bytes[0] === 0xff &&
				bytes[1] === 0xd8 &&
				bytes[2] === 0xff
			);
		case "image/png":
			return (
				bytes.length >= 8 &&
				bytes[0] === 0x89 &&
				bytes[1] === 0x50 &&
				bytes[2] === 0x4e &&
				bytes[3] === 0x47 &&
				bytes[4] === 0x0d &&
				bytes[5] === 0x0a &&
				bytes[6] === 0x1a &&
				bytes[7] === 0x0a
			);
		case "image/gif":
			return (
				bytes.length >= 6 &&
				bytes[0] === 0x47 &&
				bytes[1] === 0x49 &&
				bytes[2] === 0x46 &&
				bytes[3] === 0x38 &&
				(bytes[4] === 0x37 || bytes[4] === 0x39) &&
				bytes[5] === 0x61
			);
		case "image/webp":
			return (
				bytes.length >= 12 &&
				bytes[0] === 0x52 &&
				bytes[1] === 0x49 &&
				bytes[2] === 0x46 &&
				bytes[3] === 0x46 &&
				bytes[8] === 0x57 &&
				bytes[9] === 0x45 &&
				bytes[10] === 0x42 &&
				bytes[11] === 0x50
			);
		default:
			return false;
	}
}
