-- Historical migration: it originally hardcoded the Telegram customer bot
-- webhook secret in plain text. The literal has been removed and the secret
-- rotated in a later migration; secrets must never be committed to the repo.
-- Intentionally a no-op.
SELECT 1;
