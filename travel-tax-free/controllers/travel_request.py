
import base64
import hmac
import hashlib
import json
import requests

class travel_request:
    def __init__(self, user=None, password=None, url=None):
        self.user = user
        self.password = password
        self.url = url

    def generateSign(self, password, data):
        return base64.b64encode(hmac.new(password, data, digestmod=hashlib.sha256).digest())

    def generateRequest(self, data):
        encode = base64.b64encode(json.dumps(data))

        sign = self.generateSign(self.password, encode)
        # print('data: {}'.format(encode))
        # print('sign: {}'.format(sign))
        # print('{}?user={}&data={}&signature={}'.format(url,urllib.quote_plus(usuario),urllib.quote_plus(encode),urllib.quote_plus(sign)))
        # return {'number': '1234'}

        r = requests.post(self.url, data={'user': self.user, 'data': encode, 'signature': sign})
        if r.status_code != 200:
            print
            u'Codigo {} no esperado: {}'.format(r.status_code, r.text)

        return json.loads(r.text)