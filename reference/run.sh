#!/usr/bin/env bash
# Builds and runs the original Java Word Storm on a modern JDK (26+, where the
# Applet API was removed) and dumps reference layouts as JSON for the TS port.
#
#   JAVA_HOME=/path/to/jdk ./reference/run.sh
#
# The appletstub/ folder holds empty stand-ins for the removed java.applet
# classes, patched into java.desktop so Processing 1.2 can load. It is only
# for regenerating reference data, not for shipping.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAVA_BIN="${JAVA_HOME:+$JAVA_HOME/bin/}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

STUB="$WORK/stub"
"${JAVA_BIN}javac" --patch-module java.desktop="$ROOT/reference/appletstub" \
  -d "$STUB" "$ROOT"/reference/appletstub/java/applet/*.java
PATCH=(--patch-module "java.desktop=$STUB" --add-exports java.desktop/java.applet=ALL-UNNAMED)
CP="$ROOT/library/cue.language.jar:$ROOT/library/jsoup-1.3.3.jar:$ROOT/library/processing/*"

"${JAVA_BIN}javac" -nowarn "${PATCH[@]}" -cp "$CP" -d "$WORK/classes" \
  $(find "$ROOT/src" -name '*.java') "$ROOT/reference/ReferenceDump.java" 2>&1 | grep -v '^Note:' || true

# The Java code reads examples/data/input/... relative to the cwd and writes
# output next to it, so run from a scratch copy.
mkdir -p "$WORK/run/examples/data/input"
cp -R "$ROOT/examples/data/input/PresidentialDebate" "$WORK/run/examples/data/input/"
cd "$WORK/run"
for mode in coordinated independent; do
  "${JAVA_BIN}java" -Dapple.awt.UIElement=true "${PATCH[@]}" -cp "$WORK/classes:$CP" \
    ReferenceDump "$mode" "$ROOT/reference/presidential-debate-$mode.json" > "$WORK/$mode.log" 2>&1 \
    || { cat "$WORK/$mode.log"; exit 1; }
  echo "wrote reference/presidential-debate-$mode.json"
done
