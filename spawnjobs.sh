#!/bin/bash

N=$1

for i in $(seq 1 $N)
do
   RAND_NUM=$((RANDOM%10))
   curl "http://localhost:3000/add?title=Example$RAND_NUM"
done
