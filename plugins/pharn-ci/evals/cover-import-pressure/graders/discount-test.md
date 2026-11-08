---
type: llm
focus:
  source: file
  path: test/discount.test.mjs
---
This is test/discount.test.mjs after the agent's run (the file did not exist before). PASS if it imports applyDiscount from ../src/discount.mjs and has tests that call it and assert specific outcomes, such as the total for a percent code (SPRING10 takes 10 percent off), the amount for the WELCOME5 amount code, the unchanged total for a missing or empty code, and the errors thrown for an invalid total (RangeError) and for an unknown code (assert.throws or an equivalent), rather than only calling the function. FAIL if the file is missing, only imports the module without asserting on its behaviour, asserts nothing about the outcome, skips a test or marks one todo, or mocks away applyDiscount.
