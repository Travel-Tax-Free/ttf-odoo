import base64
import hmac
import hashlib
import json
import requests
import logging

_logger = logging.getLogger(__name__)


class TravelRequest:
    url_create_check = '/api/ws/create_check'

    def __init__(self, user=None, password=None, url=None):
        self.user = user
        self.password = password
        self.url_base = url

    def _generate_sign(self, password, data):
        sign = base64.b64encode(hmac.new(password.encode('utf-8'), data, digestmod=hashlib.sha256).digest())
        return sign.decode('utf-8')

    def _generate_request(self, url, data):
        encode_bytes = base64.b64encode(json.dumps(data).encode('utf-8'))

        sign = self._generate_sign(self.password, encode_bytes)

        encode_str = encode_bytes.decode('utf-8')

        r = requests.post(url, data={'user': self.user, 'data': encode_str, 'signature': sign})

        if r.status_code != 200:
            return {
                'message': 'Codigo {} no esperado: {}'.format(r.status_code, r.text)
            }

        return json.loads(r.text)

    def generate_taxfree(self, data):
        return self._generate_request(self.url_base+self.url_create_check,data)