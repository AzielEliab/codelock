"""Suite mesh Live Nodes + QNM-BUILD-1.0 contract.

Default OFF. live|locked|isolated. No Node Gate. No auto-heal. Not anonymity.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MESH = (ROOT / "workers/download-tracker/src/mesh.js").read_text(encoding="utf-8")
DOOR = (ROOT / "workers/download-tracker/src/door.js").read_text(encoding="utf-8")
RUNTIME = (ROOT / "workers/download-tracker/src/runtime.js").read_text(encoding="utf-8")
HOME = (ROOT / "workers/download-tracker/src/index.js").read_text(encoding="utf-8")
INDEX = HOME
WRANGLER = (ROOT / "workers/download-tracker/wrangler.toml").read_text(encoding="utf-8")
README = (ROOT / "README.md").read_text(encoding="utf-8")
SKILL = (ROOT / "SKILL.md").read_text(encoding="utf-8")
WORKER_README = (ROOT / "workers/download-tracker/README.md").read_text(encoding="utf-8")


def test_mesh_contract_default_off_qnm_law() -> None:
    assert 'QNM_SPEC = "QNM-BUILD-1.0"' in MESH
    assert 'QNS_CD_SPEC = "QNS-CD-1.0"' in MESH
    assert "export const QNS_CD" in MESH
    assert "photon QNS1 packet transfer" in MESH
    assert "https://github.com/AzielEliab/qnm-node" in MESH
    assert "https://github.com/AzielEliab/aziel-runtime" in MESH
    assert "public_qnsd_proxy: false" in MESH
    assert "softwares_tab: false" in MESH
    assert "QNS-CD-1.0" in MESH
    assert "MESH_NOTE" in MESH and "QNS-CD-1.0" in MESH
    assert "MESH_DEFAULT_OFF = true" in MESH
    assert "MESH_ANONYMITY_NETWORK = false" in MESH
    assert "MESH_NODE_GATE = false" in MESH
    assert "MESH_AUTO_HEAL = false" in MESH
    assert 'MESH_IDENTITY = IDENTITY' in MESH or '"Aziel Eliab"' in MESH
    assert 'MESH_PRODUCT = "codelock"' in MESH
    assert 'MESH_PATH = "/v1/mesh"' in MESH
    assert "live|locked|isolated" in MESH
    assert "enabled_default: false" in MESH
    assert "anon_broadcast_publish_path: false" in MESH
    assert "Aziel Eliab" in MESH
    assert "export function withQnsCd" in MESH
    assert "export function qnsCdCrossMap" in MESH


def test_mesh_pointer_and_openapi_helpers() -> None:
    assert "export function meshPointer" in MESH
    assert "export function meshOpenApiPaths" in MESH
    assert "export function parseMeshDoc" in MESH
    assert "export function emptyMesh" in MESH
    assert "export function alignLiveNodes" in MESH
    assert "fraggate_slug: MESH_SLUG" in MESH
    assert "codelock_mesh_" in MESH


def test_door_proxies_mesh_via_aziel_runtime() -> None:
    assert '"mesh"' in DOOR
    assert "MESH_ROUTE_METHODS" in DOOR
    assert "isMeshPath" in DOOR
    assert "runMeshProxy" in DOOR
    assert "originFetch" in DOOR
    assert "joinOriginUrl" in DOOR
    assert 'path === "/v1/mesh"' in DOOR
    assert 'path.startsWith("/v1/mesh/")' in DOOR
    assert "AZIEL_RUNTIME" in WRANGLER
    assert "aziel-runtime" in WRANGLER
    assert "/v1/mesh" in WRANGLER


def test_runtime_advertises_mesh_proxy_and_pointer() -> None:
    assert 'from "./mesh.js"' in RUNTIME
    assert "meshPointer" in RUNTIME
    assert "meshOpenApiPaths" in RUNTIME
    assert "...meshOpenApiPaths()" in RUNTIME
    assert "mesh: meshPointer()" in RUNTIME
    assert "/v1/mesh" in RUNTIME
    assert "QNM-BUILD-1.0" in RUNTIME
    assert "No Node Gate" in RUNTIME
    assert "No auto-heal" in RUNTIME
    assert "runMeshProxy" in RUNTIME
    assert "isMeshPath" in RUNTIME
    assert "handleRuntime(request, url, env)" in INDEX


def test_home_rose_star_brandmark() -> None:
    mark = '<div class="brandrow"><img class="brandmark" src="/sigil.png" width="40" height="40" alt="" decoding="async"></div>'
    assert mark in HOME
    assert ".brandrow{" in HOME
    assert ".brandmark{" in HOME
    assert "everblooming" not in HOME.lower()
    assert "Everblooming" not in HOME
    sigil = ROOT / "workers/download-tracker/public/sigil.png"
    assert sigil.is_file()
    data = sigil.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    # Same official rose-star as chronolock / ark / forgereceipts (~75KB), not the 4KB pentagram.
    assert len(data) == 75035
    assert hashlib.sha256(data).hexdigest() == "af095e8b0916a7262860a53619c7110f25539988806775b1c7bff8df7b0ee848"


def test_home_live_nodes_strip_no_node_gate() -> None:
    assert 'id="meshStrip"' in HOME
    assert 'id="meshLiveCount"' in HOME
    assert 'id="meshLine"' in HOME
    assert "Live Nodes" in HOME
    assert "QNM-BUILD-1.0" in HOME
    assert "No Node Gate" in HOME
    assert "No auto-heal" in HOME
    assert "Not an anonymity network" in HOME
    assert "/v1/mesh" in HOME
    assert 'product: "codelock"' in HOME
    assert 'id="node-gate"' not in HOME
    assert 'href="/node-gate"' not in HOME
    assert "auto-heal this node" not in HOME


def test_docs_advertise_mesh_proxy() -> None:
    assert "/v1/mesh" in README
    assert "/v1/mesh" in SKILL
    assert "QNS-CD-1.0" in README
    assert "QNS-CD-1.0" in SKILL
    assert "qnm-node" in README
    assert "aziel-runtime" in README
    assert "QNM-BUILD-1.0" in WORKER_README
    assert "QNS-CD-1.0" in WORKER_README
    assert "AZIEL_RUNTIME" in WORKER_README
    assert "Live Nodes" in WORKER_README
    assert "Aziel Eliab" in MESH
    assert "withQnsCd" in DOOR
    assert "QNS-CD-1.0" in HOME


def test_mcp_and_openapi_point_at_suite_mesh() -> None:
    assert "meshPointer" in RUNTIME
    assert "meshOpenApiPaths" in RUNTIME
    assert "/v1/mesh" in RUNTIME
    assert "QNM-BUILD-1.0" in RUNTIME
    assert "No Node Gate" in RUNTIME
    assert "mesh_*" in RUNTIME or "mesh_\\*" in RUNTIME
