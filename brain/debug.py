import json
import sys

print("Raw args:", sys.argv)
print("Arg 1:", repr(sys.argv[1]))
print("Arg 2:", repr(sys.argv[2]))

try:
    texts = json.loads(sys.argv[1])
    print("Parsed texts:", texts)
except Exception as e:
    print("JSON Error:", e)

