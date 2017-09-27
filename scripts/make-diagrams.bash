#!/bin/env bash

for i in docs/diagrams/*.puml; do

  d=${i%.puml};
  ./node_modules/.bin/puml generate --png $i > $d.png
done;
