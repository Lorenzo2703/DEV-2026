import unittest

from config import ServiceConfig, parse_service_config


class ParseServiceConfigTests(unittest.TestCase):
    def test_parses_valid_configuration_and_trims_name(self) -> None:
        config = parse_service_config({"service_name": " api ", "port": 8000})

        self.assertEqual(config, ServiceConfig(service_name="api", port=8000))

    def test_rejects_non_object_and_invalid_name(self) -> None:
        for value in (None, [], {"service_name": " ", "port": 8000}, {"port": 8000}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse_service_config(value)

    def test_accepts_port_boundaries_and_rejects_invalid_ports(self) -> None:
        for port in (1, 65535):
            with self.subTest(port=port):
                self.assertEqual(
                    parse_service_config({"service_name": "api", "port": port}).port,
                    port,
                )

        for port in (0, 65536, True, 8000.5, "8000"):
            with self.subTest(port=port), self.assertRaises(ValueError):
                parse_service_config({"service_name": "api", "port": port})


if __name__ == "__main__":
    unittest.main()
