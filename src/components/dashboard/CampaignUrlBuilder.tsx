import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	buildCampaignUrl,
	CAMPAIGN_FIELDS,
	readCampaign,
} from "#/lib/campaign-url";
export function CampaignUrlBuilder({
	url,
	onApply,
}: {
	url: string;
	onApply: (url: string) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const [values, setValues] = useState(() => readCampaign(url));
	let result = "",
		error = "";
	try {
		result = buildCampaignUrl(url, values);
	} catch (e) {
		error = (e as Error).message;
	}
	return (
		<div className="rounded-xl border border-black/20 p-3">
			<button
				type="button"
				aria-expanded={expanded}
				className="cursor-pointer text-sm font-semibold"
				onClick={() => {
					setValues(readCampaign(url));
					setExpanded((v) => !v);
				}}
			>
				Campaign URL builder
			</button>
			{expanded && (
				<div>
					<p className="my-3 text-xs">
						Label traffic for your destination’s analytics. Empty fields remove
						existing UTM values. Changes apply to this draft only.
					</p>
					<div className="grid gap-3 sm:grid-cols-2">
						{CAMPAIGN_FIELDS.map((key) => (
							<label key={key} className="text-sm capitalize">
								{`Campaign ${key}`}
								<input
									className="mt-1 w-full rounded-lg border border-black/30 bg-white p-2 text-base"
									value={values[key]}
									maxLength={200}
									onChange={(e) =>
										setValues((v) => ({ ...v, [key]: e.target.value }))
									}
								/>
							</label>
						))}
					</div>
					{error ? (
						<p className="my-3 text-sm text-red-700" role="status">
							{error}
						</p>
					) : (
						<output
							className="my-3 block break-all text-xs"
							aria-label="Campaign URL preview"
						>
							{result}
						</output>
					)}
					<Button
						type="button"
						variant="outline"
						disabled={!!error}
						onClick={() => onApply(result)}
					>
						Apply campaign URL
					</Button>
				</div>
			)}
		</div>
	);
}
