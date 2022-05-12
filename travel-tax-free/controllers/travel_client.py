import base64
import hmac
import hashlib
import json
import requests

class travel_client:

    url_create_check = '/api/ws/create_check'

    def __init__(self, env):
        self.env = env

        self.user = self.env['ir.config_parameter'].sudo().get_param('ttf_user')
        self.password = self.env['ir.config_parameter'].sudo().get_param('ttf_password')
        self.url = self.env['ir.config_parameter'].sudo().get_param('ttf_url')

    def generate_order_taxfree(self, order):
        pass

