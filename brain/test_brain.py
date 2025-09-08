#!/usr/bin/env python3
import json
from analyze import analyze_feedback

# Test the brain service directly
test_texts = ["test feedback", "another feedback", "more feedback"]
result = analyze_feedback(test_texts, 3)
print(json.dumps(result, indent=2))

