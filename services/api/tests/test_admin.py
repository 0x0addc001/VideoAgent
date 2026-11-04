import pytest
from httpx import ASGITransport, AsyncClient

from tests.conftest import register
from videoagent.providers.pippit import PippitVideoProvider


async def admin_client(app):
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")
    assert (await register(client, email="admin@example.com")).status_code == 201
    return client


@pytest.mark.api
async def test_admin_routes_require_an_allowlisted_email(client):
    assert (await register(client)).status_code == 201

    response = await client.get("/api/v1/admin/overview")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ADMIN_ACCESS_REQUIRED"


@pytest.mark.api
async def test_admin_can_adjust_credits_and_disable_a_user(app):
    admin = await admin_client(app)
    target_transport = ASGITransport(app=app)
    async with AsyncClient(transport=target_transport, base_url="http://test") as target:
        assert (await register(target)).status_code == 201
        users = await admin.get("/api/v1/admin/users")
        target_user = next(
            item for item in users.json()["items"] if item["email"] == "creator@example.com"
        )

        adjusted = await admin.post(
            f"/api/v1/admin/users/{target_user['id']}/credits",
            json={"amount": 25, "reason": "Launch allowance"},
        )
        assert adjusted.status_code == 200
        assert adjusted.json()["credits"] == 125

        disabled = await admin.patch(
            f"/api/v1/admin/users/{target_user['id']}",
            json={"status": "disabled"},
        )
        assert disabled.status_code == 200
        assert disabled.json()["status"] == "disabled"
        assert (await target.get("/api/v1/auth/me")).status_code == 401
    await admin.aclose()


@pytest.mark.api
async def test_admin_switches_generation_and_registration(app):
    admin = await admin_client(app)
    project = (
        await admin.post(
            "/api/v1/projects",
            json={"title": "Admin gate", "brief": "Generation gate"},
        )
    ).json()
    storyboard = await admin.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "shots": [
                {
                    "description": "Gate",
                    "prompt_en": "Gate shot",
                    "duration_seconds": 5,
                    "aspect_ratio": "16:9",
                    "generation_mode": "text_to_video",
                }
            ]
        },
    )
    shot_id = storyboard.json()["shots"][0]["id"]

    updated = await admin.patch(
        "/api/v1/admin/settings",
        json={"generation_enabled": False, "registration_mode": "closed"},
    )
    assert updated.status_code == 200
    assert updated.json() == {
        "generation_enabled": False,
        "registration_mode": "closed",
    }
    blocked = await admin.post(f"/api/v1/shots/{shot_id}/estimate")
    assert blocked.status_code == 503
    assert blocked.json()["error"]["code"] == "GENERATION_DISABLED"

    newcomer_transport = ASGITransport(app=app)
    async with AsyncClient(transport=newcomer_transport, base_url="http://test") as newcomer:
        registration = await register(newcomer, email="new@example.com")
        assert registration.status_code == 403
        assert registration.json()["error"]["code"] == "REGISTRATION_CLOSED"
    await admin.aclose()


@pytest.mark.api
async def test_admin_creates_and_revokes_invite_codes(app):
    admin = await admin_client(app)
    await admin.patch(
        "/api/v1/admin/settings",
        json={"registration_mode": "invite"},
    )
    created = await admin.post(
        "/api/v1/admin/invites",
        json={"label": "Design partner", "max_uses": 1, "expires_in_hours": 24},
    )
    assert created.status_code == 201
    invite = created.json()
    assert invite["code"]

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as invited:
        missing = await register(invited, email="missing@example.com")
        assert missing.status_code == 403
        accepted = await invited.post(
            "/api/v1/auth/register",
            json={
                "email": "invited@example.com",
                "password": "Correct-Horse-Battery9",
                "locale": "en",
                "invite_code": invite["code"],
            },
        )
        assert accepted.status_code == 201

    revoked = await admin.delete(f"/api/v1/admin/invites/{invite['id']}")
    assert revoked.status_code == 200
    assert revoked.json()["revoked_at"]
    await admin.aclose()


@pytest.mark.api
async def test_provider_status_failure_does_not_break_admin_data(app):
    admin = await admin_client(app)
    provider = PippitVideoProvider(command=("fake-pippit",))

    async def unsupported() -> dict[str, object]:
        raise NotImplementedError

    provider.account_status = unsupported  # type: ignore[method-assign]
    app.state.video_provider = provider
    app.state.settings.kling_cli_command = "missing-kling-cli-for-test"

    response = await admin.get("/api/v1/admin/provider")

    assert response.status_code == 200
    assert response.json()["pippit"]["connected"] is False
    assert response.json()["pippit"]["error"] == "Pippit status is unavailable."
    assert response.json()["kling"]["connected"] is False
    assert response.json()["kling"]["error"] == "Kling CLI status is unavailable."
    await admin.aclose()
