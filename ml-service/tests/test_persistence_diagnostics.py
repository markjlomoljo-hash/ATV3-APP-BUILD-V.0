import importlib.util
import sys
from pathlib import Path


MODULE_PATH = Path(__file__).parents[1] / "acnetrex_ml" / "service" / "idempotency.py"
SPEC = importlib.util.spec_from_file_location("idempotency_diagnostics", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def test_connection_error_category_is_bounded_and_redacted() -> None:
    secret = "postgresql://user:do-not-log@example.invalid/database"
    classify = MODULE._connection_error_category

    assert classify(Exception(f"timeout expired {secret}")) == "timeout"
    assert classify(Exception(f"password authentication failed {secret}")) == "authentication"
    assert classify(Exception(f"could not translate host name {secret}")) == "dns"
    assert classify(Exception(f"certificate verify failed {secret}")) == "tls"
    assert classify(Exception(f"remaining connection slots {secret}")) == "pool_exhausted"
    assert classify(Exception(f"network is unreachable {secret}")) == "network"
    assert classify(Exception(secret)) == "other"


def test_runtime_installs_supabase_ca_for_verify_full() -> None:
    service_root = Path(__file__).parents[1]
    dockerfile = (service_root / "Dockerfile").read_text(encoding="utf-8")
    certificate = service_root / "certs" / "prod-ca-2021.crt"

    assert certificate.is_file()
    assert "COPY certs/prod-ca-2021.crt /etc/ssl/certs/supabase-prod-ca-2021.crt" in dockerfile
    assert "PGSSLROOTCERT=/etc/ssl/certs/supabase-prod-ca-2021.crt" in dockerfile
