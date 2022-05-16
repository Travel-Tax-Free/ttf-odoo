from datetime import datetime

from odoo import models, api, fields, exceptions, http, _, tools
from dateutil.relativedelta import relativedelta
from odoo.addons.travel_tax_free.controllers.util import Utils

class res_partner(models.Model):
    _name = 'res.partner'
    _inherit = ['res.partner']

    date_birthdate = fields.Date(string="Date birthdate")
    passport = fields.Char(string="Passport")

    def _generate_code(self, msg=None):
        return Utils.generate_code(error='9587',msg=msg)

    def test_tourist(self):
        if self.company_type != 'person':
            return self._generate_code(msg='Solo es posible realizar tax free a persona fisica')
        elif not self.name or len(self.name)<3:
            return self._generate_code(msg='Nombre del turista incorrecto')
        elif not self.passport or len(self.passport)<3:
            return self._generate_code(msg='Pasaporte del turista incorrecto')
        elif not self.country_id:
            return self._generate_code(msg='Falta país de residencia del turista')
        elif not self.country_id.aeat_allow:
            return self._generate_code(msg='País {} no permitido para realizar tax free'.format(self.country_id.name))
        elif not self.date_birthdate:
            return self._generate_code(msg='Falta fecha de nacimiento')
        elif relativedelta(datetime.now().date(), self.date_birthdate).years<16:
            return self._generate_code(msg='El turista tiene menos de 16 años')
        else:
            return self._generate_code()


