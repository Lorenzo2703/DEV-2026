import unittest


def greeting(name: str) -> str:
    if not name.strip():
        raise ValueError("name must not be empty")
    return f"Hello, {name.strip()}!"


class GreetingTests(unittest.TestCase):
    def test_strips_whitespace(self) -> None:
        self.assertEqual(greeting(" Ada "), "Hello, Ada!")

    def test_rejects_empty_name(self) -> None:
        with self.assertRaises(ValueError):
            greeting(" ")


if __name__ == "__main__":
    unittest.main()
