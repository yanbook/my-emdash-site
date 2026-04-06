/**
 * Signup Page - Self-signup for allowed domains
 *
 * This component is NOT wrapped in the admin Shell.
 * It's a standalone public page for self-signup.
 *
 * Flow:
 * 1. Email input form
 * 2. "Check your email" confirmation
 * 3. After clicking email link: Passkey registration
 */

import { Button, Input, Loader } from "@cloudflare/kumo";
import { Link } from "@tanstack/react-router";
import * as React from "react";

import { useT } from "../i18n";
import { requestSignup, verifySignupToken, type SignupVerifyResult } from "../lib/api";
import { PasskeyRegistration } from "./auth/PasskeyRegistration";
import { LogoLockup } from "./Logo.js";

// ============================================================================
// Types
// ============================================================================

type SignupStep = "email" | "check-email" | "verify" | "complete" | "error";

// ============================================================================
// Step Components
// ============================================================================

interface EmailStepProps {
	onSubmit: (email: string) => void;
	isLoading: boolean;
	error?: string;
}

function EmailStep({ onSubmit, isLoading, error }: EmailStepProps) {
	const t = useT();
	const [email, setEmail] = React.useState("");
	const [validationError, setValidationError] = React.useState<string | null>(null);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setValidationError(null);

		if (!email.trim()) {
			setValidationError(t("signup.emailRequired"));
			return;
		}

		if (!email.includes("@") || !email.includes(".")) {
			setValidationError(t("signup.validEmailRequired"));
			return;
		}

		onSubmit(email.trim().toLowerCase());
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="space-y-4">
				<div>
					<Input
						label={t("signup.email")}
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder={t("login.emailPlaceholder")}
						className={validationError ? "border-kumo-danger" : ""}
						disabled={isLoading}
						autoComplete="email"
						autoFocus
					/>
					{validationError && <p className="text-sm text-kumo-danger mt-1">{validationError}</p>}
				</div>
			</div>

			{error && (
				<div className="rounded-lg bg-kumo-danger/10 p-4 text-sm text-kumo-danger">{error}</div>
			)}

			<Button type="submit" className="w-full" disabled={isLoading}>
				{isLoading ? (
					<>
						<Loader size="sm" />
						{t("signup.sending")}
					</>
				) : (
					t("signup.continue")
				)}
			</Button>

			<p className="text-xs text-kumo-subtle text-center">
				{t("signup.onlyAllowedDomains")}
			</p>
		</form>
	);
}

interface CheckEmailStepProps {
	email: string;
	onResend: () => void;
	isResending: boolean;
	resendCooldown: number;
}

function CheckEmailStep({ email, onResend, isResending, resendCooldown }: CheckEmailStepProps) {
	const t = useT();
	return (
		<div className="space-y-6 text-center">
			<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-kumo-brand/10 mx-auto">
				<svg
					className="w-8 h-8 text-kumo-brand"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
					/>
				</svg>
			</div>

			<div>
				<h2 className="text-xl font-semibold">{t("signup.checkYourEmail")}</h2>
				<p className="text-kumo-subtle mt-2">
					{t("signup.verificationSentTo", { email })}
				</p>
			</div>

			<div className="text-sm text-kumo-subtle">
				<p>{t("signup.clickLinkToContinue")}</p>
				<p className="mt-2">{t("signup.linkExpiresIn15")}</p>
			</div>

			<div className="pt-4 border-t">
				<p className="text-sm text-kumo-subtle mb-2">{t("signup.didntReceiveEmail")}</p>
				<Button
					variant="outline"
					size="sm"
					onClick={onResend}
					disabled={isResending || resendCooldown > 0}
				>
					{isResending
						? t("signup.sending")
						: resendCooldown > 0
							? t("signup.resendIn", { seconds: resendCooldown })
							: t("signup.resendEmail")}
				</Button>
			</div>
		</div>
	);
}

interface VerifyStepProps {
	verifyResult: SignupVerifyResult;
	token: string;
	onBack: () => void;
}

function handleSignupSuccess() {
	// Redirect to admin dashboard after successful signup
	window.location.href = "/_emdash/admin";
}

function VerifyStep({ verifyResult, token, onBack: _onBack }: VerifyStepProps) {
	const t = useT();
	const [name, setName] = React.useState("");

	return (
		<div className="space-y-6">
			<div className="text-center">
				<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mx-auto mb-4">
					<svg
						className="w-8 h-8 text-green-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<h2 className="text-xl font-semibold">{t("signup.emailVerified")}</h2>
				<p className="text-kumo-subtle mt-2">
					{t("signup.signingUpAs", { role: verifyResult.roleName })}
				</p>
			</div>

			{/* Email display (read-only) */}
			<Input label={t("signup.email")} value={verifyResult.email} disabled className="bg-kumo-tint" />

			{/* Name input (optional) */}
			<Input
				label={t("signup.yourNameOptional")}
				type="text"
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder={t("signup.yourNamePlaceholder")}
				autoComplete="name"
			/>

			{/* Passkey registration */}
			<div className="pt-4 border-t">
				<h3 className="text-sm font-medium mb-3">{t("signup.createYourPasskey")}</h3>
				<p className="text-sm text-kumo-subtle mb-4">
					{t("signup.passkeysSecureDescription")}
				</p>

				<PasskeyRegistration
					optionsEndpoint="/_emdash/api/setup/admin"
					verifyEndpoint="/_emdash/api/auth/signup/complete"
					onSuccess={handleSignupSuccess}
					buttonText={t("common.createAccount")}
					additionalData={{ token, name: name || undefined }}
				/>
			</div>
		</div>
	);
}

interface ErrorStepProps {
	message: string;
	code?: string;
	onRetry?: () => void;
}

function ErrorStep({ message, code, onRetry }: ErrorStepProps) {
	const t = useT();
	return (
		<div className="space-y-6 text-center">
			<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-kumo-danger/10 mx-auto">
				<svg
					className="w-8 h-8 text-kumo-danger"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
			</div>

			<div>
				<h2 className="text-xl font-semibold text-kumo-danger">
					{code === "token_expired"
						? t("signup.linkExpired")
						: code === "invalid_token"
							? t("signup.invalidLink")
							: code === "user_exists"
								? t("signup.accountExists")
								: t("signup.somethingWentWrong")}
				</h2>
				<p className="text-kumo-subtle mt-2">{message}</p>
			</div>

			<div className="space-y-2">
				{code === "user_exists" ? (
					<Link to="/login">
						<Button className="w-full">{t("common.signUpInstead")}</Button>
					</Link>
				) : (
					onRetry && (
						<Button onClick={onRetry} className="w-full">
							{t("common.tryAgain")}
						</Button>
					)
				)}
				<Link to="/login">
					<Button variant="ghost" className="w-full">
						{t("login.backToLogin")}
					</Button>
				</Link>
			</div>
		</div>
	);
}

// ============================================================================
// Main Component
// ============================================================================

export function SignupPage() {
	const t = useT();
	const [step, setStep] = React.useState<SignupStep>("email");
	const [email, setEmail] = React.useState("");
	const [error, setError] = React.useState<string | undefined>();
	const [errorCode, setErrorCode] = React.useState<string | undefined>();
	const [isLoading, setIsLoading] = React.useState(false);
	const [verifyResult, setVerifyResult] = React.useState<SignupVerifyResult | null>(null);
	const [token, setToken] = React.useState<string | null>(null);
	const [resendCooldown, setResendCooldown] = React.useState(0);

	// Check for token in URL on mount
	React.useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const urlToken = params.get("token");

		if (urlToken) {
			setToken(urlToken);
			void verifyToken(urlToken);
		}
	}, []);

	// Resend cooldown timer
	React.useEffect(() => {
		if (resendCooldown > 0) {
			const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
			return () => clearTimeout(timer);
		}
	}, [resendCooldown]);

	const verifyToken = async (tokenToVerify: string) => {
		setIsLoading(true);
		setError(undefined);
		setErrorCode(undefined);

		try {
			const result = await verifySignupToken(tokenToVerify);
			setVerifyResult(result);
			setStep("verify");
		} catch (err) {
			const verifyError = err instanceof Error ? err : new Error(String(err));
			const errorWithCode = verifyError as Error & { code?: string };
			setError(verifyError.message);
			setErrorCode(typeof errorWithCode.code === "string" ? errorWithCode.code : undefined);
			setStep("error");
		} finally {
			setIsLoading(false);
		}
	};

	const handleEmailSubmit = async (submittedEmail: string) => {
		setIsLoading(true);
		setError(undefined);
		setEmail(submittedEmail);

		try {
			await requestSignup(submittedEmail);
			setStep("check-email");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to send verification email");
		} finally {
			setIsLoading(false);
		}
	};

	const handleResend = async () => {
		if (!email || resendCooldown > 0) return;

		setIsLoading(true);
		try {
			await requestSignup(email);
			setResendCooldown(60); // 60 second cooldown
		} catch {
			// Silently fail - don't reveal if email exists
		} finally {
			setIsLoading(false);
		}
	};

	const handleRetry = () => {
		setStep("email");
		setError(undefined);
		setErrorCode(undefined);
		setToken(null);
		// Clear token from URL
		window.history.replaceState({}, "", window.location.pathname);
	};

	// Loading state for token verification
	if (isLoading && token) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-kumo-base">
				<div className="text-center">
					<Loader />
					<p className="mt-4 text-kumo-subtle">{t("signup.verifyingLink")}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-kumo-base p-4">
			<div className="w-full max-w-md">
				{/* Header */}
				<div className="text-center mb-8">
					<LogoLockup className="h-10 mx-auto mb-2" />
					<h1 className="text-2xl font-semibold text-kumo-default">
						{step === "email" && t("signup.createAccount")}
						{step === "check-email" && t("signup.checkYourEmail")}
						{step === "verify" && t("signup.completeSignup")}
						{step === "error" && t("signup.oops")}
					</h1>
				</div>

				{/* Form Card */}
				<div className="bg-kumo-base border rounded-lg shadow-sm p-6">
					{step === "email" && (
						<EmailStep onSubmit={handleEmailSubmit} isLoading={isLoading} error={error} />
					)}

					{step === "check-email" && (
						<CheckEmailStep
							email={email}
							onResend={handleResend}
							isResending={isLoading}
							resendCooldown={resendCooldown}
						/>
					)}

					{step === "verify" && verifyResult && token && (
						<VerifyStep verifyResult={verifyResult} token={token} onBack={handleRetry} />
					)}

					{step === "error" && (
						<ErrorStep
							message={error ?? "An unknown error occurred"}
							code={errorCode}
							onRetry={handleRetry}
						/>
					)}
				</div>

				{/* Login link */}
				{step === "email" && (
					<p className="text-center mt-6 text-sm text-kumo-subtle">
						{t("signup.alreadyHaveAccount")}{" "}
						<Link to="/login" className="text-kumo-brand hover:underline font-medium">
							{t("common.signIn")}
						</Link>
					</p>
				)}
			</div>
		</div>
	);
}

export default SignupPage;
