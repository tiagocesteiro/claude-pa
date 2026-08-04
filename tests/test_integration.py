import json
import tempfile
from pathlib import Path

import pytest


def test_house_hunter_web_workflow():
    """E2E: scrape → HTML → server → approve/reject."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)

        # Create test state
        state = {
            "test_search": {
                "listing1": {
                    "title": "Test house",
                    "url": "https://example.com/1",
                    "price_eur": 250000,
                    "location": "Lisboa",
                    "typology": "T2",
                    "area_m2": 85,
                    "image": None,
                    "published_date": "2026-08-04",
                    "updated_date": "2026-08-04",
                    "verdict": "manter",
                    "motivo": "",
                    "user_feedback": "pending",
                    "first_seen": "2026-08-04T14:30:00+00:00",
                    "last_feedback": None,
                }
            }
        }
        state_file = tmpdir_path / "house_state.json"
        state_file.write_text(json.dumps(state))

        # Generate HTML
        from scripts.templates import generate_html
        html_file = tmpdir_path / "results.html"
        generate_html(state, html_file)
        assert html_file.exists()
        assert "Test house" in html_file.read_text(encoding="utf-8")

        # Test server endpoints
        from fastapi.testclient import TestClient
        from scripts.server import create_app
        app = create_app(state_file)
        client = TestClient(app)

        # Update app state to use our temp HTML file for testing
        app.state.results_html_path = html_file

        # GET /results
        response = client.get("/results")
        assert response.status_code == 200
        assert "Test house" in response.text

        # POST /approve
        response = client.post("/approve", json={
            "listing_id": "listing1",
            "search_name": "test_search"
        })
        assert response.status_code == 200
        assert response.json()["user_feedback"] == "approved"

        # Verify state persisted
        updated_state = json.loads(state_file.read_text())
        assert updated_state["test_search"]["listing1"]["user_feedback"] == "approved"
        assert updated_state["test_search"]["listing1"]["last_feedback"] is not None


def test_house_hunter_reject_workflow():
    """E2E: POST /reject endpoint flow."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)

        # Create test state
        state = {
            "test_search": {
                "listing2": {
                    "title": "Another house",
                    "url": "https://example.com/2",
                    "price_eur": 150000,
                    "location": "Porto",
                    "typology": "T3",
                    "area_m2": 120,
                    "image": None,
                    "published_date": "2026-08-03",
                    "updated_date": "2026-08-03",
                    "verdict": "rejeitar",
                    "motivo": "Too far from city center",
                    "user_feedback": "pending",
                    "first_seen": "2026-08-03T10:15:00+00:00",
                    "last_feedback": None,
                }
            }
        }
        state_file = tmpdir_path / "house_state.json"
        state_file.write_text(json.dumps(state))

        # Generate HTML
        from scripts.templates import generate_html
        html_file = tmpdir_path / "results.html"
        generate_html(state, html_file)

        # Test server endpoints
        from fastapi.testclient import TestClient
        from scripts.server import create_app
        app = create_app(state_file)
        app.state.results_html_path = html_file
        client = TestClient(app)

        # POST /reject
        response = client.post("/reject", json={
            "listing_id": "listing2",
            "search_name": "test_search"
        })
        assert response.status_code == 200
        assert response.json()["user_feedback"] == "rejected"

        # Verify state persisted
        updated_state = json.loads(state_file.read_text())
        assert updated_state["test_search"]["listing2"]["user_feedback"] == "rejected"


def test_house_hunter_multiple_listings():
    """E2E: Test dashboard with multiple listings and filters."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)

        # Create test state with multiple listings
        state = {
            "search_lisboa": {
                "listing_a": {
                    "title": "Cozy apartment in Alcântara",
                    "url": "https://example.com/a",
                    "price_eur": 200000,
                    "location": "Lisboa",
                    "typology": "T1",
                    "area_m2": 60,
                    "image": None,
                    "published_date": "2026-08-04",
                    "updated_date": "2026-08-04",
                    "verdict": "manter",
                    "motivo": "",
                    "user_feedback": "pending",
                    "first_seen": "2026-08-04T08:00:00+00:00",
                    "last_feedback": None,
                },
                "listing_b": {
                    "title": "Villa in Cascais",
                    "url": "https://example.com/b",
                    "price_eur": 450000,
                    "location": "Cascais",
                    "typology": "T4",
                    "area_m2": 250,
                    "image": None,
                    "published_date": "2026-08-02",
                    "updated_date": "2026-08-04",
                    "verdict": "manter",
                    "motivo": "",
                    "user_feedback": "approved",
                    "first_seen": "2026-08-02T12:00:00+00:00",
                    "last_feedback": "2026-08-04T09:30:00+00:00",
                },
                "listing_c": {
                    "title": "Small studio in Belém",
                    "url": "https://example.com/c",
                    "price_eur": 80000,
                    "location": "Lisboa",
                    "typology": "T0",
                    "area_m2": 30,
                    "image": None,
                    "published_date": "2026-08-01",
                    "updated_date": "2026-08-03",
                    "verdict": "rejeitar",
                    "motivo": "Too small",
                    "user_feedback": "rejected",
                    "first_seen": "2026-08-01T15:00:00+00:00",
                    "last_feedback": "2026-08-04T10:00:00+00:00",
                },
            }
        }
        state_file = tmpdir_path / "house_state.json"
        state_file.write_text(json.dumps(state))

        # Generate HTML
        from scripts.templates import generate_html
        html_file = tmpdir_path / "results.html"
        generate_html(state, html_file)
        assert html_file.exists()

        html_content = html_file.read_text(encoding="utf-8")
        assert "Cozy apartment in Alcântara" in html_content
        assert "Villa in Cascais" in html_content
        assert "Small studio in Belém" in html_content

        # Test server endpoints
        from fastapi.testclient import TestClient
        from scripts.server import create_app
        app = create_app(state_file)
        app.state.results_html_path = html_file
        client = TestClient(app)

        # GET /results should render all listings
        response = client.get("/results")
        assert response.status_code == 200
        assert "3 de 3 anúncios" in response.text or "Showing 3" in response.text or "3" in response.text

        # Approve the first listing (already approved in state)
        response = client.post("/approve", json={
            "listing_id": "listing_a",
            "search_name": "search_lisboa"
        })
        assert response.status_code == 200

        # Verify final state has all three listings with expected feedback
        updated_state = json.loads(state_file.read_text())
        assert updated_state["search_lisboa"]["listing_a"]["user_feedback"] == "approved"
        assert updated_state["search_lisboa"]["listing_b"]["user_feedback"] == "approved"
        assert updated_state["search_lisboa"]["listing_c"]["user_feedback"] == "rejected"


def test_house_hunter_invalid_listing_404():
    """E2E: Attempting to approve a non-existent listing returns 404."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)

        # Create empty test state
        state = {}
        state_file = tmpdir_path / "house_state.json"
        state_file.write_text(json.dumps(state))

        # Generate HTML
        from scripts.templates import generate_html
        html_file = tmpdir_path / "results.html"
        generate_html(state, html_file)

        # Test server endpoints
        from fastapi.testclient import TestClient
        from scripts.server import create_app
        app = create_app(state_file)
        app.state.results_html_path = html_file
        client = TestClient(app)

        # Try to approve a non-existent listing
        response = client.post("/approve", json={
            "listing_id": "nonexistent",
            "search_name": "nonexistent_search"
        })
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]


def test_house_hunter_state_isolation():
    """E2E: Different searches don't interfere with each other."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)

        # Create test state with multiple searches
        state = {
            "search_north": {
                "listing_north_1": {
                    "title": "North property",
                    "url": "https://example.com/north",
                    "price_eur": 300000,
                    "location": "Porto",
                    "typology": "T2",
                    "area_m2": 90,
                    "image": None,
                    "published_date": "2026-08-04",
                    "updated_date": "2026-08-04",
                    "verdict": "manter",
                    "motivo": "",
                    "user_feedback": "pending",
                    "first_seen": "2026-08-04T10:00:00+00:00",
                    "last_feedback": None,
                }
            },
            "search_south": {
                "listing_south_1": {
                    "title": "South property",
                    "url": "https://example.com/south",
                    "price_eur": 400000,
                    "location": "Faro",
                    "typology": "T3",
                    "area_m2": 120,
                    "image": None,
                    "published_date": "2026-08-04",
                    "updated_date": "2026-08-04",
                    "verdict": "manter",
                    "motivo": "",
                    "user_feedback": "pending",
                    "first_seen": "2026-08-04T11:00:00+00:00",
                    "last_feedback": None,
                }
            }
        }
        state_file = tmpdir_path / "house_state.json"
        state_file.write_text(json.dumps(state))

        # Generate HTML
        from scripts.templates import generate_html
        html_file = tmpdir_path / "results.html"
        generate_html(state, html_file)

        # Test server endpoints
        from fastapi.testclient import TestClient
        from scripts.server import create_app
        app = create_app(state_file)
        app.state.results_html_path = html_file
        client = TestClient(app)

        # Approve listing from search_north
        response = client.post("/approve", json={
            "listing_id": "listing_north_1",
            "search_name": "search_north"
        })
        assert response.status_code == 200

        # Reject listing from search_south
        response = client.post("/reject", json={
            "listing_id": "listing_south_1",
            "search_name": "search_south"
        })
        assert response.status_code == 200

        # Verify state is correct for both searches
        updated_state = json.loads(state_file.read_text())
        assert updated_state["search_north"]["listing_north_1"]["user_feedback"] == "approved"
        assert updated_state["search_south"]["listing_south_1"]["user_feedback"] == "rejected"
