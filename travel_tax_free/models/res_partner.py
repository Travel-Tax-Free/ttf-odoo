import logging
from datetime import datetime

from odoo import models, api, fields, _
from dateutil.relativedelta import relativedelta
from odoo.addons.travel_tax_free.controllers.util import Utils

_logger = logging.getLogger(__name__)


class res_partner(models.Model):
    _name = 'res.partner'
    _inherit = ['res.partner']

    date_birthdate = fields.Date(string="Fecha de nacimiento")
    passport = fields.Char(string="Pasaporte")
    passport_country_id = fields.Many2one("res.country", string="País de pasaporte")
    same_country = fields.Boolean(string="Mismo país de pasaporte", default=True)

    @api.onchange('same_country')
    def _onchange_same_country(self):
        # Limpia passport_country_id cuando same_country se activa
        if self.same_country:
            self.passport_country_id = False

    def _generate_code(self, msg=None):
        return Utils.generate_code(error='9587', msg=msg)

    @api.model
    def test_tourist_id(self, partner_id):
        partner = self.browse(partner_id)
        if not partner.exists():
            return {'code': '404', 'msg': 'Cliente no encontrado'}
        return partner.test_tourist()

    def test_tourist(self):
        if self.company_type != 'person':
            return self._generate_code(msg='Solo es posible realizar tax free a persona fisica')
        elif not self.name or len(self.name) < 3:
            return self._generate_code(msg='Nombre del turista incorrecto')
        elif not self.passport or len(self.passport) < 3:
            return self._generate_code(msg='Pasaporte del turista incorrecto')
        elif not self.country_id:
            return self._generate_code(msg='Falta pais de residencia del turista')
        elif not self.country_id.aeat_allow:
            return self._generate_code(
                msg='Pais {} no permitido para realizar tax free'.format(self.country_id.name)
            )
        elif not self.date_birthdate:
            return self._generate_code(msg='Falta fecha de nacimiento')
        elif relativedelta(datetime.now().date(), self.date_birthdate).years < 5:
            return self._generate_code(msg='El turista tiene menos de 5 años')
        elif self.country_id.code == 'GB' and (not self.zip or len(self.zip) == 0):
            return self._generate_code(
                msg='Los turistas del Reino Unido deben rellenar el codigo postal'
            )
        elif self.country_id.code == 'GB' and self.zip.upper().startswith("BT"):
            return self._generate_code(
                msg='Los turistas residentes en Irlanda del Norte no tienen derecho al tax free'
            )
        else:
            return self._generate_code()

    def _load_pos_data_fields(self, config):
        fields = super()._load_pos_data_fields(config)
        fields += ['date_birthdate', 'passport', 'passport_country_id', 'same_country']
        return fields