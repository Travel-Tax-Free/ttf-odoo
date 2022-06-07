# -*- coding: utf-8 -*-
# TraveltaxFree 2022 ©
import logging

from odoo import models, api, fields, exceptions, http, _

_logger = logging.getLogger(__name__)

class pos_order(models.Model):
    _name = "pos.order"
    _inherit = ["pos.order"]

    x_tax_free = fields.Boolean(string="Tax free")

    def generate_taxfree_from_order(self):
        if not self.account_move:
            raise Warning("El pedido {} no tiene factura asociada".format(self.pos_reference))
        else:
            response = self.account_move.generate_taxfree_from_invoice()
            if 'code' in response and response['code'] == '0000':
                self.write({
                    'x_tax_free': True,
                    'note': response['number'],
                })

            return response

    def generate_taxfree_from_order_name(self, order_name):
        order = self.search([('pos_reference','=',order_name)], limit=1)
        return order.generate_taxfree_from_order()

