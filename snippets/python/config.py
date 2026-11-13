from dataclasses import dataclass


@dataclass(frozen=True)
class ServiceConfig:
    service_name: str
    port: int


def parse_service_config(value: object) -> ServiceConfig:
    if not isinstance(value, dict):
        raise ValueError("configuration must be an object")

    service_name = value.get("service_name")
    if not isinstance(service_name, str) or not service_name.strip():
        raise ValueError("service_name must be a non-empty string")

    port = value.get("port")
    if isinstance(port, bool) or not isinstance(port, int) or not 1 <= port <= 65535:
        raise ValueError("port must be an integer between 1 and 65535")

    return ServiceConfig(service_name=service_name.strip(), port=port)
