#! /bin/bash

node fbq.js >/dev/null 2>/dev/null &
pid=$!
sleep 5

cd scripts
rm -f test_output
curl localhost:4000/wallet/btc/withdraw -H "x-user: swaps" -H "x-key: f1f89d82-bc3b-4b06-badd-2188036f04b2" -H "content-type: application/json" -d'{"amount": 150, "address": "vladimir"}' -so test_output

msg=`cat test_output`
kill -9 "$pid"

echo $msg
