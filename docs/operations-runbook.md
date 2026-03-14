# Operations Runbook

## Quota refill

Refill one account by reducing used counters in current billing period:

```bash
npm run quota:refill -- --email user@example.com --add-texts 10 --add-text-edits 20
```

Reset all quota counters for an account in current billing period:

```bash
npm run quota:refill -- --email user@example.com --reset-all
```

Use user id instead of email:

```bash
npm run quota:refill -- --user-id 00000000-0000-0000-0000-000000000000 --add-texts 5
```

## Release checks

```bash
npm test
npm run check
npm run build
npm run launch:gate
```

## Incident sequence

1. Verify `/health`.
2. Inspect launch gate output.
3. Validate Stripe and email webhook secrets.
4. Check recent pipeline metrics and request logs.
5. Apply fail-safe communication and rollback if needed.

## Backup and restore

1. Verify latest database backup timestamp from provider.
2. Restore to staging before production restore.
3. Run smoke flow: login, optimize, webhook, history.
