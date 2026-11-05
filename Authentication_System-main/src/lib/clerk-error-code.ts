export const SIGN_IN_FAILURE_MESSAGE =
	"パスワードまたは秘密の暗号が正しくありません。";
export const SIGN_UP_FAILURE_MESSAGE =
	"登録を完了できませんでした。入力内容を確認し、時間をおいて再試行してください。";
export const VERIFICATION_FAILURE_MESSAGE =
	"認証を完了できませんでした。入力内容を確認し、時間をおいて再試行してください。";

/** For internal diagnostics only; never render account-specific codes. */
export function clerkErrorCode(error: unknown): string {
	if (!error || typeof error !== "object") return "unknown";
	if ("errors" in error && Array.isArray(error.errors)) {
		const nested = clerkErrorCode(error.errors[0]);
		if (nested !== "unknown") return nested;
	}
	if (
		"code" in error &&
		typeof error.code === "string" &&
		/^[a-z0-9_]{1,100}$/.test(error.code)
	)
		return error.code;
	return "unknown";
}

/** Never distinguish unknown accounts, invalid credentials or locked accounts. */
export function signInErrorMessage(_error: unknown): string {
	return SIGN_IN_FAILURE_MESSAGE;
}

/** Never expose email registration status or provider configuration. */
export function signUpErrorMessage(_error: unknown): string {
	return SIGN_UP_FAILURE_MESSAGE;
}
