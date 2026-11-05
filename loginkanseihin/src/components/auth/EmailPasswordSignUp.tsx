"use client";

import { useClerk, useSignUp } from "@clerk/nextjs";
import { IconArrowRight, IconMail, IconMailCheck } from "@tabler/icons-react";
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
import {
	SIGN_UP_FAILURE_MESSAGE,
	VERIFICATION_FAILURE_MESSAGE,
	signUpErrorMessage,
} from "~/lib/clerk-error-code";

type Props = {
	allowedDomains: string[];
};

export default function EmailPasswordSignUp({ allowedDomains }: Props) {
	const router = useRouter();
	const { signUp, fetchStatus } = useSignUp();
	const clerk = useClerk();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirmation, setPasswordConfirmation] = useState("");
	const [verificationCode, setVerificationCode] = useState("");
	const [verifying, setVerifying] = useState(false);
	const [localError, setLocalError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const submissionLock = useRef(false);
	const pending = submitting || fetchStatus === "fetching";
	const passwordTooShort = password.length > 0 && password.length < 8;
	const passwordsMismatch =
		passwordConfirmation.length > 0 && password !== passwordConfirmation;

	async function register(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending || submissionLock.current) return;
		setLocalError("");
		const normalizedEmail = email.trim().toLowerCase();
		const domain = normalizedEmail.split("@").at(-1);
		if (!domain || !allowedDomains.includes(domain)) {
			setLocalError(
				`許可された学校メール（${allowedDomains.map((item) => `@${item}`).join(" / ")}）を入力してください。`,
			);
			return;
		}
		if (password.length < 8) {
			setLocalError("パスワードは8文字以上で入力してください。");
			return;
		}
		if (password !== passwordConfirmation) {
			setLocalError("確認用パスワードが一致しません。");
			return;
		}

		submissionLock.current = true;
		setSubmitting(true);
		try {
			if (
				clerk.session ||
				clerk.client?.sessions.some((session) => session.status === "active")
			) {
				await clerk.signOut(async () => {});
			}
			const { error } = await signUp.password({
				emailAddress: normalizedEmail,
				password,
			});
			if (error) {
				setLocalError(signUpErrorMessage(error));
				return;
			}
			const sendResult = await signUp.verifications.sendEmailCode();
			if (!sendResult.error) setVerifying(true);
			else
				setLocalError(SIGN_UP_FAILURE_MESSAGE);
		} catch {
			setLocalError(SIGN_UP_FAILURE_MESSAGE);
		} finally {
			submissionLock.current = false;
			setSubmitting(false);
		}
	}

	async function verify(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending || submissionLock.current) return;
		submissionLock.current = true;
		setSubmitting(true);
		setLocalError("");
		try {
			const { error } = await signUp.verifications.verifyEmailCode({
				code: verificationCode.trim(),
			});
			if (error || signUp.status !== "complete") {
				setLocalError(VERIFICATION_FAILURE_MESSAGE);
				return;
			}
			const result = await signUp.finalize({
				navigate: ({ session, decorateUrl }) => {
					if (session.currentTask) {
						setLocalError(VERIFICATION_FAILURE_MESSAGE);
						return;
					}
					const destination = decorateUrl("/join");
					if (destination.startsWith("/") && !destination.startsWith("//")) {
						router.replace(destination);
					} else {
						window.location.assign(destination);
					}
				},
			});
			if (result.error) setLocalError(VERIFICATION_FAILURE_MESSAGE);
		} catch {
			setLocalError(VERIFICATION_FAILURE_MESSAGE);
		} finally {
			submissionLock.current = false;
			setSubmitting(false);
		}
	}

	async function resendCode() {
		if (pending || submissionLock.current) return;
		submissionLock.current = true;
		setSubmitting(true);
		setLocalError("");
		try {
			const result = await signUp.verifications.sendEmailCode();
			if (result.error) setLocalError(VERIFICATION_FAILURE_MESSAGE);
		} catch {
			setLocalError(VERIFICATION_FAILURE_MESSAGE);
		} finally {
			submissionLock.current = false;
			setSubmitting(false);
		}
	}

	if (verifying) {
		return (
			<form onSubmit={verify}>
				<Flex direction="column" gap="5">
					<IconMailCheck size={34} color="#0E416B" />
					<Text fontWeight="bold">メールへ確認コードを送信しました</Text>
					<Text color="gray.600" fontSize="sm">
						{email} に届いた数字を入力してください。
					</Text>
					<FormControl label="メール確認コード" required>
						<Input
							value={verificationCode}
							onChange={(event) => setVerificationCode(event.target.value)}
							autoComplete="one-time-code"
							inputMode="numeric"
							borderRadius="0"
						/>
					</FormControl>
					{localError && (
						<Alert status="error" variant="subtle">
							{localError}
						</Alert>
					)}
					<Button
						type="submit"
						borderRadius="0"
						bgColor="banner"
						color="white"
						disabled={pending || !verificationCode.trim()}
					>
						{pending ? "確認しています…" : "メール認証を完了"}
					</Button>
					<Button
						type="button"
						variant="ghost"
						borderRadius="0"
						onClick={resendCode}
						disabled={pending}
					>
						確認コードを再送
					</Button>
				</Flex>
			</form>
		);
	}

	return (
		<form onSubmit={register}>
			<Flex direction="column" gap="5">
				<Flex align="center" gap="3" color="banner">
					<IconMail />
					<Text fontWeight="bold">学校メールでアカウントを作成</Text>
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
						id="sign-up-password"
						value={password}
						onChange={(event) => {
							setPassword(event.target.value);
							if (localError === "確認用パスワードが一致しません。") {
								setLocalError("");
							}
						}}
						autoComplete="new-password"
						aria-describedby="sign-up-password-requirement"
						minLength={8}
						inputProps={{ borderRadius: "0" }}
					/>
					<Text
						id="sign-up-password-requirement"
						mt="2"
						fontSize="sm"
						color={passwordTooShort ? "red.600" : "gray.600"}
					>
						8文字以上で入力してください。
					</Text>
				</FormControl>
				<FormControl label="パスワード（確認）" required>
					<PasswordInput
						value={passwordConfirmation}
						onChange={(event) => {
							setPasswordConfirmation(event.target.value);
							if (localError === "確認用パスワードが一致しません。") {
								setLocalError("");
							}
						}}
						autoComplete="new-password"
						minLength={8}
						inputProps={{ borderRadius: "0" }}
					/>
				</FormControl>
				{passwordsMismatch && (
					<Alert status="warning" variant="subtle">
						確認用パスワードが一致しません。
					</Alert>
				)}
				{localError && (
					<Alert status="error" variant="subtle">
						{localError}
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
						password.length < 8 ||
						passwordConfirmation.length < 8 ||
						passwordsMismatch
					}
				>
					{pending ? "送信しています…" : "確認コードを送信"}
				</Button>
				<div id="clerk-captcha" />
				<Text textAlign="center" fontSize="sm" color="gray.600">
					登録済みの場合は <Link href="/sign-in">ログイン</Link>
				</Text>
			</Flex>
		</form>
	);
}
