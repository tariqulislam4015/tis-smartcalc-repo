#!/usr/bin/env bash
# Replaces Capacitor's default launcher icons with the TIS SmartCalc logo.
set -e
RES=android/app/src/main/res
declare -A SIZES=( [mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192 )
for d in "${!SIZES[@]}"; do
  s=${SIZES[$d]}
  mkdir -p "$RES/mipmap-$d"
  convert assets/icons/icon-1024.png -resize ${s}x${s} "$RES/mipmap-$d/ic_launcher.png"
  convert assets/icons/icon-1024.png -resize ${s}x${s} "$RES/mipmap-$d/ic_launcher_round.png"
  fg=$(( s * 108 / 48 ))
  convert assets/icons/icon-1024.png -resize $(( fg * 66 / 100 ))x$(( fg * 66 / 100 )) -background none -gravity center -extent ${fg}x${fg} "$RES/mipmap-$d/ic_launcher_foreground.png"
done
# adaptive icon background colour
mkdir -p "$RES/values"
cat > "$RES/values/ic_launcher_background.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<resources><color name="ic_launcher_background">#0F9D58</color></resources>
XML
echo "Launcher icons updated"
