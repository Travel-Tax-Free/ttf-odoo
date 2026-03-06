# -*- coding: utf-8 -*-
# TraveltaxFree 2026
import logging

from odoo import models, fields, exceptions, _
from odoo.addons.travel_tax_free.controllers.travel_client import TravelClient
from odoo.addons.travel_tax_free.controllers.util import Utils

_logger = logging.getLogger(__name__)


class account_move(models.Model):
    _name = "account.move"
    _inherit = ["account.move"]

    taxfree = fields.Char(string="Número tax free")
    taxfree_id = fields.Many2one('ir.attachment', 'Documento tax free')

    def _generate_code(self, msg=None):
        return Utils.generate_code(error='9586', msg=msg)

    def test_taxfree_invoice(self):
        if self.state != 'posted':
            return self._generate_code(
                msg='Factura {} en estado incorrecto ({})'.format(self.name, self.state)
            )
        if self.amount_total <= 0:
            return self._generate_code(
                msg='Factura {} tiene importe total <= 0'.format(self.name)
            )
        if round(self.amount_total, 2) == round(self.amount_untaxed, 2):
            return self._generate_code(
                msg='La factura {} no tiene IVA (total={}, sin_impuestos={})'.format(
                    self.name, self.amount_total, self.amount_untaxed)
            )
        if self.taxfree:
            return self._generate_code(
                msg='La factura {} ya tiene el taxfree {} asociado'.format(self.name, self.taxfree)
            )
        for line in self.line_ids:
            if len(line.tax_ids) > 1:
                return self._generate_code(
                    msg='La factura {} tiene líneas con más de un tipo de IVA'.format(self.name)
                )
        return self._generate_code()

    def generate_taxfree_from_invoice(self, pos=False):
        response = TravelClient(self.env).generate_taxfree(self)

        if 'code' in response and response['code'] == '0000':
            data = {'taxfree': response['number']}

            attach = self.env['ir.config_parameter'].sudo().get_param('base.taxfree_attach')
            if attach:
                attachment = {
                    'name': response['number'] + ".pdf",
                    'type': 'binary',
                    'res_id': self.id,
                    'res_model': 'account.move',
                    'datas': response['check'],
                    'mimetype': 'application/pdf',
                }
                data['taxfree_id'] = self.env['ir.attachment'].create(attachment).id

            self.write(data)
            return response

        elif pos:
            # Si se llama desde el POS devuelve la respuesta de error en lugar de lanzar excepción
            return response
        else:
            # Si se llama desde el wizard lanza la excepción con mensaje descriptivo
            if 'code' not in response:
                raise exceptions.ValidationError(
                    _('Error creando tax free. Detalles: {}'.format(response))
                )
            code = response['code']
            msg = response.get('msg', '')
            if code == '9587':
                raise exceptions.ValidationError(
                    _('El turista no pasa las verificaciones: {}'.format(msg))
                )
            elif code == '9586':
                raise exceptions.ValidationError(
                    _('La factura no pasa las verificaciones: {}'.format(msg))
                )
            elif code == '9585':
                raise exceptions.ValidationError(
                    _('Error del servidor Tax Free: {}'.format(msg))
                )
            else:
                raise exceptions.ValidationError(
                    _('Error {} generando Tax Free: {}'.format(code, msg))
                )

    def remove_taxfree(self):
        if not self.taxfree:
            raise exceptions.ValidationError(
                _('La factura {} no tiene un taxfree asociado'.format(self.name))
            )
        if self.taxfree_id:
            self.taxfree_id.unlink()
        self.write({'taxfree': None, 'taxfree_id': None})