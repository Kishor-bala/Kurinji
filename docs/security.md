# SECURITY & PRIVACY POLICY
## Voice-Based Vocabulary Learning Platform

### 1. Acoustic Recording Privacy & Consent
- Voice recordings are sensitive demographic and biometric data.
- All 22 dataset speakers have verified consent recorded in the `speakers` table.
- Original speaker names are pseudonymous in client-facing endpoints; internal speaker IDs (`S01`, `S02`) are decoupled from student practice records.
- Raw voice inputs from students are never utilized for model retraining without explicit administrator and student consent.

### 2. Authentication & Authorization (RBAC)
- **Password Hashing:** Argon2id (RFC 9106 parameters: $t=3$, $m=65536$, $p=4$). Plaintext passwords or weak MD5/SHA hashes are strictly forbidden.
- **Session Tokens:** Signed JWT tokens with HS256 and 24-hour expiration.
- **Role Isolation:**
  - `student`: Can browse vocabulary, record practice attempts, take quizzes, and chat with AI tutor.
  - `teacher`: Can create lessons, assign quizzes to students, and propose vocabulary corrections.
  - `admin`: Can approve dataset releases, execute vector reconciliations, and review audit logs.

### 3. Prompt Injection Defense
- User chat messages and database context are treated as untrusted data.
- System instructions are strictly segregated from retrieved context.
- The AI tutor has no write access to PostgreSQL; any vocabulary correction proposed by a student or teacher enters the `correction_reports` queue for mandatory administrator review.
- Output from Gemini / Groq is validated against a Pydantic schema; references to unverified Word IDs are stripped or replaced with canonical PostgreSQL data.
