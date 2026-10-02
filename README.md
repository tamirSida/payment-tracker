# Tally - Payment Debt Tracker

A mobile-first Next.js app that tracks recurring payments and how much you owe. Data and auth are handled by Firebase, and the app is hosted on Netlify.

## How it works

- **Payment**: a name, a price, a currency (USD / EUR / NIS), a start date, an end date or "no end", and a schedule:
  - daily (every N days)
  - weekly (every N weeks, on one or more weekdays)
  - monthly (every N months, on a day of the month; days past the month's end fall on its last day)
- **Charges** come from the schedule, from the start date through today. Nothing is stored for them.
- **Balance** = total paid - (charges x price). A negative balance is debt. A positive balance is credit that goes toward future charges.
- **Pay** records one payment, N payments (N defaults to the payment's "quick multi-pay" setting), the exact balance owed, or a custom amount. Each can have an optional note and date.

Data lives at `users/{uid}/payments/*` and `users/{uid}/transactions/*`. The rules in `firestore.rules` restrict each user to their own data.

## Setup

1. Firebase console > Authentication > Sign-in method: enable **Email/Password**.
2. Firebase console > Authentication > Users: **add your user**. The app has no sign-up screen.
3. Firebase console > Firestore: create the database and publish the rules from `firestore.rules`. You can also run `firebase deploy --only firestore:rules`, but note that this **replaces** any existing rules in the project.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000, against the real Firebase project
npm test           # schedule / balance unit tests
```

### Local emulators (no real data touched)

Needs Java.

```bash
firebase emulators:start --only auth,firestore --project relp-d6046
node scripts/seed-emulator.mjs                   # creates qa@test.dev / password123
NEXT_PUBLIC_USE_EMULATORS=true npm run dev
```

## Deploy (Netlify)

Connect the repo in Netlify. `netlify.toml` sets the build command, and Netlify's Next.js runtime is picked up automatically. No environment variables are needed.
