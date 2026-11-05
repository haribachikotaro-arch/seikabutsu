"use client";

import { IconArrowRight, IconKey } from "@tabler/icons-react";
import {
	Alert,
	Button,
	Flex,
	FormControl,
	Input,
	Text,
} from "@yamada-ui/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { VERIFICATION_FAILURE_MESSAGE } from "~/lib/clerk-error-code";

export default function InviteForm() {
	const [code, setCode] = useState("");
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);
	const router = useRouter();

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) return;
		setPending(true);
		setError("");

		try {
			const response = await fetch("/api/invite/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code }),
			});
			const result = (await response.json()) as {
				ok?: boolean;
				error?: string;
			};

			if (!response.ok || result.ok !== true) {
				setError(VERIFICATION_FAILURE_MESSAGE);
				return;
			}

			// The portal reads current membership from Clerk on the server.
			router.replace("/portal");
		} catch {
			setError(VERIFICATION_FAILURE_MESSAGE);
		} finally {
			setPending(false);
		}
	}

	return (
		<form onSubmit={submit}>
			<Flex direction="column" gap="5">
				<Flex align="center" gap="3">
					<IconKey color="#0E416B" />
					<Text fontWeight="bold">秘密の暗号を入力</Text>
				</Flex>
				<FormControl label="Data Dreamers 招待コード" required>
					<Input
						type="password"
						value={code}
						onChange={(event) => setCode(event.target.value)}
						autoComplete="one-time-code"
						minLength={8}
						maxLength={128}
						borderRadius="0"
						placeholder="8文字以上の招待コード"
					/>
				</FormControl>
				<Text color="gray.600" fontSize="sm">
					招待コードはData
					Dreamersの運営担当者から共有されたものを使用してください。
				</Text>
				{error && (
					<Alert status="error" variant="subtle">
						{error}
					</Alert>
				)}
				<Button
					type="submit"
					borderRadius="0"
					bgColor="banner"
					color="white"
					endIcon={<IconArrowRight />}
					disabled={pending || code.trim().length < 8}
					_hover={{ bgColor: "blue.800" }}
				>
					{pending ? "確認しています…" : "メンバー確認を完了"}
				</Button>
			</Flex>
		</form>
	);
}
