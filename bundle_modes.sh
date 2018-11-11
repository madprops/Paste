#!/bin/bash

ARRAY=()

ext=".js"
slash="/"

cd codemirror/mode

for dir in */; do
	d=${dir%/}
	p="$d$slash$d$ext"
	ARRAY+=($p)
done

rm -f mode_bundle.js

touch mode_bundle.js

for i in "${ARRAY[@]}"
do
   cat $i >> mode_bundle.js
done

rm -f mode_bundle_min.js

npx google-closure-compiler --js=mode_bundle.js --js_output_file=mode_bundle_min.js

echo "Done"
