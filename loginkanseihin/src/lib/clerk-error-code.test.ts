import { describe, expect, it } from "vitest";
import {
	clerkErrorCode,
	signInErrorMessage,
	signUpErrorMessage,
} from "./clerk-error-code";

describe("clerkErrorCode", () => {
	it("reads the direct ClerkError returned by signIn.password", () => {
		expect(
			clerkErrorCode({ clerkError: true, code: "form_password_incorrect" }),
		).toBe("form_password_incorrect");
	});
	it("prefers the specific API error over its wrapper", () => {
		expect(
			clerkErrorCode({
				code: "api_response_error",
				errors: [{ code: "session_exists" }],
			}),
		).toBe("session_exists");
	});
	it("does not classify unknown errors as network failures or expose messages", () => {
		for (const error of [
			null,
			new Error("private detail"),
			{ code: "private detail" },
			{ errors: [] },
		]) {
			expect(clerkErrorCode(error)).toBe("unknown");
		}
	});
});

const privateErrors = [
  { code: "form_identifier_not_found" },
  { code: "form_identifier_exists" },
  { code: "form_identifier_exists__email_address" },
  { code: "form_password_incorrect" },
  { code: "form_password_or_identifier_incorrect" },
  { code: "invalid_invite_code" },
  { code: "user_locked" },
  { code: "session_exists" },
  { code: "strategy_not_enabled" },
  { errors: [{ code: "form_identifier_not_found", message: "private detail" }] },
  { code: "unsafe error code", message: "secret credential" },
  new Error("private service detail"),
  null,
];

describe("public authentication errors", () => {
  it.each(privateErrors)("returns identical login errors: %j", (error) => {
    expect(signInErrorMessage(error)).toBe(
      "パスワードまたは秘密の暗号が正しくありません。",
    );
  });

  it.each(privateErrors)("does not disclose registration status: %j", (error) => {
    expect(signUpErrorMessage(error)).toBe(
      "登録を完了できませんでした。入力内容を確認し、時間をおいて再試行してください。",
    );
  });
});
