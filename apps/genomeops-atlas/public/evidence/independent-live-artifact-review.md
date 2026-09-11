# Independent live-artifact discrepancy review

Reviewed at 2026-09-11T21:47:53.456641+00:00. Scope: explain the mismatch between the sum of individual marker-alignment lengths and the concatenated alignment in the real Stage 3 artifact. Artifact directory: `outputs/stage3-live`; supplied execution identity: implementation commit `50dc45fe790cb28f323d66382a4595ecd3a5234c`, GitHub Actions run `34650562319`.

**Conclusion: the complete difference is expected GToTree concatenation output. It is not additional trimming or a provenance defect. The original length assertion omitted five X separator columns between adjacent markers.** This conclusion applies to this discrepancy; it is not publication approval.

| Measurement | Independently observed result |
| --- | ---: |
| Individual marker alignments / partitions | 118 |
| Sum of marker-alignment columns | 22,595 |
| Concatenated columns in each of the three taxa | 23,180 |
| Inter-marker joins | 117 |
| Columns per join | 5 |
| Total separator columns | 585 |
| Complete reconstruction | 22,595 + 117 × 5 = 23,180 |

The three concatenated FASTA labels are exactly `GCF_000468955.1`, `GCF_002970915.1`, and `GCF_903886475.1`.

## Independent method

I parsed the downloaded FASTA files and `gtotree_output/run_files/Partitions.txt` with a separate read-only check, without invoking the existing live verification script or changing any artifact. For every partition, the declared inclusive coordinate length equals the corresponding individual alignment length. For every one of the three taxa, each concatenated partition slice is exactly equal to that marker's individual aligned sequence. Every gap between adjacent partition ranges is exactly five positions and contains `XXXXX` in all three taxa. The first partition starts at 1 and the last ends at 23,180, so the marker slices and separators explain the complete alignment without leftover positions.

For example, the first partition is `Peptidase_A8 = 1-148`; the next is `SmpB = 154-305`, leaving the expected separator at positions 149-153. The final partition is `Ribosomal_L29 = 23120-23180`.

## Pinned upstream contract

The primary [GToTree v1.8.17 concatenation helper](https://github.com/AstrobioMike/GToTree/blob/v1.8.17/bin/gtt-cat-alignments#L51-L55) writes the amino-acid alignment by joining marker sequences with five X characters (one-based source line 55). Its [partition loop](https://github.com/AstrobioMike/GToTree/blob/v1.8.17/bin/gtt-cat-alignments#L79-L84) advances the next protein partition start to the previous end plus six (line 84), accounting for those five separator positions. This pinned helper was read directly from its primary upstream source during review.

The pinned [main GToTree source](https://github.com/AstrobioMike/GToTree/blob/v1.8.17/bin/GToTree#L2646-L2650), also retained in `outputs/gtotree-v1817-source.log`, invokes this helper at lines 2646-2650. The [`-k` preservation block](https://github.com/AstrobioMike/GToTree/blob/v1.8.17/bin/GToTree#L3468-L3475) moves the same per-marker alignment inputs into `run_files/individual_alignments` at lines 3468-3475.

The correct verification keeps strict equality: each marker slice must exactly match its individual alignment, each separator must be exactly `XXXXX`, and total marker columns plus all separator columns must equal the concatenated length. No weakened or skipped provenance assertion is warranted.
