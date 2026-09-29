# Card payment PIN

Each saved card can have its own user-created 3–4 digit Toppay PIN. It is separate
from a bank card's CVV and the account login PIN. Add Card requires the PIN twice;
older saved cards offer Set card payment PIN for one-time enrollment.

Firestore stores `paymentPin: { version, salt, hash }` on
`users/{uid}/paymentMethods/{id}`. The unique user/card document identity supplies
the salt. Scrypt uses N=16384, r=8, p=5 and a 32-byte digest. No readable payment
PIN is stored in card metadata, transaction documents, route parameters, or logs.
The public card model exposes only `hasPaymentPin`.

Before creating a pending Add Balance request using a saved card, the wallet
service fetches its current record from the server and checks the PIN. Failed
attempts are recorded transactionally; five failures cause a five-minute cooldown
in the app. A missing PIN, removed card, changed PIN record, or offline read fails
closed. The field is cleared when switching cards and after PIN rejection/success.
New, unsaved card requests keep their existing one-time form; they do not have a
saved Toppay PIN until enrolled through Cards & Banks.

## Security boundary

This is an **app-level check for the existing pending-request flow**, not server
authorization or a real card charge. This repository has no payment backend or
managed Firestore security rules. A modified client can bypass client checks, read
the hash if permitted, or manipulate client-written attempt counters. A short PIN
also has limited guessing resistance even when hashed. Before using this for real
payment authorization, move secret storage, verification, attempt limits and
transaction creation to an authenticated backend, deny direct client writes to
those records, and keep verification records inaccessible to clients. No PIN
verification status is persisted as proof of authorization.

Validation: `npm run test:card-pin`, `npx tsc --noEmit`, and `npm run lint`.
