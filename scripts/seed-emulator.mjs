// Creates a QA user in the local Auth emulator. Usage: node scripts/seed-emulator.mjs
const res = await fetch(
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "qa@test.dev", password: "password123", returnSecureToken: true }),
  },
);
console.log(res.status, (await res.json()).email ?? "failed");
