# Independent acceptance of the Copilot receipt validator
Source: Copilot PR4 commit 388cc5e60bb16f1f4a6fb7e4b47239a1120b2999. Only validator, source tests, fixtures and review text are imported; no compiled pyc.
Actual parent commands on the main-suite baseline e44827702a8153f682de64d92e92ef1a88bba4c8:
- python -m unittest discover -s probes/tests -v: 13 tests, exit0.
- python scripts/check.py --skip-browser: build valid; 22 Python tests and 13 Node tests, all exit0; 20-file static ZIP CRC checked.
Browser intentionally NOT_TESTED for this main variant; nine successful Chrome UI checks belong to the alternate PR14 candidate, not this commit.
Receipt structure/hash validity does not authenticate execution or grant scientific acceptance. Live genomes, model inference and native Site deployment are NOT_RUN/NOT_DEPLOYED. No credentials or raw private device logs are included.