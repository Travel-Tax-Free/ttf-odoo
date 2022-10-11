import logging
from datetime import datetime

from odoo import models, api, fields, exceptions, http, _, tools
from dateutil.relativedelta import relativedelta
from odoo.addons.travel_tax_free.controllers.util import Utils

_logger = logging.getLogger(__name__)

class res_partner(models.Model):
    _name = 'res.partner'
    _inherit = ['res.partner']

    date_birthdate = fields.Date(string="Date birthdate")
    passport = fields.Char(string="Passport")

    def _generate_code(self, msg=None):
        return Utils.generate_code(error='9587',msg=msg)

    def test_tourist_id(self, id):
        return self.search([('id','=',id)])[0].test_tourist()

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
        elif self.country_id.code == 'GB' and (not self.zip or len(self.zip) == 0):
            return self._generate_code(msg='Los turistas del Reino Unido deben de rellenar el código postal')
        else:
            return self._generate_code()


    @api.model
    def create_from_ui(self, partner):
        category_id = self.env['ir.config_parameter'].sudo().get_param('base.taxfree_category_id')

        if category_id:
            partner['category_id'] = [(4,int(category_id))]

        return super(res_partner, self).create_from_ui(partner)


