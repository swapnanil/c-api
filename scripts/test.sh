#! /bin/bash

node fbq.js >/dev/null 2>/dev/null &
pid=$!
sleep 5

cd scripts
rm -f test_output
curl "http://localhost:4000/health/echo/hello" -so test_output

msg=`cat test_output`
kill -9 "$pid"

if [[ $msg == "hello" ]]; then
  echo "test passed"
  exit 0
else
  echo "test failed"
  exit 1
fi
