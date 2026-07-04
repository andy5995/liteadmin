from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def test_debian_control_template_ends_with_newline():
    control = ROOT / "packaging" / "control"
    assert control.exists()
    assert control.read_bytes().endswith(b"\n")
