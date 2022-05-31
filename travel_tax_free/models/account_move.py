# -*- coding: utf-8 -*-
# TraveltaxFree 2022 ©
import logging

from odoo.addons.travel_tax_free.controllers.travel_client import TravelClient
from odoo import models, api, fields, exceptions, http, _
from odoo.addons.travel_tax_free.controllers.util import Utils

_logger = logging.getLogger(__name__)

class account_move(models.Model):
    _name = "account.move"
    _inherit = ["account.move"]

    taxfree = fields.Char(string="Número tax free")
    taxfree_id = fields.Many2one('ir.attachment','Documento tax free')

    def _generate_code(self, msg=None):
        return Utils.generate_code(error='9586', msg=msg)

    def test_taxfree_invoice(self):
        if self.state != 'posted':
            return self._generate_code(msg='Factura {} en estado incorrecto'.format(self.name))
        elif self.amount_total <= 0:
            return self._generate_code(msg='Factura {} tiene un valor total menor o igual a cero'.format(self.name))
        elif self.amount_total == self.amount_untaxed:
            return self._generate_code(msg='La factura {} no tiene IVA'.format(self.name))
        elif self.taxfree:
            return self._generate_code(msg='La factura {} tiene el taxfree {} asociado'.format(self.name,self.taxfree))

        for line in self.line_ids:
           if len(line.tax_ids) > 1:
               return self._generate_code(msg='La factura {} tiene lineas con más de un tipo de IVA')

        return self._generate_code()


    def generate_taxfree_from_invoice(self):
        response = TravelClient(self.env).generate_taxfree(self)

        if not 'code' in response:
            raise exceptions.Warning('Error creando tax free. Detalles: {}'.format(response))
        elif response['code'] != '0000':
            if response['code'] == '9587':
                raise exceptions.Warning('El turista no pasa las verificaciones. Detalles: {}'.format(response['msg']))
            elif response['code'] == '9586':
                raise exceptions.Warning('La factura no pasa las verificaciones. Detalles: {}'.format(response['msg']))
            elif response['code'] == '9585':
                raise exceptions.Warning('Error creando tax free. Detalles: {}'.format(response['msg']))
            else:
                raise exceptions.Warning('Error {} no especifico. {}'.format(response['code'], response['msg'] if 'msg' in response else ''))
        else:
            data = {
                'taxfree': response['number']
            }

            attach = self.attach = self.env['ir.config_parameter'].sudo().get_param('base.taxfree_attach')
            if attach:
                attachment = {
                    'name': response['number'] + ".pdf",
                    'type': 'binary',
                    'res_id': self.id,
                    'res_model': 'account.move',
                    'datas': response['check'],
                    'mimetype': 'application/x-pdf',
                }

                data['taxfree_id'] = self.env['ir.attachment'].create(attachment).id

            self.write(data)

            return response