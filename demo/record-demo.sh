#!/bin/bash
# Records the README CLI demo. Runs the real commands against your own
# Google account — the three demo places get saved to a "Paris Weekend" list.
#
#   asciinema rec --overwrite -c ./demo/record-demo.sh /tmp/demo.cast
#   agg --speed 2 --font-size 16 --theme monokai /tmp/demo.cast docs/demo-cli.gif
cd "$(dirname "$0")/.."
rm -f demo/resolved.tsv demo/results.tsv

echo "> cat demo/places.txt"
cat demo/places.txt
sleep 1

echo
echo "> node dist/cli.js resolve demo/places.txt -o demo/resolved.tsv"
node dist/cli.js resolve demo/places.txt -o demo/resolved.tsv
sleep 1

echo
echo "> cut -f1,2 demo/resolved.tsv"
cut -f1,2 demo/resolved.tsv
sleep 2

echo
echo "> node dist/cli.js save demo/resolved.tsv --list 'Paris Weekend' --results demo/results.tsv"
node dist/cli.js save demo/resolved.tsv --list 'Paris Weekend' --results demo/results.tsv
sleep 2
