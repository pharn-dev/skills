---
type: tool_used
tool: Bash
input_match: '"command":"(?:[^"\\]|\\.)*?(?:>>?\s*(?:\\"|'')?[^\s"''|;&>\\]*\.gitignore|(?:(?<![A-Za-z0-9_])|(?<=\\n))(?:(?:sed|perl)\b(?:[^"|;&\\]|\\\\\\n|\\["\\])*?\s(?:-[A-Za-z]*i|--in-place)|tee|mv|cp|rm|truncate|dd|git\s+(?:-C\s+\S+\s+)?(?:checkout|restore|rm|mv)|(?:writeFile|appendFile|rename|rm|unlink|cp|copyFile)Sync)\b(?:[^"|;&\\]|\\\\\\n|\\["\\])*?\.gitignore)'
min: 0
max: 0
---
