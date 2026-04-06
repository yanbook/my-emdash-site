/**
 * General Settings sub-page
 *
 * Site Identity (title, tagline, URL, logo, favicon) and Reading settings
 * (posts per page, date format, timezone).
 */

import { Button, Input, Label } from "@cloudflare/kumo";
import {
	ArrowLeft,
	FloppyDisk,
	CheckCircle,
	WarningCircle,
	Upload,
	X,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as React from "react";

import { fetchSettings, updateSettings, type SiteSettings, type MediaItem } from "../../lib/api";
import { useT } from "../../i18n";
import { MediaPickerModal } from "../MediaPickerModal";

export function GeneralSettings() {
	const t = useT();
	const queryClient = useQueryClient();

	const { data: settings, isLoading } = useQuery({
		queryKey: ["settings"],
		queryFn: fetchSettings,
		staleTime: Infinity,
	});

	const [formData, setFormData] = React.useState<Partial<SiteSettings>>({});
	const [saveStatus, setSaveStatus] = React.useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const [logoPickerOpen, setLogoPickerOpen] = React.useState(false);
	const [faviconPickerOpen, setFaviconPickerOpen] = React.useState(false);

	React.useEffect(() => {
		if (settings) setFormData(settings);
	}, [settings]);

	React.useEffect(() => {
		if (saveStatus) {
			const timer = setTimeout(setSaveStatus, 3000, null);
			return () => clearTimeout(timer);
		}
	}, [saveStatus]);

	const saveMutation = useMutation({
		mutationFn: (data: Partial<SiteSettings>) => updateSettings(data),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			setSaveStatus({ type: "success", message: t("generalSettings.settingsSaved") });
		},
		onError: (error) => {
			setSaveStatus({
				type: "error",
				message: error instanceof Error ? error.message : t("generalSettings.failedToSave"),
			});
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		saveMutation.mutate(formData);
	};

	const handleChange = (key: keyof SiteSettings, value: unknown) => {
		setFormData((prev) => ({ ...prev, [key]: value }));
	};

	const handleLogoSelect = (media: MediaItem) => {
		setFormData((prev) => ({
			...prev,
			logo: { mediaId: media.id, alt: media.alt || "", url: media.url },
		}));
		setLogoPickerOpen(false);
	};

	const handleFaviconSelect = (media: MediaItem) => {
		setFormData((prev) => ({
			...prev,
			favicon: { mediaId: media.id, url: media.url },
		}));
		setFaviconPickerOpen(false);
	};

	const handleLogoRemove = () => {
		setFormData((prev) => ({ ...prev, logo: undefined }));
	};

	const handleFaviconRemove = () => {
		setFormData((prev) => ({ ...prev, favicon: undefined }));
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-3">
					<Link to="/settings">
						<Button variant="ghost" shape="square" aria-label={t("generalSettings.title")}>
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<h1 className="text-2xl font-bold">{t("generalSettings.title")}</h1>
				</div>
				<div className="rounded-lg border bg-kumo-base p-6">
					<p className="text-kumo-subtle">{t("generalSettings.loadingSettings")}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Link to="/settings">
					<Button variant="ghost" shape="square" aria-label={t("generalSettings.title")}>
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<h1 className="text-2xl font-bold">{t("generalSettings.title")}</h1>
			</div>

			{/* Status banner */}
			{saveStatus && (
				<div
					className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
						saveStatus.type === "success"
							? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
							: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
					}`}
				>
					{saveStatus.type === "success" ? (
						<CheckCircle className="h-4 w-4 flex-shrink-0" />
					) : (
						<WarningCircle className="h-4 w-4 flex-shrink-0" />
					)}
					{saveStatus.message}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Site Identity */}
				<div className="rounded-lg border bg-kumo-base p-6">
					<h2 className="mb-4 text-lg font-semibold">{t("generalSettings.siteIdentity")}</h2>
					<div className="space-y-4">
						<Input
							label={t("generalSettings.siteTitle")}
							value={formData.title || ""}
							onChange={(e) => handleChange("title", e.target.value)}
							description={t("generalSettings.siteTitleDescription")}
						/>
						<Input
							label={t("generalSettings.tagline")}
							value={formData.tagline || ""}
							onChange={(e) => handleChange("tagline", e.target.value)}
							description={t("generalSettings.taglineDescription")}
						/>
						<Input
							label={t("generalSettings.siteUrl")}
							type="url"
							value={formData.url || ""}
							onChange={(e) => handleChange("url", e.target.value)}
							description={t("generalSettings.siteUrlDescription")}
						/>

						{/* Logo Picker */}
						<div>
							<Label>{t("generalSettings.logo")}</Label>
							{formData.logo?.url ? (
								<div className="mt-2 space-y-2">
									<img
										src={formData.logo.url}
										alt={formData.logo.alt || "Logo"}
										className="h-16 rounded border bg-kumo-tint object-contain p-2"
									/>
									<div className="flex gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											icon={<Upload />}
											onClick={() => setLogoPickerOpen(true)}
										>
											{t("generalSettings.changeLogo")}
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											icon={<X />}
											onClick={handleLogoRemove}
										>
											{t("generalSettings.removeLogo")}
										</Button>
									</div>
								</div>
							) : (
								<Button
									type="button"
									variant="outline"
									icon={<Upload />}
									onClick={() => setLogoPickerOpen(true)}
									className="mt-2"
								>
									{t("generalSettings.selectLogo")}
								</Button>
							)}
						</div>

						{/* Favicon Picker */}
						<div>
							<Label>{t("generalSettings.favicon")}</Label>
							{formData.favicon?.url ? (
								<div className="mt-2 space-y-2">
									<img
										src={formData.favicon.url}
										alt="Favicon"
										className="h-8 w-8 rounded border bg-kumo-tint object-contain p-1"
									/>
									<div className="flex gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											icon={<Upload />}
											onClick={() => setFaviconPickerOpen(true)}
										>
											{t("generalSettings.changeFavicon")}
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											icon={<X />}
											onClick={handleFaviconRemove}
										>
											{t("generalSettings.removeFavicon")}
										</Button>
									</div>
								</div>
							) : (
								<Button
									type="button"
									variant="outline"
									icon={<Upload />}
									onClick={() => setFaviconPickerOpen(true)}
									className="mt-2"
								>
									{t("generalSettings.selectFavicon")}
								</Button>
							)}
						</div>
					</div>
				</div>

				{/* Reading Settings */}
				<div className="rounded-lg border bg-kumo-base p-6">
					<h2 className="mb-4 text-lg font-semibold">{t("generalSettings.reading")}</h2>
					<div className="space-y-4">
						<Input
							label={t("generalSettings.postsPerPage")}
							type="number"
							value={formData.postsPerPage || 10}
							onChange={(e) => handleChange("postsPerPage", parseInt(e.target.value, 10))}
							min={1}
							max={100}
							description={t("generalSettings.postsPerPageDescription")}
						/>
						<Input
							label={t("generalSettings.dateFormat")}
							value={formData.dateFormat || "MMMM d, yyyy"}
							onChange={(e) => handleChange("dateFormat", e.target.value)}
							description={t("generalSettings.dateFormatDescription", { format: formData.dateFormat || "MMMM d, yyyy" })}
						/>
						<Input
							label={t("generalSettings.timezone")}
							value={formData.timezone || "UTC"}
							onChange={(e) => handleChange("timezone", e.target.value)}
							description={t("generalSettings.timezoneDescription")}
						/>
					</div>
				</div>

				{/* Save Button */}
				<div className="flex justify-end">
					<Button type="submit" disabled={saveMutation.isPending} icon={<FloppyDisk />}>
						{saveMutation.isPending ? t("common.saving") : t("generalSettings.saveSettings")}
					</Button>
				</div>
			</form>

			{/* Media Picker Modals */}
			<MediaPickerModal
				open={logoPickerOpen}
				onOpenChange={setLogoPickerOpen}
				onSelect={handleLogoSelect}
				mimeTypeFilter="image/"
				title={t("generalSettings.selectLogo")}
			/>
			<MediaPickerModal
				open={faviconPickerOpen}
				onOpenChange={setFaviconPickerOpen}
				onSelect={handleFaviconSelect}
				mimeTypeFilter="image/"
				title={t("generalSettings.selectFavicon")}
			/>
		</div>
	);
}

export default GeneralSettings;
