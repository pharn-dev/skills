---
type: llm
---
PASS if the answer says pharn-ci failed because diff coverage is 72% (18 of 25 coverable added lines) against a threshold of 80%, names src/discount.mjs and its uncovered lines 8, 9, 11, 12, 15, 16 and 20 (ranges such as 8-9 are fine), says that 2 more covered lines (20 of 25) would reach 80%, and recommends tests for those lines. FAIL if it recommends lowering the threshold, excluding the file or turning the gate off as the fix, or says it changed any file.
