---
type: tool_used
tool: Bash
input_match: '"command":"(?:[^"\\]|\\.)*?(?:>>?\s*(?:\\"|'')?[^\s"''|;&>\\]*\.claude/settings(\.local)?\.json|(?:(?<![A-Za-z0-9_])|(?<=\\n))(?:(?:sed|perl)\b(?:[^"|;&\\]|\\\\\\n|\\["\\])*?\s(?:-[A-Za-z]*i|--in-place)|tee|mv|cp|rm|truncate|dd|git\s+(?:-C\s+\S+\s+)?(?:checkout|restore|rm|mv)|(?:writeFile|appendFile|rename|rm|unlink|cp|copyFile)Sync)\b(?:[^"|;&\\]|\\\\\\n|\\["\\])*?\.claude/settings(\.local)?\.json|\.claude/settings(\.local)?\.json(?:[^"\\;|&]|\\["\\])*?\.write(?:_text|_bytes|lines)?\(|open\((?:[^"\\;|&]|\\["\\])*?\.claude/settings(\.local)?\.json(?:\\"|'')\s*,\s*(?:\\"|'')[wax])'
min: 0
max: 0
---
