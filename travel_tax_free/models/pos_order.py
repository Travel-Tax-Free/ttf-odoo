# -*- coding: utf-8 -*-
# TraveltaxFree 2024 ©
import logging

from odoo import models, api, fields, http, _
from odoo.exceptions import ValidationError

_logger = logging.getLogger(__name__)

class pos_order(models.Model):
    _name = "pos.order"
    _inherit = ["pos.order"]

    x_tax_free = fields.Boolean(string="Tax free")

    @api.constrains('account_move')
    def generate_taxfree_from_order(self, pos=True):
        if not self.account_move:
            raise ValidationError(_("El pedido {} no tiene factura asociada".format(self.pos_reference)))
        else:
            response = self.account_move.generate_taxfree_from_invoice(pos=pos)
            if 'code' in response and response['code'] == '0000':
                self.write({
                    'x_tax_free': True,
                    'note': response['number'],
                })

            return response

    def generate_taxfree_from_order_name(self, order_name):
        order = self.search([('pos_reference','=',order_name)], limit=1)
        return order.generate_taxfree_from_order()

