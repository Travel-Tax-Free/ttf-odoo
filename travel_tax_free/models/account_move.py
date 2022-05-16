# -*- coding: utf-8 -*-
# TraveltaxFree 2022 ©

from odoo import models, api, fields, exceptions, http, _
from odoo.addons.travel_tax_free.controllers.util import Utils

class account_move(models.Model):
    _name = "account.move"
    _inherit = ["account.move"]

    taxfree = fields.Char(string="Tax free")

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