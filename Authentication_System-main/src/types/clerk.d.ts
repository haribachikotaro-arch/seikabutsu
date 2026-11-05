export {};

declare global {
	interface UserPublicMetadata {
		role?: "admin" | "editor";
		inviteVerified?: boolean;
	}

	interface UserPrivateMetadata {
		inviteVerifiedAt?: string;
	}
}
