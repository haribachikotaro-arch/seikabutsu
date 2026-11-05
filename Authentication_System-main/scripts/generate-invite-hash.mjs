import { randomBytes, scryptSync } from "node:crypto";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

if (!stdin.isTTY) {
	throw new Error("このコマンドは対話可能なターミナルで実行してください。");
}

let muted = false;
const output = new Writable({
	write(chunk, encoding, callback) {
		if (!muted) stdout.write(chunk, encoding);
		callback();
	},
});

const terminal = createInterface({ input: stdin, output, terminal: true });
muted = true;
stdout.write("招待コードを入力してください（8文字以上・入力内容は非表示）: ");
const code = (await terminal.question("")).trim().normalize("NFKC");
muted = false;
stdout.write("\n");
terminal.close();

if (code.length < 8) {
	throw new Error("招待コードは8文字以上にしてください。");
}

const salt = randomBytes(24);
const hash = scryptSync(code, salt, 64);
stdout.write("次の1行を .env.local に設定してください。\n\n");
stdout.write(
	`DATADREAMERS_INVITE_CODE_HASH=scrypt\\$${salt.toString("base64url")}\\$${hash.toString("base64url")}\n`,
);
