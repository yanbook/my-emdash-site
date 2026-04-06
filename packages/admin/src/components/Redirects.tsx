import { Badge, Button, Dialog, Input, Label, Switch } from "@cloudflare/kumo";
import {
	ArrowRight,
	MagnifyingGlass,
	Plus,
	ArrowsLeftRight,
	Trash,
	PencilSimple,
	X,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
	createRedirect,
	deleteRedirect,
	fetch404Summary,
	fetchRedirects,
	updateRedirect,
} from "../lib/api/redirects.js";
import type {
	CreateRedirectInput,
	NotFoundSummary,
	Redirect,
	UpdateRedirectInput,
} from "../lib/api/redirects.js";
import { cn } from "../lib/utils.js";
import { useT } from "../i18n";
import { ConfirmDialog } from "./ConfirmDialog.js";
import { DialogError, getMutationError } from "./DialogError.js";

// ---------------------------------------------------------------------------
// Redirect form dialog (create + edit)
// ---------------------------------------------------------------------------

function RedirectFormDialog({
	open,
	onClose,
	redirect,
	defaultSource,
	t,
}: {
	open: boolean;
	onClose: () => void;
	/** Pass for edit mode */
	redirect?: Redirect;
	/** Pre-fill source for create mode (e.g. from 404 list) */
	defaultSource?: string;
	t: ReturnType<typeof useT>;
}) {
	const queryClient = useQueryClient();
	const isEdit = !!redirect;

	const [source, setSource] = useState(redirect?.source ?? defaultSource ?? "");
	const [destination, setDestination] = useState(redirect?.destination ?? "");
	const [type, setType] = useState(String(redirect?.type ?? 301));
	const [enabled, setEnabled] = useState(redirect?.enabled ?? true);
	const [groupName, setGroupName] = useState(redirect?.groupName ?? "");

	const createMutation = useMutation({
		mutationFn: (input: CreateRedirectInput) => createRedirect(input),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["redirects"] });
			onClose();
		},
	});

	const updateMutation = useMutation({
		mutationFn: (input: UpdateRedirectInput) => updateRedirect(redirect!.id, input),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["redirects"] });
			onClose();
		},
	});

	const mutation = isEdit ? updateMutation : createMutation;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const input = {
			source: source.trim(),
			destination: destination.trim(),
			type: Number(type),
			enabled,
			groupName: groupName.trim() || null,
		};

		if (isEdit) {
			updateMutation.mutate(input);
		} else {
			createMutation.mutate(input);
		}
	}

	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
			<Dialog className="p-6" size="lg">
				<div className="flex items-start justify-between gap-4 mb-4">
					<div>
						<Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
							{isEdit ? t("redirects.editRedirect") : t("redirects.newRedirectDialog")}
						</Dialog.Title>
						<p className="text-sm text-kumo-subtle mt-1">
							{isEdit
								? t("redirects.updateRedirectRule")
								: t("redirects.useParamMatching")}
						</p>
					</div>
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
							</Button>
						)}
					/>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<Input
						label={t("redirects.sourcePath")}
						placeholder={t("redirects.sourcePathPlaceholder")}
						value={source}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSource(e.target.value)}
						required
					/>

					<Input
						label={t("redirects.destinationPath")}
						placeholder={t("redirects.destinationPathPlaceholder")}
						value={destination}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDestination(e.target.value)}
						required
					/>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="redirect-type">{t("redirects.statusCode")}</Label>
							<select
								id="redirect-type"
								value={type}
								onChange={(e) => setType(e.target.value)}
								className="flex h-10 w-full rounded-md border border-kumo-line bg-kumo-base px-3 py-2 text-sm"
							>
								<option value="301">{t("redirects.permanent301")}</option>
								<option value="302">{t("redirects.temporary302")}</option>
								<option value="307">{t("redirects.strictTemp307")}</option>
								<option value="308">{t("redirects.strictPerm308")}</option>
							</select>
						</div>

						<Input
							label={t("redirects.group")}
							placeholder={t("redirects.groupPlaceholder")}
							value={groupName}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGroupName(e.target.value)}
						/>
					</div>

					<div className="flex items-center gap-2">
						<Switch checked={enabled} onCheckedChange={setEnabled} id="redirect-enabled" />
						<Label htmlFor="redirect-enabled">{t("redirects.enabledToggle")}</Label>
					</div>

					<DialogError message={getMutationError(mutation.error)} />

					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={onClose}>
							{t("common.cancel")}
						</Button>
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending
								? isEdit
									? t("redirects.saving")
									: t("redirects.creating")
								: isEdit
									? t("common.save")
									: t("redirects.create")}
						</Button>
					</div>
				</form>
			</Dialog>
		</Dialog.Root>
	);
}

// ---------------------------------------------------------------------------
// 404 Summary panel
// ---------------------------------------------------------------------------

function NotFoundPanel({
	items,
	onCreateRedirect,
	t,
}: {
	items: NotFoundSummary[];
	onCreateRedirect: (path: string) => void;
	t: ReturnType<typeof useT>;
}) {
	if (items.length === 0) {
		return <p className="text-sm text-kumo-subtle py-4 text-center">{t("redirects.no404Errors")}</p>;
	}

	return (
		<div className="border rounded-lg">
			<div className="flex items-center gap-4 py-2 px-4 border-b bg-kumo-tint/50 text-sm font-medium text-kumo-subtle">
				<div className="flex-1">{t("redirects.path")}</div>
				<div className="w-16 text-right">{t("redirects.hits")}</div>
				<div className="w-32">{t("redirects.lastSeen")}</div>
				<div className="w-8" />
			</div>
			{items.map((item) => (
				<div
					key={item.path}
					className="flex items-center gap-4 py-2 px-4 border-b last:border-0 text-sm"
				>
					<div className="flex-1 font-mono text-xs truncate">{item.path}</div>
					<div className="w-16 text-right tabular-nums">{item.count}</div>
					<div className="w-32 text-kumo-subtle text-xs">
						{(() => {
							const d = new Date(item.lastSeen);
							return Number.isNaN(d.getTime()) ? item.lastSeen : d.toLocaleDateString();
						})()}
					</div>
					<div className="w-8">
						<button
							onClick={() => onCreateRedirect(item.path)}
							className="text-kumo-subtle hover:text-kumo-default"
							title={t("redirects.createRedirectFor")}
							aria-label={`${t("redirects.createRedirectFor")} ${item.path}`}
						>
							<ArrowsLeftRight size={14} />
						</button>
					</div>
				</div>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main Redirects page
// ---------------------------------------------------------------------------

type TabKey = "redirects" | "404s";

export function Redirects() {
	const t = useT();
	const queryClient = useQueryClient();
	const [tab, setTab] = useState<TabKey>("redirects");
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [filterEnabled, setFilterEnabled] = useState<string>("all");
	const [filterAuto, setFilterAuto] = useState<string>("all");

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(setDebouncedSearch, 300, search);
		return () => clearTimeout(timer);
	}, [search]);

	// Dialog state
	const [showCreate, setShowCreate] = useState(false);
	const [editRedirect, setEditRedirect] = useState<Redirect | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [prefillSource, setPrefillSource] = useState("");

	// Queries
	const enabledFilter = filterEnabled === "all" ? undefined : filterEnabled === "true";
	const autoFilter = filterAuto === "all" ? undefined : filterAuto === "true";

	const redirectsQuery = useQuery({
		queryKey: ["redirects", debouncedSearch, enabledFilter, autoFilter],
		queryFn: () =>
			fetchRedirects({
				search: debouncedSearch || undefined,
				enabled: enabledFilter,
				auto: autoFilter,
				limit: 100,
			}),
	});

	const notFoundQuery = useQuery({
		queryKey: ["redirects", "404-summary"],
		queryFn: () => fetch404Summary(50),
		enabled: tab === "404s",
	});

	// Delete mutation
	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteRedirect(id),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["redirects"] });
			setDeleteId(null);
		},
	});

	// Toggle enabled mutation
	const toggleMutation = useMutation({
		mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
			updateRedirect(id, { enabled }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["redirects"] });
		},
		onError: () => {
			void queryClient.invalidateQueries({ queryKey: ["redirects"] });
		},
	});

	function handleCreateFrom404(path: string) {
		setPrefillSource(path);
		setShowCreate(true);
		setTab("redirects");
	}

	const redirects = redirectsQuery.data?.items ?? [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">{t("redirects.title")}</h1>
					<p className="text-kumo-subtle">{t("redirects.description")}</p>
				</div>
				<Button icon={<Plus />} onClick={() => setShowCreate(true)}>
					{t("redirects.newRedirect")}
				</Button>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 border-b">
				<button
					onClick={() => setTab("redirects")}
					className={cn(
						"px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
						tab === "redirects"
							? "border-kumo-brand text-kumo-brand"
							: "border-transparent text-kumo-subtle hover:text-kumo-default",
					)}
				>
					{t("redirects.redirects")}
					{redirectsQuery.data && (
						<Badge variant="secondary" className="ml-2">
							{redirectsQuery.data.items.length}
							{redirectsQuery.data.nextCursor ? "+" : ""}
						</Badge>
					)}
				</button>
				<button
					onClick={() => setTab("404s")}
					className={cn(
						"px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
						tab === "404s"
							? "border-kumo-brand text-kumo-brand"
							: "border-transparent text-kumo-subtle hover:text-kumo-default",
					)}
				>
					{t("redirects.errors404")}
				</button>
			</div>

			{/* Tab content */}
			{tab === "redirects" && (
				<>
					{/* Filters */}
					<div className="flex items-center gap-4">
						<div className="relative flex-1 max-w-md">
							<MagnifyingGlass
								className="absolute left-3 top-1/2 -translate-y-1/2 text-kumo-subtle"
								size={16}
							/>
							<Input
								placeholder={t("redirects.searchPlaceholder")}
								className="pl-10"
								value={search}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
							/>
						</div>
						<select
							value={filterEnabled}
							onChange={(e) => setFilterEnabled(e.target.value)}
							className="h-10 rounded-md border border-kumo-line bg-kumo-base px-3 text-sm"
						>
							<option value="all">{t("redirects.allStatuses")}</option>
							<option value="true">{t("redirects.enabled")}</option>
							<option value="false">{t("redirects.disabledStatus")}</option>
						</select>
						<select
							value={filterAuto}
							onChange={(e) => setFilterAuto(e.target.value)}
							className="h-10 rounded-md border border-kumo-line bg-kumo-base px-3 text-sm"
						>
							<option value="all">{t("redirects.allTypes")}</option>
							<option value="false">{t("redirects.manual")}</option>
							<option value="true">{t("redirects.autoSlugChange")}</option>
						</select>
					</div>

					{/* Redirect list */}
					{redirectsQuery.isLoading ? (
						<div className="py-12 text-center text-kumo-subtle">{t("redirects.loadingRedirects")}</div>
					) : redirects.length === 0 ? (
						<div className="py-12 text-center text-kumo-subtle">
							<ArrowsLeftRight size={48} className="mx-auto mb-4 opacity-30" />
							<p className="text-lg font-medium">{t("redirects.noRedirectsYet")}</p>
							<p className="text-sm mt-1">{t("redirects.createRedirectRules")}</p>
						</div>
					) : (
						<div className="border rounded-lg">
							<div className="flex items-center gap-4 py-2 px-4 border-b bg-kumo-tint/50 text-sm font-medium text-kumo-subtle">
								<div className="flex-1">{t("redirects.source")}</div>
								<div className="w-8 text-center" />
								<div className="flex-1">{t("redirects.destination")}</div>
								<div className="w-14 text-center">{t("redirects.code")}</div>
								<div className="w-16 text-right">{t("redirects.hits")}</div>
								<div className="w-20 text-center">{t("redirects.status")}</div>
								<div className="w-20" />
							</div>
							{redirects.map((r) => (
								<div
									key={r.id}
									className={cn(
										"flex items-center gap-4 py-2 px-4 border-b last:border-0 text-sm",
										!r.enabled && "opacity-50",
									)}
								>
									<div className="flex-1 font-mono text-xs truncate" title={r.source}>
										{r.source}
									</div>
									<div className="w-8 text-center text-kumo-subtle">
										<ArrowRight size={14} />
									</div>
									<div className="flex-1 font-mono text-xs truncate" title={r.destination}>
										{r.destination}
									</div>
									<div className="w-14 text-center">
										<Badge variant="secondary">{r.type}</Badge>
									</div>
									<div className="w-16 text-right tabular-nums text-kumo-subtle">{r.hits}</div>
									<div className="w-20 text-center">
										<Switch
											checked={r.enabled}
											onCheckedChange={(checked) =>
												toggleMutation.mutate({
													id: r.id,
													enabled: checked,
												})
											}
											aria-label={r.enabled ? t("redirects.disableRedirect") : t("redirects.enableRedirect")}
										/>
									</div>
									<div className="w-20 flex items-center justify-end gap-1">
										{r.auto && (
											<Badge variant="outline" className="mr-1 text-xs">
												{t("redirects.auto")}
											</Badge>
										)}
										<button
											onClick={() => setEditRedirect(r)}
											className="p-1 text-kumo-subtle hover:text-kumo-default"
											title={t("redirects.editRedirect")}
											aria-label={t("redirects.editRedirectAria", { source: r.source })}
										>
											<PencilSimple size={14} />
										</button>
										<button
											onClick={() => setDeleteId(r.id)}
											className="p-1 text-kumo-subtle hover:text-kumo-danger"
											title={t("common.delete")}
											aria-label={t("redirects.deleteRedirectAria", { source: r.source })}
										>
											<Trash size={14} />
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</>
			)}

			{tab === "404s" && (
				<NotFoundPanel items={notFoundQuery.data ?? []} onCreateRedirect={handleCreateFrom404} t={t} />
			)}

			{/* Create dialog */}
			{showCreate && (
				<RedirectFormDialog
					open
					onClose={() => {
						setShowCreate(false);
						setPrefillSource("");
					}}
					defaultSource={prefillSource || undefined}
					t={t}
				/>
			)}

			{/* Edit dialog */}
			{editRedirect && (
				<RedirectFormDialog open onClose={() => setEditRedirect(null)} redirect={editRedirect} t={t} />
			)}

			{/* Delete confirmation */}
			<ConfirmDialog
				open={!!deleteId}
				onClose={() => {
					setDeleteId(null);
					deleteMutation.reset();
				}}
				title={t("redirects.deleteRedirect")}
				description={t("redirects.deleteRedirectDescription")}
				confirmLabel={t("common.delete")}
				pendingLabel={t("common.deleting")}
				isPending={deleteMutation.isPending}
				error={deleteMutation.error}
				onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
			/>
		</div>
	);
}
