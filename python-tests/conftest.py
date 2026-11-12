"""Loads the integration's plain-Python modules (frigate, panel_config) without Home Assistant.

The package's __init__.py imports Home Assistant, so the package is registered here as an empty module
pointing at its folder; importing `frigate_camera_panel.frigate` then skips __init__.py.
"""

from pathlib import Path
import sys
import types

PACKAGE = Path(__file__).parents[1] / "custom_components" / "frigate_camera_panel"

package = types.ModuleType("frigate_camera_panel")
package.__path__ = [str(PACKAGE)]
sys.modules["frigate_camera_panel"] = package
