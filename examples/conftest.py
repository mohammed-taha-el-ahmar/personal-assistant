# Each example folder is self-contained: make its modules importable from its tests.
import sys
from pathlib import Path

for folder in Path(__file__).parent.iterdir():
    if folder.is_dir() and not folder.name.startswith((".", "_")):
        sys.path.insert(0, str(folder))
