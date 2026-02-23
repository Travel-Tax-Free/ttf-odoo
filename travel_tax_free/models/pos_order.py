# -*- coding: utf-8 -*-
# TraveltaxFree 2026 ©
import logging

from odoo import models, api, fields, http, _
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)

class pos_order(models.Model):
    _inherit = "pos.order"

    x_tax_free = fields.Boolean(string="Tax free")

    def generate_taxfree_from_order(self, pos=True):
        self.ensure_one()
        if not self.account_move:
            return {'code': '9999', 'msg': 'Esperando a que la factura se valide...'}

        response = self.account_move.generate_taxfree_from_invoice(pos=pos)
        if response and response.get('code') == '0000':
            self.write({
                'x_tax_free': True,
                'note': response.get('number'),
            })
        return response

    @api.model
    def generate_taxfree_from_order_name(self, order_name):
        order = self.search([('pos_reference', '=', order_name)], limit=1)
        if order:
            return order.generate_taxfree_from_order()
        return {'code': '404', 'msg': 'Pedido no encontrado en el servidor'}