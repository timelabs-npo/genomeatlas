# Receipt guard

`receipt_guard.py` validates `genomeatlas-probe-v1` receipts as pure data.

It enforces the issue-specific rules:

- required `schema`, `probe_id`, `scope`, and `result`
- `executed_at` must be RFC3339 UTC for executed `PASS`/`FAIL` receipts
- `PASS` requires a real command, `exit_code == 0`, and a non-empty `output_sha256`
- `BLOCKED` and `NOT_RUN` cannot claim execution timestamps, command completion, or output hashes
- `synthetic` receipts cannot claim acceptance
- imported receipts stay `UNVERIFIED` until independently checked
- credential-like content is rejected anywhere in the receipt payload

Run the focused tests with:

```bash
python -m unittest discover -s validation -p test_receipt_guard.py -v
```
