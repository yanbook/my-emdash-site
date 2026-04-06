import { Badge, Button, Input, InputArea, Label, Select, buttonVariants } from "@cloudflare/kumo";
import {
	ArrowLeft,
	Plus,
	DotsSixVertical,
	Pencil,
	Trash,
	Database,
	FileText,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";

import type {
	SchemaCollectionWithFields,
	SchemaField,
	CreateFieldInput,
	CreateCollectionInput,
	UpdateCollectionInput,
} from "../lib/api";
import { useT } from "../i18n";
import { cn } from "../lib/utils";
import { ConfirmDialog } from "./ConfirmDialog";
import { FieldEditor } from "./FieldEditor";

// Regex patterns for slug generation
const SLUG_INVALID_CHARS_PATTERN = /[^a-z0-9]+/g;
const SLUG_LEADING_TRAILING_PATTERN = /^_|_$/g;

export interface ContentTypeEditorProps {
	collection?: SchemaCollectionWithFields;
	isNew?: boolean;
	isSaving?: boolean;
	onSave: (input: CreateCollectionInput | UpdateCollectionInput) => void;
	onAddField?: (input: CreateFieldInput) => void;
	onUpdateField?: (fieldSlug: string, input: CreateFieldInput) => void;
	onDeleteField?: (fieldSlug: string) => void;
	onReorderFields?: (fieldSlugs: string[]) => void;
}

const SUPPORT_OPTIONS = [
	{
		value: "drafts",
		label: "Drafts",
		description: "Save content as draft before publishing",
	},
	{
		value: "revisions",
		label: "Revisions",
		description: "Track content history",
	},
	{
		value: "preview",
		label: "Preview",
		description: "Preview content before publishing",
	},
	{
		value: "search",
		label: "Search",
		description: "Enable full-text search on this collection",
	},
];

/**
 * System fields that exist on every collection
 * These are created automatically and cannot be modified
 */
const SYSTEM_FIELDS = [
	{
		slug: "id",
		label: "ID",
		type: "text",
		description: "Unique identifier (ULID)",
	},
	{
		slug: "slug",
		label: "Slug",
		type: "text",
		description: "URL-friendly identifier",
	},
	{
		slug: "status",
		label: "Status",
		type: "text",
		description: "draft, published, or archived",
	},
	{
		slug: "created_at",
		label: "Created At",
		type: "datetime",
		description: "When the entry was created",
	},
	{
		slug: "updated_at",
		label: "Updated At",
		type: "datetime",
		description: "When the entry was last modified",
	},
	{
		slug: "published_at",
		label: "Published At",
		type: "datetime",
		description: "When the entry was published",
	},
];

/**
 * Content Type editor for creating/editing collections
 */
export function ContentTypeEditor({
	collection,
	isNew,
	isSaving,
	onSave,
	onAddField,
	onUpdateField,
	onDeleteField,
	onReorderFields: _onReorderFields,
}: ContentTypeEditorProps) {
	const t = useT();
	const _navigate = useNavigate();

	// Form state
	const [slug, setSlug] = React.useState(collection?.slug ?? "");
	const [label, setLabel] = React.useState(collection?.label ?? "");
	const [labelSingular, setLabelSingular] = React.useState(collection?.labelSingular ?? "");
	const [description, setDescription] = React.useState(collection?.description ?? "");
	const [urlPattern, setUrlPattern] = React.useState(collection?.urlPattern ?? "");
	const [supports, setSupports] = React.useState<string[]>(collection?.supports ?? ["drafts"]);

	// SEO state
	const [hasSeo, setHasSeo] = React.useState(collection?.hasSeo ?? false);

	// Comment settings state
	const [commentsEnabled, setCommentsEnabled] = React.useState(
		collection?.commentsEnabled ?? false,
	);
	const [commentsModeration, setCommentsModeration] = React.useState<"all" | "first_time" | "none">(
		collection?.commentsModeration ?? "first_time",
	);
	const [commentsClosedAfterDays, setCommentsClosedAfterDays] = React.useState(
		collection?.commentsClosedAfterDays ?? 90,
	);
	const [commentsAutoApproveUsers, setCommentsAutoApproveUsers] = React.useState(
		collection?.commentsAutoApproveUsers ?? true,
	);

	// Field editor state
	const [fieldEditorOpen, setFieldEditorOpen] = React.useState(false);
	const [editingField, setEditingField] = React.useState<SchemaField | undefined>();
	const [fieldSaving, setFieldSaving] = React.useState(false);
	const [deleteFieldTarget, setDeleteFieldTarget] = React.useState<SchemaField | null>(null);

	const urlPatternValid = !urlPattern || urlPattern.includes("{slug}");

	// Track whether form has unsaved changes
	const hasChanges = React.useMemo(() => {
		if (isNew) return slug && label;
		if (!collection) return false;
		return (
			label !== collection.label ||
			labelSingular !== (collection.labelSingular ?? "") ||
			description !== (collection.description ?? "") ||
			urlPattern !== (collection.urlPattern ?? "") ||
			JSON.stringify([...supports].toSorted()) !==
				JSON.stringify([...collection.supports].toSorted()) ||
			hasSeo !== collection.hasSeo ||
			commentsEnabled !== collection.commentsEnabled ||
			commentsModeration !== collection.commentsModeration ||
			commentsClosedAfterDays !== collection.commentsClosedAfterDays ||
			commentsAutoApproveUsers !== collection.commentsAutoApproveUsers
		);
	}, [
		isNew,
		collection,
		slug,
		label,
		labelSingular,
		description,
		urlPattern,
		supports,
		hasSeo,
		commentsEnabled,
		commentsModeration,
		commentsClosedAfterDays,
		commentsAutoApproveUsers,
	]);

	// Auto-generate slug from plural label
	const handleLabelChange = (value: string) => {
		setLabel(value);
		if (isNew) {
			setSlug(
				value
					.toLowerCase()
					.replace(SLUG_INVALID_CHARS_PATTERN, "_")
					.replace(SLUG_LEADING_TRAILING_PATTERN, ""),
			);
		}
	};

	// Auto-generate plural label (and slug) from singular label
	const handleSingularLabelChange = (value: string) => {
		setLabelSingular(value);
		if (isNew) {
			const plural = value ? `${value}s` : "";
			handleLabelChange(plural);
		}
	};

	const handleSupportToggle = (value: string) => {
		setSupports((prev) =>
			prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
		);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isNew) {
			onSave({
				slug,
				label,
				labelSingular: labelSingular || undefined,
				description: description || undefined,
				urlPattern: urlPattern || undefined,
				supports,
				hasSeo,
			});
		} else {
			onSave({
				label,
				labelSingular: labelSingular || undefined,
				description: description || undefined,
				urlPattern: urlPattern || undefined,
				supports,
				hasSeo,
				commentsEnabled,
				commentsModeration,
				commentsClosedAfterDays,
				commentsAutoApproveUsers,
			});
		}
	};

	const handleFieldSave = async (input: CreateFieldInput) => {
		setFieldSaving(true);
		try {
			if (editingField) {
				onUpdateField?.(editingField.slug, input);
			} else {
				onAddField?.(input);
			}
			setFieldEditorOpen(false);
			setEditingField(undefined);
		} finally {
			setFieldSaving(false);
		}
	};

	const handleEditField = (field: SchemaField) => {
		setEditingField(field);
		setFieldEditorOpen(true);
	};

	const handleAddField = () => {
		setEditingField(undefined);
		setFieldEditorOpen(true);
	};

	const isFromCode = collection?.source === "code";
	const fields = collection?.fields ?? [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center space-x-4">
				<Link
					to="/content-types"
					aria-label={t("common.back")}
					className={buttonVariants({ variant: "ghost", shape: "square" })}
				>
					<ArrowLeft className="h-5 w-5" />
				</Link>
				<div className="flex-1">
					<h1 className="text-2xl font-bold">{isNew ? t("contentTypeEditor.newContentType") : collection?.label}</h1>
					{!isNew && (
						<p className="text-kumo-subtle text-sm">
							<code className="bg-kumo-tint px-1.5 py-0.5 rounded">{collection?.slug}</code>
							{isFromCode && (
								<span className="ml-2 text-purple-600 dark:text-purple-400">{t("contentTypeEditor.definedInCode")}</span>
							)}
						</p>
					)}
				</div>
			</div>

			{isFromCode && (
				<div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 p-4">
					<div className="flex items-center space-x-2">
						<FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
						<p className="text-sm text-purple-700 dark:text-purple-300">
							{t("contentTypeEditor.codeDefinedMessage")}
						</p>
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Settings form */}
				<div className="lg:col-span-1">
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="rounded-lg border p-4 space-y-4">
							<h2 className="font-semibold">{t("contentTypeEditor.settings")}</h2>

							<Input
								label={t("contentTypeEditor.labelSingular")}
								value={labelSingular}
								onChange={(e) => handleSingularLabelChange(e.target.value)}
								placeholder={t("contentTypeEditor.labelSingularPlaceholder")}
								disabled={isFromCode}
							/>

							<Input
								label={t("contentTypeEditor.labelPlural")}
								value={label}
								onChange={(e) => handleLabelChange(e.target.value)}
								placeholder={t("contentTypeEditor.labelPluralPlaceholder")}
								disabled={isFromCode}
							/>

							{isNew && (
								<div>
									<Input
										label={t("contentTypeEditor.slug")}
										value={slug}
										onChange={(e) => setSlug(e.target.value)}
										placeholder={t("contentTypeEditor.slugPlaceholder")}
										disabled={!isNew}
									/>
									<p className="text-xs text-kumo-subtle mt-2">{t("contentTypeEditor.slugDescription")}</p>
								</div>
							)}

							<InputArea
								label={t("contentTypeEditor.description")}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder={t("contentTypeEditor.descriptionPlaceholder")}
								rows={3}
								disabled={isFromCode}
							/>

							<div>
								<Input
									label={t("contentTypeEditor.urlPattern")}
									value={urlPattern}
									onChange={(e) => setUrlPattern(e.target.value)}
									placeholder={t("contentTypeEditor.urlPatternPlaceholder", { slug: slug === "pages" ? "" : `${slug}/` })}
									disabled={isFromCode}
								/>
								{urlPattern && !urlPattern.includes("{slug}") && (
									<p className="text-xs text-kumo-danger mt-2">
										{t("contentTypeEditor.urlPatternInvalid")}
									</p>
								)}
								<p className="text-xs text-kumo-subtle mt-1">
									{t("contentTypeEditor.urlPatternDescription")}
								</p>
							</div>

							<div className="space-y-3">
								<Label>{t("contentTypeEditor.features")}</Label>
								{SUPPORT_OPTIONS.map((option) => (
									<label
										key={option.value}
										className={cn(
											"flex items-start space-x-3 p-2 rounded-md cursor-pointer hover:bg-kumo-tint/50",
											isFromCode && "opacity-60 cursor-not-allowed",
										)}
									>
										<input
											type="checkbox"
											checked={supports.includes(option.value)}
											onChange={() => handleSupportToggle(option.value)}
											className="mt-1 rounded border-kumo-line"
											disabled={isFromCode}
										/>
										<div>
											<span className="text-sm font-medium">{option.label}</span>
											<p className="text-xs text-kumo-subtle">{option.description}</p>
										</div>
									</label>
								))}
							</div>

							{/* SEO toggle */}
							<div className="pt-2 border-t">
								<label
									className={cn(
										"flex items-start space-x-3 p-2 rounded-md cursor-pointer hover:bg-kumo-tint/50",
										isFromCode && "opacity-60 cursor-not-allowed",
									)}
								>
									<input
										type="checkbox"
										checked={hasSeo}
										onChange={() => setHasSeo(!hasSeo)}
										className="mt-1 rounded border-kumo-line"
										disabled={isFromCode}
									/>
									<div>
										<span className="text-sm font-medium">{t("contentTypeEditor.seo")}</span>
										<p className="text-xs text-kumo-subtle">
											{t("contentTypeEditor.seoDescription")}
										</p>
									</div>
								</label>
							</div>
						</div>

						{/* Comments settings — only for existing collections */}
						{!isNew && (
							<div className="rounded-lg border p-4 space-y-4">
								<h2 className="font-semibold">{t("contentTypeEditor.comments")}</h2>

								<label
									className={cn(
										"flex items-start space-x-3 p-2 rounded-md cursor-pointer hover:bg-kumo-tint/50",
										isFromCode && "opacity-60 cursor-not-allowed",
									)}
								>
									<input
										type="checkbox"
										checked={commentsEnabled}
										onChange={() => setCommentsEnabled(!commentsEnabled)}
										className="mt-1 rounded border-kumo-line"
										disabled={isFromCode}
									/>
									<div>
										<span className="text-sm font-medium">{t("contentTypeEditor.enableComments")}</span>
										<p className="text-xs text-kumo-subtle">
											{t("contentTypeEditor.enableCommentsDescription")}
										</p>
									</div>
								</label>

								{commentsEnabled && (
									<>
										<Select
											label={t("contentTypeEditor.moderation")}
											value={commentsModeration}
											onValueChange={(v) =>
												setCommentsModeration((v as "all" | "first_time" | "none") ?? "first_time")
											}
											items={{
												all: t("contentTypeEditor.moderationAll"),
												first_time: t("contentTypeEditor.moderationFirstTime"),
												none: t("contentTypeEditor.moderationNone"),
											}}
											disabled={isFromCode}
										/>

										<Input
											label={t("contentTypeEditor.closeCommentsAfter")}
											type="number"
											min={0}
											value={String(commentsClosedAfterDays)}
											onChange={(e) => {
												const parsed = Number.parseInt(e.target.value, 10);
												setCommentsClosedAfterDays(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
											}}
											disabled={isFromCode}
										/>
										<p className="text-xs text-kumo-subtle -mt-2">
											{t("contentTypeEditor.closeCommentsDescription")}
										</p>

										<label
											className={cn(
												"flex items-start space-x-3 p-2 rounded-md cursor-pointer hover:bg-kumo-tint/50",
												isFromCode && "opacity-60 cursor-not-allowed",
											)}
										>
											<input
												type="checkbox"
												checked={commentsAutoApproveUsers}
												onChange={() => setCommentsAutoApproveUsers(!commentsAutoApproveUsers)}
												className="mt-1 rounded border-kumo-line"
												disabled={isFromCode}
											/>
											<div>
												<span className="text-sm font-medium">
													{t("contentTypeEditor.autoApproveUsers")}
												</span>
												<p className="text-xs text-kumo-subtle">
													{t("contentTypeEditor.autoApproveUsersDescription")}
												</p>
											</div>
										</label>
									</>
								)}
							</div>
						)}

						{!isFromCode && (
							<Button
								type="submit"
								disabled={!hasChanges || !urlPatternValid || isSaving}
								className="w-full"
							>
								{isSaving ? t("common.saving") : isNew ? t("contentTypeEditor.createContentType") : t("contentTypeEditor.saveChanges")}
							</Button>
						)}
					</form>
				</div>

				{/* Fields section - only show for existing collections */}
				{!isNew && (
					<div className="lg:col-span-2">
						<div className="rounded-lg border">
							<div className="flex items-center justify-between p-4 border-b">
								<div>
									<h2 className="font-semibold">{t("contentTypeEditor.fields")}</h2>
									<p className="text-sm text-kumo-subtle">
										{t("contentTypeEditor.systemAndCustomFields", { system: SYSTEM_FIELDS.length, custom: fields.length, plural: fields.length !== 1 ? "s" : "" })}
									</p>
								</div>
								{!isFromCode && (
									<Button icon={<Plus />} onClick={handleAddField}>
										{t("contentTypeEditor.addField")}
									</Button>
								)}
							</div>

							{/* System fields - always shown */}
							<div className="border-b bg-kumo-tint/30">
								<div className="px-4 py-2 text-xs font-medium text-kumo-subtle uppercase tracking-wider">
									{t("contentTypeEditor.systemFields")}
								</div>
								<div className="divide-y divide-kumo-line/50">
									{SYSTEM_FIELDS.map((field) => (
										<SystemFieldRow key={field.slug} field={field} />
									))}
								</div>
							</div>

							{/* Custom fields */}
							{fields.length === 0 ? (
								<div className="p-8 text-center text-kumo-subtle">
									<Database className="mx-auto h-12 w-12 mb-4 opacity-50" />
									<p className="font-medium">{t("contentTypeEditor.noCustomFields")}</p>
									<p className="text-sm">{t("contentTypeEditor.noCustomFieldsDescription")}</p>
									{!isFromCode && (
										<Button className="mt-4" icon={<Plus />} onClick={handleAddField}>
											{t("contentTypeEditor.addFirstField")}
										</Button>
									)}
								</div>
							) : (
								<>
									<div className="px-4 py-2 text-xs font-medium text-kumo-subtle uppercase tracking-wider border-b">
										{t("contentTypeEditor.customFields")}
									</div>
									<div className="divide-y">
										{fields.map((field) => (
											<FieldRow
												key={field.id}
												field={field}
												isFromCode={isFromCode}
												onEdit={() => handleEditField(field)}
												onDelete={() => setDeleteFieldTarget(field)}
											/>
										))}
									</div>
								</>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Field editor dialog */}
			<FieldEditor
				open={fieldEditorOpen}
				onOpenChange={setFieldEditorOpen}
				field={editingField}
				onSave={handleFieldSave}
				isSaving={fieldSaving}
			/>

			<ConfirmDialog
				open={!!deleteFieldTarget}
				onClose={() => setDeleteFieldTarget(null)}
				title={t("contentTypeEditor.deleteField")}
				description={
					deleteFieldTarget
						? t("contentTypeEditor.deleteFieldDescription", { label: deleteFieldTarget.label })
						: ""
				}
				confirmLabel={t("common.delete")}
				pendingLabel={t("common.deleting")}
				isPending={false}
				error={null}
				onConfirm={() => {
					if (deleteFieldTarget) {
						onDeleteField?.(deleteFieldTarget.slug);
						setDeleteFieldTarget(null);
					}
				}}
			/>
		</div>
	);
}

interface FieldRowProps {
	field: SchemaField;
	isFromCode?: boolean;
	onEdit: () => void;
	onDelete: () => void;
}

function FieldRow({ field, isFromCode, onEdit, onDelete }: FieldRowProps) {
	const t = useT();
	return (
		<div className="flex items-center px-4 py-3 hover:bg-kumo-tint/25">
			{!isFromCode && <DotsSixVertical className="h-5 w-5 mr-3 text-kumo-subtle cursor-grab" />}
			<div className="flex-1 min-w-0">
				<div className="flex items-center space-x-2">
					<span className="font-medium">{field.label}</span>
					<code className="text-xs bg-kumo-tint px-1.5 py-0.5 rounded text-kumo-subtle">
						{field.slug}
					</code>
				</div>
				<div className="flex items-center space-x-2 mt-1">
					<span className="text-xs text-kumo-subtle capitalize">{field.type}</span>
					{field.required && <Badge variant="secondary">{t("common.required")}</Badge>}
					{field.unique && <Badge variant="secondary">{t("common.unique")}</Badge>}
					{field.searchable && <Badge variant="secondary">{t("common.searchable")}</Badge>}
				</div>
			</div>
			{!isFromCode && (
				<div className="flex items-center space-x-1">
					<Button
						variant="ghost"
						shape="square"
						onClick={onEdit}
						aria-label={`Edit ${field.label} field`}
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						shape="square"
						onClick={onDelete}
						aria-label={`Delete ${field.label} field`}
					>
						<Trash className="h-4 w-4 text-kumo-danger" />
					</Button>
				</div>
			)}
		</div>
	);
}

interface SystemFieldInfo {
	slug: string;
	label: string;
	type: string;
	description: string;
}

function SystemFieldRow({ field }: { field: SystemFieldInfo }) {
	const t = useT();
	return (
		<div className="flex items-center px-4 py-2 opacity-75">
			<div className="w-8" /> {/* Spacer for alignment with draggable fields */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center space-x-2">
					<span className="font-medium text-sm">{field.label}</span>
					<code className="text-xs bg-kumo-tint px-1.5 py-0.5 rounded text-kumo-subtle">
						{field.slug}
					</code>
					<Badge variant="secondary">{t("common.system")}</Badge>
				</div>
				<p className="text-xs text-kumo-subtle mt-0.5">{field.description}</p>
			</div>
		</div>
	);
}
