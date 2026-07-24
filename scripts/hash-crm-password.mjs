import { randomBytes, scryptSync } from "node:crypto";

const COST = 32768;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      reject(new Error("Run this command in an interactive terminal."));
      return;
    }

    let value = "";
    process.stdout.write(prompt);
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();

    function finish(error) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    }

    function onData(data) {
      for (const character of data) {
        if (character === "\u0003") {
          finish(new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") value = value.slice(0, -1);
        else if (character !== "\u001b") value += character;
      }
    }

    process.stdin.on("data", onData);
  });
}

try {
  const password = await readHidden("CRM password: ");
  const confirmation = await readHidden("Confirm password: ");

  if (password !== confirmation) throw new Error("Passwords do not match.");
  if (password.length < 14) throw new Error("Use at least 14 characters.");
  if (password.length > 256) throw new Error("Password must be 256 characters or fewer.");

  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  });

  const encoded = [
    "scrypt", COST, BLOCK_SIZE, PARALLELIZATION,
    salt.toString("base64url"), hash.toString("base64url"),
  ].join("$");

  process.stdout.write(`\nCRM_PASSWORD_HASH=${encoded}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Could not generate password hash.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
