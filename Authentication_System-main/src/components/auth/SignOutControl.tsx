"use client";

import { useClerk } from "@clerk/nextjs";
import { Button } from "@yamada-ui/react";

export default function SignOutControl() {
	const { signOut } = useClerk();

	return (
		<Button
			type="button"
			variant="outline"
			borderRadius="0"
			onClick={() => signOut({ redirectUrl: "/" })}
		>
			別のアカウントを使う
		</Button>
	);
}
