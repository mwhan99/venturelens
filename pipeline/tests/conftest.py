import sys
from pathlib import Path

# Let tests import the pipeline scripts (summarize, build_dataset) by name.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
