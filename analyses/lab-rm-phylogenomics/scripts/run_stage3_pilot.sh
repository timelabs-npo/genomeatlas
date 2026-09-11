#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-analyses/lab-rm-phylogenomics}"
ACCESSIONS="$ROOT/config/stage3_pilot_accessions.txt"
WORK="$ROOT/work/stage3_pilot"
RESULTS="$ROOT/results/stage3_pilot"
BIN="$ROOT/.tools"

# Reject an oversized or invalid pilot before any download or output removal.
python3 "$ROOT/scripts/validate_pilot_accessions.py" "$ACCESSIONS"
if [[ "$(uname -s)-$(uname -m)" != "Linux-x86_64" ]]; then
  echo 'This GToTree runner requires Linux x86_64 (the configured GitHub runner).' >&2
  exit 2
fi

rm -rf "$WORK" "$RESULTS"
mkdir -p "$WORK/input_faa" "$WORK/tmp" "$RESULTS" "$BIN"
export TMPDIR="$(cd "$WORK/tmp" && pwd)"
python3 "$ROOT/scripts/validate_pilot_accessions.py" "$ACCESSIONS" --normalized "$WORK/pilot_accessions.txt"
ACCESSIONS="$WORK/pilot_accessions.txt"

# Preserve real tool output even if a later validation check fails.
finish() {
  status=$?
  trap - EXIT
  if [[ -d "$WORK/gtotree" ]]; then cp -R "$WORK/gtotree" "$RESULTS/gtotree_output"; fi
  if [[ -d "$WORK/input_faa" ]]; then cp -R "$WORK/input_faa" "$RESULTS/input_proteomes"; fi
  if [[ -n "$(find "$WORK/tmp" -type f -print -quit)" ]]; then cp -R "$WORK/tmp" "$RESULTS/incomplete_debug"; fi
  cp "$ACCESSIONS" "$RESULTS/pilot_accessions.txt"
  python3 "$ROOT/scripts/write_pilot_manifest.py" "$RESULTS" "$status" || status=1
  exit "$status"
}
trap finish EXIT

DATASETS="$BIN/datasets"
if [[ ! -x "$DATASETS" ]]; then
  curl -fsSL "https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/datasets" -o "$DATASETS"
  chmod +x "$DATASETS"
fi
"$DATASETS" version > "$RESULTS/ncbi_datasets_version.txt"

ZIP="$WORK/pilot.zip"
"$DATASETS" download genome accession --inputfile "$ACCESSIONS" --include protein,gbff,gff3,seq-report --filename "$ZIP" --no-progressbar
unzip -q "$ZIP" -d "$WORK/extracted"

while read -r accession; do
  [[ -z "$accession" ]] && continue
  src="$WORK/extracted/ncbi_dataset/data/$accession/protein.faa"
  test -s "$src"
  cp "$src" "$WORK/input_faa/$accession.faa"
done < "$ACCESSIONS"
find "$WORK/input_faa" -name '*.faa' -type f | sort > "$WORK/faa.list"

gtt-hmms > "$RESULTS/available_gtt_hmms.txt" 2>&1 || true
GToTree --version > "$RESULTS/gtotree_version.txt" 2>&1 || true

# `-A` is GToTree amino-acid/proteome input mode.
GToTree -A "$WORK/faa.list" -H Firmicutes -o "$WORK/gtotree" -j 4 -d -k 2>&1 | tee "$RESULTS/gtotree.log"

test -s "$WORK/gtotree/Aligned_SCGs.faa"
# Aligned_SCGs_mod_names.faa exists only when labels were changed (-m/-t).
test -s "$WORK/gtotree/gtotree.tre"
test -s "$WORK/gtotree/SCG_hit_counts.tsv"
test -s "$WORK/gtotree/Genomes_summary_info.tsv"
test -s "$WORK/gtotree/run_files/Partitions.txt"
test -s "$WORK/gtotree/run_files/Partitions.nex"
test -d "$WORK/gtotree/run_files/individual_alignments"
test -n "$(find "$WORK/gtotree/run_files/individual_alignments" -name '*_aln.faa' -print -quit)"
# GToTree removes raw HMM tables even with -d. Recover IDs by exact sequence
# matches from the retained pre-alignment marker FASTAs to the input proteomes.
python3 "$ROOT/scripts/export_gtotree_marker_ids.py" \
  --gtotree "$WORK/gtotree" --proteomes "$WORK/input_faa" --out "$RESULTS"

cat > "$RESULTS/PILOT_SUMMARY.md" <<EOF
# Stage 3 phylogenomics pilot

- Input proteomes: **$(wc -l < "$ACCESSIONS")**
- Marker set: **Firmicutes (119 HMM targets)**
- Input mode: **GToTree amino-acid files (\`-A\`)**
- Concatenated alignment: **generated**
- FastTree topology: **generated as \`gtotree.tre\`**
- Individual alignments and partition metadata: **preserved with -k**
- Original input proteomes: **preserved**
- Marker-to-protein IDs: **recovered by exact sequence matching; ambiguous matches labeled**
- Raw HMM score tables: **not retained by GToTree 1.8.17; not claimed as exported evidence**
- Scope: at most three genomes. This is an environment/output pilot, not publication approval.
EOF
