"""Print the Python packages the Home Assistant integrations the tests use need, for pip.

pytest-homeassistant installs Home Assistant but not its integrations' own libraries, and they must match the
Home Assistant version installed. Run after installing requirements_test.txt:

    pip install $(python tests/ha_requirements.py)
"""

import json
from pathlib import Path

import homeassistant.components

# The frontend serves the panel.
INTEGRATIONS = ("frontend",)

components = Path(homeassistant.components.__file__).parent
print(
    " ".join(
        req
        for name in INTEGRATIONS
        for req in json.loads((components / name / "manifest.json").read_text()).get("requirements", [])
    )
)
