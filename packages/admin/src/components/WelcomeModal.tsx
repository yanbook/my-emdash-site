/**
 * Welcome Modal
 *
 * Shown to new users on their first login to welcome them to EmDash.
 */

import { Button, Dialog } from "@cloudflare/kumo";
import { X } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { apiFetch, throwResponseError } from "../lib/api/client";
import { useT } from "../i18n";
import { LogoIcon } from "./Logo.js";

interface WelcomeModalProps {
	open: boolean;
	onClose: () => void;
	userName?: string;
	userRole: number;
}

// Role labels
function getRoleLabel(role: number, t: ReturnType<typeof useT>): string {
	if (role >= 50) return t("welcomeModal.administrator");
	if (role >= 40) return t("welcomeModal.editor");
	if (role >= 30) return t("welcomeModal.author");
	if (role >= 20) return t("welcomeModal.contributor");
	return t("welcomeModal.subscriber");
}

async function dismissWelcome(): Promise<void> {
	const response = await apiFetch("/_emdash/api/auth/me", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action: "dismissWelcome" }),
	});
	if (!response.ok) await throwResponseError(response, "Failed to dismiss welcome");
}

export function WelcomeModal({ open, onClose, userName, userRole }: WelcomeModalProps) {
	const queryClient = useQueryClient();

	const dismissMutation = useMutation({
		mutationFn: dismissWelcome,
		onSuccess: () => {
			// Update the cached user data to reflect that they've seen the welcome
			queryClient.setQueryData(["currentUser"], (old: unknown) => {
				if (old && typeof old === "object") {
					return { ...old, isFirstLogin: false };
				}
				return old;
			});
			onClose();
		},
		onError: () => {
			// Still close on error - don't block the user
			onClose();
		},
	});

	const t = useT();

	const handleGetStarted = () => {
		dismissMutation.mutate();
	};

	const roleLabel = getRoleLabel(userRole, t);
	const isAdmin = userRole >= 50;

	return (
		<Dialog.Root open={open} onOpenChange={(isOpen: boolean) => !isOpen && handleGetStarted()}>
			<Dialog className="p-6 sm:max-w-md" size="lg">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1" />
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
				<div className="flex flex-col space-y-1.5 text-center sm:text-center">
					<div className="mx-auto mb-4">
						<LogoIcon className="h-16 w-16" />
					</div>
					<Dialog.Title className="text-2xl font-semibold leading-none tracking-tight">
						{t("welcomeModal.welcomeTitle", { comma: userName ? "," : "", name: userName ? userName.split(" ")[0] : "" })}
					</Dialog.Title>
					<Dialog.Description className="text-base text-kumo-subtle">
						{t("welcomeModal.accountCreated")}
					</Dialog.Description>
				</div>

				<div className="space-y-4 py-4">
					<div className="rounded-lg bg-kumo-tint p-4">
						<div className="text-sm font-medium">{t("welcomeModal.yourRole")}</div>
						<div className="text-lg font-semibold text-kumo-brand">{roleLabel}</div>
						<p className="text-sm text-kumo-subtle mt-1">
							{isAdmin
								? t("welcomeModal.adminDescription")
								: userRole >= 40
									? t("welcomeModal.editorDescription")
									: userRole >= 30
										? t("welcomeModal.authorDescription")
										: t("welcomeModal.defaultDescription")}
						</p>
					</div>

					{isAdmin && (
						<p className="text-sm text-kumo-subtle">
							{t("welcomeModal.adminInviteHint")}
						</p>
					)}
				</div>

				<div className="flex flex-col-reverse sm:flex-row sm:justify-center sm:space-x-2">
					<Button onClick={handleGetStarted} disabled={dismissMutation.isPending} size="lg">
						{dismissMutation.isPending ? t("common.loading") : t("welcomeModal.getStarted")}
					</Button>
				</div>
			</Dialog>
		</Dialog.Root>
	);
}
