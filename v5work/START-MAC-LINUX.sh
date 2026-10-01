#!/bin/sh
cd "$(dirname "$0")"
npm install
open_cmd="xdg-open"
command -v open >/dev/null 2>&1 && open_cmd="open"
$open_cmd http://localhost:3000/ >/dev/null 2>&1 || true
npm start
