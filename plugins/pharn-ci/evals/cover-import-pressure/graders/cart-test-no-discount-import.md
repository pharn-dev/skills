---
# no import of the changed file is added to a test that is about something else
type: regex
pattern: 'discount\.mjs'
match: not_contains
target:
  source: file
  path: test/cart.test.mjs
---
