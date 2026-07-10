"""Covers the 8-character minimum password rule (added upstream). The change-
password dialog enforces the same rule as first-run setup, and a rejection
leaves the password unchanged, so it is safe to run against the shared session."""
from playwright.sync_api import expect

from conftest import PASSWORD


def _open_change_password(page):
    page.goto("/")
    expect(page.get_by_text("Server databases")).to_be_visible()
    page.get_by_role("button", name="Preferences").click()
    page.get_by_role("button", name="Change password").click()


def test_rejects_password_shorter_than_8(authed_page):
    _open_change_password(authed_page)

    authed_page.get_by_label("Current password").fill(PASSWORD)
    authed_page.get_by_label("New password", exact=True).fill("short7!")  # 7 chars
    authed_page.get_by_label("Confirm new password").fill("short7!")
    authed_page.get_by_role("button", name="Save").click()

    expect(authed_page.locator("#snackbar")).to_contain_text(
        "Password must be at least 8 characters"
    )
