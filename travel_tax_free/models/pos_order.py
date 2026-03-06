# -*- coding: utf-8 -*-
# TraveltaxFree 2026
import logging
import time

from odoo import models, api, fields, _
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)


class pos_order(models.Model):
    _inherit = "pos.order"

    x_tax_free = fields.Boolean(string="Tax free")

    def generate_taxfree_from_order(self, pos=True):
        self.ensure_one()

        invoice = None
        for attempt in range(5):
            self.invalidate_recordset()
            invoice = (
                self.account_move if getattr(self, 'account_move', False)
                else (self.invoice_ids[0] if getattr(self, 'invoice_ids', False) and self.invoice_ids else None)
            )
            if invoice:
                _logger.warning("TTF: factura encontrada en intento %d: %s (id=%d)",
                                attempt + 1, invoice.name, invoice.id)
                break
            _logger.warning("TTF: factura no disponible, intento %d/5 para pedido '%s'",
                            attempt + 1, self.pos_reference or self.name)
            if attempt < 4:
                time.sleep(1)

        if not invoice:
            msg = ('La factura no se ha generado para el pedido {}. '
                   'Intente crear el Tax Free manualmente desde la factura.'
                   ).format(self.pos_reference or self.name)
            _logger.warning("TTF: %s", msg)
            return {'code': '9999', 'msg': msg}

        response = invoice.generate_taxfree_from_invoice(pos=pos)

        if response and response.get('code') == '0000':
            self.write({'x_tax_free': True})
            _logger.warning("TTF: taxfree generado correctamente: %s", response.get('number'))
        else:
            _logger.warning("TTF: error generando taxfree: %s", response)

        return response

    @api.model
    def generate_taxfree_from_order_id(self, order_id):
        order = self.browse(order_id)
        if not order.exists():
            return {'code': '404', 'msg': 'Pedido con id {} no encontrado'.format(order_id)}
        return order.generate_taxfree_from_order()

    @api.model
    def generate_taxfree_from_order_name(self, order_name):
        order = self.search([('pos_reference', '=', order_name)], limit=1)
        if not order:
            order = self.search([('name', '=', order_name)], limit=1)
        if order:
            return order.generate_taxfree_from_order()
        return {'code': '404', 'msg': 'Pedido {} no encontrado'.format(order_name)}