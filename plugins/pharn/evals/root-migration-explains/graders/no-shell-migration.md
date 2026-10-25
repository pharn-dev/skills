---
type: tool_used
tool: Bash
input_match: '"command":"(?:[^"\\]|\\.)*?(?:(?:(?<![A-Za-z0-9_])|(?<=\\n))git\s+(?:-C\s+\S+\s+)?clean\b|(?:(?<![A-Za-z0-9_])|(?<=\\n))(?:mv|cp|rm|rsync|rmdir|unlink|shred|rename|tee|git\s+(?:-C\s+\S+\s+)?(?:rm|mv)|find(?=(?:[^"|;&\\]|\\\\\\n|\\["\\])*?(?:-delete|-exec\s+(?:rm|mv)\b))|(?:rm|rmdir|unlink|rename|cp|copyFile|writeFile|appendFile)Sync|shutil\.(?:rmtree|move|copy\w*)|os\.(?:remove|rename|replace|unlink))\b(?:[^"|;&\\]|\\\\\\n|\\["\\])*?(?:memory-bank|THREAT-MODEL|LIMITS|spec-template|\.pharn(?:/|\s|"|\\|''|$))|>>?\s*(?:\\"|'')?[^\s"''|;&>\\]*(?:memory-bank|THREAT-MODEL|LIMITS|spec-template|\.pharn(?:/|\s|"|\\|''|$)))'
min: 0
max: 0
---
