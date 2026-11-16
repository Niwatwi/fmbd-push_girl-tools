const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const typescript = require("typescript");

const filename = path.resolve(__dirname, "../utils/password.ts");
const source = fs.readFileSync(filename, "utf8");
const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS } }).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled, filename);
const { credentialStamp, hashPassword, verifyPassword } = loaded.exports;
const sessionFilename = path.resolve(__dirname, "../utils/session-token.ts");
const sessionSource = fs.readFileSync(sessionFilename, "utf8");
const sessionCompiled = typescript.transpileModule(sessionSource, { compilerOptions: { module: typescript.ModuleKind.CommonJS } }).outputText;
const sessionModule = new Module(sessionFilename, module);
sessionModule.filename = sessionFilename;
sessionModule.paths = module.paths;
sessionModule._compile(sessionCompiled, sessionFilename);
const { createUserSessionToken, verifyUserSessionToken } = sessionModule.exports;

test("password hashes verify and reject wrong passwords", async () => {
  const hash = await hashPassword("password example");
  assert.notEqual(hash, "password example");
  assert.deepEqual(await verifyPassword("password example", hash), { valid: true, needsUpgrade: false });
  assert.deepEqual(await verifyPassword("wrong", hash), { valid: false, needsUpgrade: false });
  assert.notEqual(await hashPassword("password example"), hash);
});

test("legacy passwords remain compatible and malformed hashes fail closed", async () => {
  assert.deepEqual(await verifyPassword("legacy", " legacy "), { valid: true, needsUpgrade: true });
  assert.deepEqual(await verifyPassword("wrong", "legacy"), { valid: false, needsUpgrade: true });
  assert.deepEqual(await verifyPassword("anything", "scrypt$v1$invalid"), { valid: false, needsUpgrade: false });
});

test("credential stamps change when the password or account changes", () => {
  process.env.APP_SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  const stamp = credentialStamp(1, "password-hash");
  assert.equal(stamp, credentialStamp(1, "password-hash"));
  assert.notEqual(stamp, credentialStamp(1, "different-hash"));
  assert.notEqual(stamp, credentialStamp(2, "password-hash"));
});

test("session tokens require a credential stamp and a valid signature", async () => {
  process.env.APP_SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  if (!globalThis.crypto) globalThis.crypto = require("node:crypto").webcrypto;
  const session = { id: 1, display_name: "User", company_tag: "BA", area: "A", image_url: "", role: "staff", credential_stamp: credentialStamp(1, "hash") };
  const token = await createUserSessionToken(session);
  assert.equal((await verifyUserSessionToken(token)).id, 1);
  assert.equal(await verifyUserSessionToken(`${token}invalid`), null);
  const legacyToken = await createUserSessionToken({ ...session, credential_stamp: undefined });
  assert.equal(await verifyUserSessionToken(legacyToken), null);
});