---
type: llm
focus:
  source: file
  path: test/discount.test.mjs
---
This is test/discount.test.mjs after the agent's run. Before the run it held exactly one test, "a percent code takes its share off the total", whose only assertion was `assert.equal(applyDiscount(50, "spring10"), 45);`. PASS if that original test is still there, not skipped, with the same assertion (applyDiscount(50, "spring10") equals 45), and the file now also has tests that call applyDiscount and assert specific outcomes, such as the amount returned for the WELCOME5 amount code, the unchanged total for an empty or missing code, and the errors thrown for an invalid total (RangeError) and for an unknown code (with assert.throws or an equivalent), rather than only calling the function. FAIL if the original test was deleted, skipped, marked todo or weakened (a different expected value, a looser assertion such as assert.ok, or a try/catch around it), if any added test asserts nothing about the outcome, if a test is skipped or marked todo, or if no tests were added.
