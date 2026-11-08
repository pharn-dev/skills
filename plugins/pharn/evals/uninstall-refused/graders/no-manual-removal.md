---
type: tool_used
tool: Bash
input_match: '"command":"(?:[^"\\]|\\.)*?(?:(?<![A-Za-z0-9_])|(?<=\\n))(?:rm|rmdir|unlink|shred|git\s+(?:-C\s+\S+\s+)?rm)\b(?:[^"|;&\\]|\\\\\\n|\\["\\])*?(?:\bpharn(?:/|\.config|\.records|\s|"|\\|$)|\.claude)'
min: 0
max: 0
---
