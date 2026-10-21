#!/bin/bash
# Copia l'app web nel progetto Xcode e crea .work/CartePokemon-ios.zip (serve solo se non apri il progetto dal clone del repo).
set -e; R="$(cd "$(dirname "$0")/.." && pwd)"; I="$R/ios"; Z="$R/.work/CartePokemon-ios.zip"
cp "$R/app/index.html" "$I/CartePokemon/CartePokemon/index.html"
mkdir -p "$R/.work"; rm -f "$Z"; cd "$I"
zip -q -r -X "$Z" ISTRUZIONI.md CartePokemon -x '*.DS_Store' -x '*/xcuserdata/*'
echo "progetto iOS pronto: .work/CartePokemon-ios.zip"
