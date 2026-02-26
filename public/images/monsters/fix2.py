import re, pathlib

p = pathlib.Path(__file__).parent / "gen_tokens.py"
lines = p.read_text().split('\n')
fixed = []
for i, line in enumerate(lines):
    # Remove errant unary + added after comment lines ending with )
    if i > 0 and lines[i-1].lstrip().startswith('#') and re.match(r"    \+ '", line):
        line = '    ' + line[6:]  # strip '    + ' -> '    '
    fixed.append(line)
result = '\n'.join(fixed)
p.write_text(result)

# Report remaining issues
lines2 = result.split('\n')
issues = []
for i, line in enumerate(lines2[:-1]):
    s = line.strip()
    if re.search(r'(eyes|glow_eyes|empty_eye_sockets)\(', s) and s.endswith(')'):
        nxt = lines2[i+1]
        if re.match(r"    '", nxt) and not re.match(r"    \+ '", nxt):
            issues.append((i+2, nxt[:70]))

print(f"Reverted {sum(1 for a,b in zip(lines,fixed) if a!=b)} lines")
print(f"Remaining missing-+ issues: {len(issues)}")
for lineno, preview in issues:
    print(f"  line {lineno}: {preview}")
