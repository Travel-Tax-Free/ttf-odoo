from odoo import models, api, fields, exceptions, http, _, tools

class res_partner(models.Model):
    _name = 'res.partner'
    _inherit = ['res.partner']

    date_birthdate = fields.Date(string="Date birthdate")
    passport = fields.Char(string="Passport")

