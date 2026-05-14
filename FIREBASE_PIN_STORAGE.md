# Firebase Account Setup Implementation

## Overview
This implementation creates a Firebase account from Google Sign-In, asks the user to set a 4-digit PIN, and prepares the Firestore paths needed for wallet balance, reward points, and transaction history.

## How It Works

### New User Flow
1. **Google Sign-In** → User authenticates with Google
2. **Check Firebase** → System checks if user exists in Firestore
3. **PIN Setup** → New users set up a 4-digit PIN
4. **Create Account Data** → User profile, wallet summary, and initial transaction path are created
5. **Local Cache** → Account is cached locally so future app opens can show PIN login

### Returning User Flow
1. **Google Sign-In** → User authenticates with Google
2. **PIN Required** → System caches the existing account and asks the user to unlock with PIN
3. **Fallback** → If local data already exists, the app can go straight to PIN login

## Database Structure

### users/{userId}
```json
{
  "uid": "firebase-user-id",
  "name": "User Name",
  "email": "user@example.com",
  "initials": "UN",
  "provider": "google",
  "authProvider": "google.com",
  "hasPin": true,
  "pin": "1234",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### users/{userId}/wallet/summary
```json
{
  "uid": "firebase-user-id",
  "balance": 0,
  "currency": "BDT",
  "rewardPoints": 0,
  "monthlyLimit": 150000,
  "monthlyUsed": 0,
  "status": "active",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### users/{userId}/transactions/account-created
```json
{
  "id": "account-created",
  "type": "system",
  "title": "Account created",
  "amount": 0,
  "currency": "BDT",
  "status": "Completed",
  "createdAt": "timestamp"
}
```

### users/{userId}/personalInformation/profile
```json
{
  "uid": "firebase-user-id",
  "fullName": "User Name",
  "fatherName": "Father Name",
  "address": "Full address",
  "zipCode": "1212",
  "documentType": "nid",
  "nidFrontPhoto": "local-or-storage-uri",
  "nidBackPhoto": "local-or-storage-uri",
  "passportFrontPhoto": "local-or-storage-uri",
  "passportBackPhoto": "local-or-storage-uri",
  "isComplete": true,
  "verificationStatus": "under_review",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

The app also mirrors this small status onto `users/{userId}`:

```json
{
  "name": "User Name",
  "hasPersonalInformation": true,
  "personalInformationStatus": "under_review",
  "updatedAt": "timestamp"
}
```

### bonus/sendmoney
```json
{
  "percentis": 1.2
}
```

### bonus/cashout
```json
{
  "percentis": 0.4
}
```

`percentis` is the visible percentage number. For example, `1.2` means 1.2%, so a BDT 1,000 send money request shows BDT 12 bonus.

### account/{methodId}
```json
{
  "number": "01700000000"
}
```

Add money account numbers are loaded from these documents:

```txt
account/bkash
account/nagad
account/rocket
account/mcash
account/islami-bank-plc
account/ific-bank-plc
account/city-bank-plc
account/bank-asia-plc
```

The add money page reads the `number` field from the selected method document.

## Wallet Request Status Flow

All money actions now follow the same status model:

```txt
User submits request
  -> users/{uid}/transactions/{transactionId}
       status: "pending"
       balanceApplied: false

  -> transactionRequests/{transactionId}
       status: "pending"
       balanceApplied: false

Admin approves request
  -> users/{uid}/transactions/{transactionId}
       status: "done"
       balanceApplied: true

  -> transactionRequests/{transactionId}
       status: "done"
       balanceApplied: true

  -> users/{uid}/wallet/summary
       balance: balance + balanceImpact
       updatedAt: timestamp
```

### Request Documents

```txt
transactionRequests/{transactionId}
users/{uid}/transactions/{transactionId}
```

Both documents use the same id so the user app and admin dashboard can stay in sync.

```json
{
  "id": "firestore-doc-id",
  "requestId": "ADD-ABC123",
  "uid": "firebase-user-id",
  "type": "add_balance | send_money | cash_out | mobile_recharge | bill_payment",
  "title": "Add balance via bKash",
  "method": "bKash",
  "amount": 5000,
  "fee": 0,
  "bonus": 0,
  "totalDebit": 0,
  "currency": "BDT",
  "status": "pending",
  "direction": "in | out | neutral",
  "balanceImpact": 5000,
  "balanceApplied": false,
  "trxId": "TXN8A91K24",
  "receiverName": "Receiver name",
  "receiverPhone": "01700000000",
  "receiverAccount": "01700000000",
  "billingId": "BILLING-123456",
  "billerCategory": "electricity | internet",
  "billDate": "2026-05-15",
  "billType": "prepaid | postpaid",
  "note": "Optional note",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### App Read Conditions

```ts
if (transaction.status === 'pending') {
  // Show in Pending Transactions page.
}

if (transaction.status === 'done') {
  // Show in Activity page.
  // Wallet balance should already be updated by the admin/server approval.
}
```

### Balance Impact Examples

```txt
Add balance BDT 1,000
  status pending: balance unchanged
  status done: balanceImpact = +1000

Send money BDT 500
  status pending: balance unchanged
  status done: balanceImpact = -500

Cash out BDT 1,000 with BDT 18.50 charge
  status pending: balance unchanged
  status done: balanceImpact = -1018.50

Mobile recharge BDT 100
  status pending: balance unchanged
  status done: balanceImpact = -100

Bill payment BDT 1,200
  status pending: balance unchanged
  status done: balanceImpact = -1200
```

For production, the approval step should be a Cloud Function or admin-only dashboard action. The client app should not mark its own transactions as done.

## Security Considerations

⚠️ **Important**: PINs are currently stored in plain text for development. For production:

1. **Encrypt PINs** before storing in Firebase
2. **Use Firebase Security Rules** to restrict access
3. **Implement PIN hashing** with salt
4. **Add rate limiting** for PIN attempts
5. **Consider biometric authentication** as primary method

## Key Functions

- `saveUserProfile()` - Stores user data, PIN, wallet summary, and account-created transaction
- `getUserPin()` - Retrieves PIN from Firebase
- `userExistsInFirebase()` - Checks if user account exists
- `connectGoogleAccount()` - Handles Google auth and prepares returning users for PIN unlock
- `setupWithGoogle()` - Creates new account with PIN
- `loginWithPin()` - Verifies PIN against Firebase/local cache

## Benefits

✅ **Cross-device login** - Access account from any device
✅ **Secure storage** - PINs backed up in Firebase
✅ **Offline support** - Local cache for offline PIN verification
✅ **Backward compatibility** - Works with existing local accounts
✅ **PIN-first returning login** - Returning users unlock with PIN after account setup

## Testing

To test the implementation:

1. **New User**: Sign in with Google → Set PIN → Check Firebase console
2. **Returning User**: Sign out → Sign in again → Should ask for PIN
3. **PIN Login**: Enter the 4-digit PIN → Should unlock the app
