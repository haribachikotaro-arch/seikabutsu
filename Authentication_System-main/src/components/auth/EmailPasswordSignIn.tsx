"use client";

import { useClerk, useSignIn } from "@clerk/nextjs";
import { IconArrowRight, IconLock } from "@tabler/icons-react";
import {
	Alert,
	Button,
	Flex,
	FormControl,
	Input,
	PasswordInput,
	Text,
} from "@yamada-ui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { SIGN_IN_FAILURE_MESSAGE } from "~/lib/clerk-error-code";

export default function EmailPasswordSignIn() {
	const router = useRouter();
	const { signIn, fetchStatus } = useSignIn();
	const clerk = useClerk();
	const { signOut } = clerk;
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [inviteCode, setInviteCode] = useState("");
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const submissionLock = useRef(false);

	const pending = submitting || fetchStatus === "fetching";

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending || submissionLock.current) return;
		submissionLock.current = true;
		setSubmitting(true);
		setError("");
		let sessionStarted = false;
		let authenticationCompleted = false;

		try {
			// Require a fresh password check even when this browser is signed in.
			if (
				clerk.session ||
				clerk.client?.sessions.some((session) => session.status === "active")
			) {
				await signOut(async () => {});
			}
			const passwordResult = await signIn.password({
				emailAddress: email.trim().toLowerCase(),
				password,
			});
			if (passwordResult.error) {
				setError(SIGN_IN_FAILURE_MESSAGE);
				return;
			}

			if (signIn.status !== "complete") {
				setError(SIGN_IN_FAILURE_MESSAGE);
				return;
			}

			let destination = "/portal";
			// Finalize may create a session even when its response fails.
			sessionStarted = true;
			const finalizeResult = await signIn.finalize({
				navigate: async ({ decorateUrl }) => {
					destination = decorateUrl("/portal");
				},
			});
			if (finalizeResult.error) {
				setError(SIGN_IN_FAILURE_MESSAGE);
				return;
			}

			const response = await fetch("/api/invite/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code: inviteCode }),
			});
			const result = (await response.json()) as {
				ok?: boolean;
				error?: string;
			};
			if (!response.ok || result.ok !== true) {
				setError(SIGN_IN_FAILURE_MESSAGE);
				return;
			}

			authenticationCompleted = true;
			if (destination.startsWith("/") && !destination.startsWith("//")) {
				router.replace(destination);
			} else {
				window.location.assign(destination);
			}
		} catch {
			setError(SIGN_IN_FAILURE_MESSAGE);
		} finally {
			if (sessionStarted && !authenticationCompleted) {
				try {
					await signOut(async () => {});
				} catch {
					// Portal access still requires a valid session-bound invite cookie.
					setError(SIGN_IN_FAILURE_MESSAGE);
				}
			}
			submissionLock.current = false;
			setSubmitting(false);
		}
	}

	return (
		<form onSubmit={submit}>
			<Flex direction="column" gap="5">
				<Flex align="center" gap="3" color="banner">
					<IconLock />
					<Text fontWeight="bold">3つの情報でログイン</Text>
				</Flex>
				<FormControl label="学校メールアドレス" required>
					<Input
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						autoComplete="email"
						borderRadius="0"
					/>
				</FormControl>
				<FormControl label="パスワード" required>
					<PasswordInput
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						autoComplete="current-password"
						inputProps={{ borderRadius: "0" }}
					/>
				</FormControl>
				<FormControl label="秘密の暗号" required>
					<Input
						type="password"
						value={inviteCode}
						onChange={(event) => setInviteCode(event.target.value)}
						autoComplete="off"
						minLength={8}
						maxLength={128}
						borderRadius="0"
					/>
				</FormControl>
				{error && (
					<Alert status="error" variant="subtle" role="alert">
						{error}
					</Alert>
				)}
				<Button
					type="submit"
					borderRadius="0"
					bgColor="banner"
					color="white"
					endIcon={<IconArrowRight />}
					disabled={
						pending ||
						!email.trim() ||
						!password ||
						inviteCode.trim().length < 8
					}
				>
					{pending ? "確認しています…" : "ログイン"}
				</Button>
				<Text textAlign="center" fontSize="sm" color="gray.600">
					アカウントをお持ちでない場合は <Link href="/sign-up">新規登録</Link>
				</Text>
			</Flex>
		</form>
	);
}
