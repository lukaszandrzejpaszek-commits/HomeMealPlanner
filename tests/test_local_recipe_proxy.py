import socket
import unittest
from unittest.mock import patch

import local_recipe_proxy as proxy


def address(ip):
    return (socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443))


class TargetValidationTests(unittest.TestCase):
    @patch.object(proxy.socket, "getaddrinfo", return_value=[address("93.184.216.34")])
    def test_public_https_url(self, resolve):
        target, hostname, ip = proxy.validated_target("https://example.com/recipe?q=1#section")
        self.assertEqual((target, hostname, ip), ("https://example.com/recipe?q=1", "example.com", "93.184.216.34"))
        resolve.assert_called_once()

    @patch.object(proxy.socket, "getaddrinfo", return_value=[address("93.184.216.34"), address("127.0.0.1")])
    def test_rejects_host_with_any_private_address(self, resolve):
        with self.assertRaises(proxy.ProxyError):
            proxy.validated_target("https://example.com/recipe")

    def test_rejects_unsafe_urls(self):
        for url in ("http://example.com/", "https://127.0.0.1/", "https://example.com:8443/", "https://user@example.com/"):
            with self.subTest(url=url), self.assertRaises(proxy.ProxyError):
                proxy.validated_target(url)

    @patch.object(proxy.socket, "getaddrinfo", return_value=[address("93.184.216.34")])
    @patch.object(proxy.http.client, "HTTPSConnection")
    def test_redirect_to_private_address_is_rejected(self, connection, resolve):
        response = connection.return_value.getresponse.return_value
        response.status = 302
        response.getheader.return_value = "https://127.0.0.1/"
        with self.assertRaises(proxy.ProxyError):
            proxy.fetch_recipe("https://example.com/")
        connection.return_value.close.assert_called_once()


if __name__ == "__main__":
    unittest.main()
