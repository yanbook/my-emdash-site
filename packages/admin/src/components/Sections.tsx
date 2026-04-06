/**
 * Sections library page component
 *
 * Browse, create, and manage reusable content sections (block patterns).
 */

import { Button, Dialog, Input, InputArea, Toast } from "@cloudflare/kumo";
import {
	Plus,
	MagnifyingGlass,
	Trash,
	PencilSimple,
	Copy,
	FolderOpen,
	Globe,
	User,
	FileArrowDown,
} from "@phosphor-icons/react";
import { X } from "@phosphor-icons/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import * as React from "react";

import {
	fetchSections,
	createSection,
	deleteSection,
	type Section,
	type SectionSource,
} from "../lib/api";
import { slugify } from "../lib/utils";
import { useT } from "../i18n";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { DialogError, getMutationError } from "./DialogError.js";

const sourceIcons: Record<SectionSource, React.ElementType> = {
	theme: Globe,
	user: User,
	import: FileArrowDown,
};

function getSourceLabels(t: ReturnType<typeof useT>): Record<SectionSource, string> {
	return {
		theme: t("sections.theme"),
		user: t("sections.custom"),
		import: t("sections.imported"),
	};
}

export function Sections() {
	const t = useT();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const toastManager = Toast.useToastManager();
	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [deleteSlug, setDeleteSlug] = React.useState<string | null>(null);
	const [searchQuery, setSearchQuery] = React.useState("");
	const [selectedSource, setSelectedSource] = React.useState<SectionSource | null>(null);

	// Create form state
	const [createTitle, setCreateTitle] = React.useState("");
	const [createSlug, setCreateSlug] = React.useState("");
	const [createDescription, setCreateDescription] = React.useState("");
	const [slugTouched, setSlugTouched] = React.useState(false);
	const [createError, setCreateError] = React.useState<string | null>(null);

	// Reset form when dialog closes
	React.useEffect(() => {
		if (!isCreateOpen) {
			setCreateTitle("");
			setCreateSlug("");
			setCreateDescription("");
			setSlugTouched(false);
			setCreateError(null);
		}
	}, [isCreateOpen]);

	const { data: sectionsData, isLoading: sectionsLoading } = useQuery({
		queryKey: ["sections", { source: selectedSource, search: searchQuery }],
		queryFn: () =>
			fetchSections({
				source: selectedSource || undefined,
				search: searchQuery || undefined,
			}),
	});
	const sections = sectionsData?.items ?? [];

	const createMutation = useMutation({
		mutationFn: createSection,
		onSuccess: (section) => {
			void queryClient.invalidateQueries({ queryKey: ["sections"] });
			setIsCreateOpen(false);
			toastManager.add({ title: t("sections.sectionCreated") });
			// Navigate to edit the new section
			void navigate({ to: "/sections/$slug", params: { slug: section.slug } });
		},
		onError: (error: Error) => {
			setCreateError(error.message);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteSection,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["sections"] });
			setDeleteSlug(null);
			toastManager.add({ title: t("sections.sectionDeleted") });
		},
	});

	const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setCreateError(null);
		createMutation.mutate({
			slug: createSlug,
			title: createTitle,
			description: createDescription || undefined,
			content: [], // Start with empty content
		});
	};

	const handleCopySlug = (slug: string) => {
		void navigator.clipboard.writeText(slug);
		toastManager.add({ title: t("sections.slugCopied") });
	};

	const sectionToDelete = sections.find((s) => s.slug === deleteSlug);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">{t("sections.title")}</h1>
					<p className="text-kumo-subtle">
						{t("sections.description")}
					</p>
				</div>
				<Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
					<Dialog.Trigger
						render={(props) => (
							<Button {...props} icon={<Plus />}>
								{t("sections.newSection")}
							</Button>
						)}
					/>
					<Dialog className="p-6" size="lg">
						<div className="flex items-start justify-between gap-4 mb-4">
							<Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
								{t("sections.createSectionDialog")}
							</Dialog.Title>
							<Dialog.Close
								aria-label={t("common.close")}
								render={(props) => (
									<Button
										{...props}
										variant="ghost"
										shape="square"
										aria-label={t("common.close")}
										className="absolute right-4 top-4"
									>
										<X className="h-4 w-4" />
										<span className="sr-only">{t("common.close")}</span>
									</Button>
								)}
							/>
						</div>
						<form onSubmit={handleCreate} className="space-y-4">
							<Input
								label={t("sections.titleField")}
								value={createTitle}
								onChange={(e) => {
									const title = e.target.value;
									setCreateTitle(title);
									if (!slugTouched && title) {
										setCreateSlug(slugify(title));
									}
								}}
								required
								placeholder={t("sections.titlePlaceholder")}
							/>
							<div>
								<Input
									label={t("sections.slugField")}
									value={createSlug}
									onChange={(e) => {
										setCreateSlug(e.target.value);
										setSlugTouched(true);
									}}
									required
									placeholder={t("sections.slugPlaceholder")}
									pattern="[a-z0-9-]+"
									title={t("sections.slugDescription")}
								/>
								<p className="text-xs text-kumo-subtle mt-1">
									{t("sections.slugDescription")}
								</p>
							</div>
							<InputArea
								label={t("sections.descriptionField")}
								value={createDescription}
								onChange={(e) => setCreateDescription(e.target.value)}
								placeholder={t("sections.descriptionPlaceholder")}
								rows={3}
							/>
							<DialogError message={createError || getMutationError(createMutation.error)} />
							<div className="flex justify-end gap-2">
								<Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
									{t("common.cancel")}
								</Button>
								<Button type="submit" disabled={createMutation.isPending}>
									{createMutation.isPending ? t("sections.creating") : t("sections.createButton")}
								</Button>
							</div>
						</form>
					</Dialog>
				</Dialog.Root>
			</div>

			{/* Filters */}
			<div className="flex items-center gap-4">
				{/* Search */}
				<div className="relative flex-1 max-w-md">
					<MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kumo-subtle" />
					<Input
						placeholder={t("sections.searchPlaceholder")}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>

				{/* Source filter */}
				<select
					value={selectedSource || ""}
					onChange={(e) => {
						const val = e.target.value;
						setSelectedSource(val === "theme" || val === "user" || val === "import" ? val : null);
					}}
					className="h-10 rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-kumo-ring focus:ring-offset-2"
				>
					<option value="">{t("sections.allSources")}</option>
					<option value="theme">{t("sections.theme")}</option>
					<option value="user">{t("sections.custom")}</option>
					<option value="import">{t("sections.imported")}</option>
				</select>
			</div>

			{/* Section Grid */}
			{sectionsLoading ? (
				<div className="flex items-center justify-center h-64">
					<div className="text-kumo-subtle">{t("sections.loadingSections")}</div>
				</div>
			) : sections.length === 0 ? (
				<div className="rounded-lg border bg-kumo-base p-12 text-center">
					{searchQuery || selectedSource ? (
						<>
							<MagnifyingGlass className="mx-auto h-12 w-12 text-kumo-subtle" />
							<h3 className="mt-4 text-lg font-semibold">{t("sections.noSectionsFound")}</h3>
							<p className="mt-2 text-kumo-subtle">{t("sections.adjustSearchFilters")}</p>
						</>
					) : (
						<>
							<FolderOpen className="mx-auto h-12 w-12 text-kumo-subtle" />
							<h3 className="mt-4 text-lg font-semibold">{t("sections.noSectionsYet")}</h3>
							<p className="mt-2 text-kumo-subtle">
								{t("sections.createFirstSection")}
							</p>
							<Button className="mt-4" icon={<Plus />} onClick={() => setIsCreateOpen(true)}>
								{t("sections.createSection")}
							</Button>
						</>
					)}
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{sections.map((section) => (
						<SectionCard
							key={section.id}
							section={section}
							onEdit={() => navigate({ to: "/sections/$slug", params: { slug: section.slug } })}
							onDelete={() => setDeleteSlug(section.slug)}
							onCopySlug={() => handleCopySlug(section.slug)}
							t={t}
						/>
					))}
				</div>
			)}

			{/* Delete confirmation */}
			<ConfirmDialog
				open={!!deleteSlug}
				onClose={() => {
					setDeleteSlug(null);
					deleteMutation.reset();
				}}
				title={t("sections.deleteSection")}
				description={
					sectionToDelete?.source === "theme" ? (
						<>
							{t("sections.cannotDeleteTheme")}
						</>
					) : (
						<>
							{t("sections.deleteDescription", { title: sectionToDelete?.title || "" })}
						</>
					)
				}
				confirmLabel={t("common.delete")}
				pendingLabel={t("common.deleting")}
				isPending={deleteMutation.isPending}
				error={deleteMutation.error}
				onConfirm={() => deleteSlug && deleteMutation.mutate(deleteSlug)}
			/>
		</div>
	);
}

function SectionCard({
	section,
	onEdit,
	onDelete,
	onCopySlug,
	t,
}: {
	section: Section;
	onEdit: () => void;
	onDelete: () => void;
	onCopySlug: () => void;
	t: ReturnType<typeof useT>;
}) {
	const SourceIcon = sourceIcons[section.source];

	const sourceLabels = getSourceLabels(t);

	return (
		<div className="rounded-lg border bg-kumo-base overflow-hidden">
			{/* Preview area */}
			<div className="aspect-video bg-kumo-tint flex items-center justify-center">
				{section.previewUrl ? (
					<img
						src={section.previewUrl}
						alt={section.title}
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="text-kumo-subtle text-sm">{t("sections.noPreview")}</div>
				)}
			</div>

			{/* Content */}
			<div className="p-4">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold truncate">{section.title}</h3>
						<p className="text-sm text-kumo-subtle truncate">{section.slug}</p>
					</div>
					<div
						className="flex items-center gap-1 text-xs text-kumo-subtle"
						title={sourceLabels[section.source]}
					>
						<SourceIcon className="h-3 w-3" />
						<span>{sourceLabels[section.source]}</span>
					</div>
				</div>

				{section.description && (
					<p className="mt-2 text-sm text-kumo-subtle line-clamp-2">{section.description}</p>
				)}

				{section.keywords.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{section.keywords.slice(0, 3).map((keyword) => (
							<span
								key={keyword}
								className="inline-flex items-center rounded bg-kumo-tint px-1.5 py-0.5 text-xs text-kumo-subtle"
							>
								{keyword}
							</span>
						))}
						{section.keywords.length > 3 && (
							<span className="text-xs text-kumo-subtle">+{section.keywords.length - 3} {t("common.more")}</span>
						)}
					</div>
				)}

				{/* Actions */}
				<div className="mt-4 flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						icon={<PencilSimple />}
						onClick={onEdit}
						className="flex-1"
					>
						{t("common.edit")}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={onCopySlug}
						title={t("sections.copySlug")}
						aria-label={t("sections.copySlugAria", { slug: section.slug })}
					>
						<Copy className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={onDelete}
						title={section.source === "theme" ? t("sections.cannotDeleteThemeSections") : t("common.delete")}
						aria-label={t("sections.deleteSectionAria", { title: section.title })}
						disabled={section.source === "theme"}
					>
						<Trash className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
