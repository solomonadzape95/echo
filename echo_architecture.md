# Anonymous Web2 Voting App – Architecture & Build Guide

This document explains the **structure, architecture, and flow** of an anonymous voting application using **Web2 technologies** and **blind signatures**. It is written so that a **high school student** (or any new developer) can understand *what to build and why*, without unnecessary theory.

The goal of the system is:
- One person can vote **only once per election**
- No one (not even admins) can link **who voted** to **what they voted**
- A voter can later **verify their vote was counted**

---

## 1. Core Idea (In Simple Terms)

The system separates **identity** from **voting**.

- Identity is used **only to check eligibility**
- Voting uses a **random voting pass (token)** that has no name on it
- Once voting starts, the system no longer knows *who* is voting

This is achieved using:
- Client‑generated random tokens
- Blind signatures
- Strict database rules

---

## 2. Main Actors (Who Does What)

### Voter (User)
- Logs in
- Checks if they are eligible
- Casts a vote
- Receives a verification code (receipt)

### Registration Authority (RA)
- Knows who users are
- Confirms eligibility
- Signs voting tokens **without seeing them**
- Never sees votes

### Election Authority (EA / Ballot Box)
- Accepts votes
- Checks tokens are valid and unused
- Stores votes anonymously
- Publishes verification ledger

No single actor can connect **identity → vote**.

---

## 3. High‑Level Voting Flow

1. User logs in
2. User opens ballot
3. System checks eligibility (read‑only)
4. User submits vote
5. Backend (in one transaction):
   - Confirms eligibility
   - Signs blinded token
   - Verifies signature
   - Stores vote
   - Marks token as used
   - Generates receipt
6. User sees confirmation + verification code
7. Later, user can check public ledger with receipt

---

## 4. User Experience (What the User Sees)

The user never sees:
- Tokens
- Blind signatures
- Cryptography

They only see:
- “You are eligible to vote”
- “Vote submitted successfully”
- A short verification code (optional)

Voting happens **on one device**, in **one smooth flow**.

---

## 5. API Endpoints

### Public / Voter‑Facing Endpoints

#### `POST /verify-eligibility`
Checks if a logged‑in user is allowed to vote in an election.

- Read‑only
- No tokens created
- No state changes

Response:
```json
{ "eligible": true }
```

---

#### `POST /vote`
Main voting endpoint. **Everything important happens here.**

This endpoint (atomically):
- Confirms eligibility
- Accepts blinded token
- Signs token
- Verifies signature
- Stores vote
- Marks token as used
- Creates receipt

If anything fails → nothing is saved.

Response:
```json
{ "success": true, "receipt": "AB92F3X" }
```

---

#### `GET /check-ledger`
Allows anyone to verify that a receipt exists.

- Public
- Read‑only
- No identity info

Response:
```json
{ "found": true }
```

---

### Admin Endpoints (Separated)

- `/admin/election`
- `/admin/candidate`
- `/admin/class`
- `/admin/dept`
- `/admin/faculty`
- `/admin/upload-masterlist`

Admins **never** access votes or tokens.

---

## 6. Database Choice

**PostgreSQL (SQL)** is required.

Why:
- Strong transactions
- Strict uniqueness rules
- Concurrency safety
- Auditable structure

MongoDB is not recommended for this system.

---

## 7. Database Schema (Core Tables)

### Voter (Identity Only)
```
Voter
- id
- username
- regNo
- fullname
- classId
- createdAt
```

Used **only** for eligibility checks.

---

### Issuances (Eligibility Tracking)
```
Issuances
- id
- userId
- electionId
- issuedAt
```

Tracks:
- One issuance per user per election
- No tokens stored here

---

### VotingToken (Anonymous)
```
VotingToken
- electionId
- tokenHash (UNIQUE)
- usedAt
```

- Raw token is never stored
- Prevents double voting

---

### Vote (Anonymous)
```
Vote
- id
- electionId
- ballotEncrypted
- createdAt
```

⚠️ No userId
⚠️ No voterId

---

### Receipts (Verification Ledger)
```
Receipts
- id
- electionId
- receiptHash
- createdAt
```

Used to let voters confirm inclusion.

---

## 8. Atomic Transaction Rule (Very Important)

When a vote is cast, the following must succeed **together**:

- Vote stored
- Token marked used
- Receipt created

If any step fails → **rollback everything**.

This prevents:
- Lost votes
- Used tokens without votes
- Missing receipts

---

## 9. Student Masterlist (CSV Upload)

Admins upload CSV files per class.

Rules:
- Unique registration numbers
- No edits during election
- Versioned uploads

Eligibility is derived from:
- Class
- Department
- Faculty

---

## 10. Security Rules (Non‑Negotiable)

- Never store raw tokens
- Never store voterId in votes
- Never allow joins between voter and vote tables
- Keep eligibility and voting databases logically separated

---

## 11. What This System Guarantees

- One person → one vote
- Votes are anonymous
- Double voting is impossible
- Voters can verify inclusion
- Admins cannot see how anyone voted

---

## 12. Final Summary

This app works by **checking identity once**, then **throwing it away** before voting starts. Voting is done using anonymous, one‑time passes that are impossible to trace back to users, while still allowing verification and auditability.

Anyone following this document can build the system correctly without breaking anonymity.

