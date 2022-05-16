import base64
import hmac
import hashlib
import json
import requests

class TravelRequest:
    url_create_check = '/api/ws/create_check'

    def __init__(self, user=None, password=None, url=None):
        self.user = user
        self.password = password
        self.url_base = url

    def _generate_sign(self, password, data):
        #key_bytes = bytes(str(password), 'utf-8')
        #sign = base64.b64encode(hmac.new(key_bytes, data.encode('utf-8'), digestmod=hashlib.sha256).digest())
        sign =  base64.b64encode(hmac.new(password.encode(), data, digestmod=hashlib.sha256).digest())
        return sign.decode('utf-8')

    def _generate_request(self, url, data):
        encode = base64.b64encode(json.dumps(data).encode())

        sign = self._generate_sign(self.password, encode)
        # print('data: {}'.format(encode))
        # print('sign: {}'.format(sign))
        # print('{}?user={}&data={}&signature={}'.format(url,urllib.quote_plus(usuario),urllib.quote_plus(encode),urllib.quote_plus(sign)))
        # return {'number': '1234'}

        r = requests.post(url, data={'user': self.user, 'data': encode, 'signature': sign})
        if r.status_code != 200:
            return {
                'message': u'Codigo {} no esperado: {}'.format(r.status_code, r.text)
            }

        return json.loads(r.text)

    def generate_taxfree(self, data):
        return self._generate_request(self.url_base+self.url_create_check,data)