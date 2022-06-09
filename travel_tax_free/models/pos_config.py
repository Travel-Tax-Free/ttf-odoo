# -*- coding: utf-8 -*-
# TraveltaxFree 2022 ©

from odoo import models, api, fields, exceptions, http, _

class pos_config(models.Model):
    _name = "pos.config"
    _inherit = ["pos.config"]

    partner_email_required = fields.Boolean(string="Email obligatorio", compute='_compute_email_required')
    experimental_country = fields.Boolean(string="Selectize paises", compute='_compute_experimental')
    travel_user_id = fields.Many2one('travel.users', string="Usuario tax free")

    def _compute_email_required(self):
        for rec in self:
            rec.partner_email_required = self.env['ir.config_parameter'].sudo().get_param('base.taxfree_email_required')

    def _compute_experimental(self):
        for rec in self:
            rec.experimental_country = self.env['ir.config_parameter'].sudo().get_param('base.taxfree_selectize_country')