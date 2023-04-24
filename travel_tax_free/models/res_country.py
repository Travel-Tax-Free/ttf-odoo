# -*- coding: utf-8 -*-
# TraveltaxFree 2022 ©
import pycountry

from odoo import models, api, fields, exceptions, http, _

class res_country(models.Model):

    _name = "res.country"
    _inherit = ["res.country"]

    aeat_allow = fields.Boolean(string="Taxfree permitido")

    code_alpha3 = fields.Char(
        string='Country Code (3-letter)', size=3, store=True,
        help='ISO 3166-1 alpha-3 (three-letter) code for the country',
        compute="_compute_codes")
    code_numeric = fields.Char(
        string='Country Code (numeric)', size=3, store=True,
        help='ISO 3166-1 numeric code for the country',
        compute="_compute_codes")

    @api.depends('code')
    def _compute_codes(self):
        for country in self:
            c = False
            for country_type in ['countries', 'historic_countries']:
                try:
                    c = getattr(pycountry, country_type).get(
                        alpha_2=country.code)
                except KeyError:
                    try:
                        c = getattr(pycountry, country_type).get(
                            alpha2=country.code)
                    except KeyError:
                        pass
                if c:
                    break
            if c:
                country.code_alpha3 = getattr(c, 'alpha_3',
                                              getattr(c, 'alpha3', False))
                country.code_numeric = c.numeric
            else:
                country.code_alpha3 = False
                country.code_numeric = False

    @api.model
    def _init_country(self):
        aeat_countries = [
            {'name': 'Islas del Canal', 'code': '20'},
            {'name': 'Busingen', 'code': '30'},
            {'name': 'Helgoland', 'code': '31'},
            {'name': 'Monte Athos', 'code': '60'},
            {'name': 'Livigno', 'code': '70'},
            {'name': 'Lago Lugano', 'code': '71'},
            {'name': "Campione D'Italia", 'code': '72'},
            {'name': 'Islas Canarias', 'code': 'XB'},
            {'name': 'Ceuta', 'code': 'XC'},
            {'name': 'Melilla', 'code': 'XL'}
        ]

        paises_ue = ['DE','AT','BE','BG','CY','HR','DK','SK','SI','ES','EE','FI','FR','EL','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','CZ','RO','SE']

        countries = self.env['res.country'].search([('code', 'in', [x['code'] for x in aeat_countries])])

        exists_countries = [country.code for country in countries]
        new_countries = [x for x in aeat_countries if x['code'] not in exists_countries]

        if new_countries:
            self.env['res.country'].create(new_countries)

        c = self.env['res.country'].search([('code','not in',paises_ue)])
        c.write({'aeat_allow': True})
