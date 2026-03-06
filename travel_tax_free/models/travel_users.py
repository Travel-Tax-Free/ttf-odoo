# -*- coding: utf-8 -*-
# TraveltaxFree 2024 ©

from odoo import models, api, fields, exceptions, _

class travel_users(models.Model):
    _name = 'travel.users'
    _description = "Travel users"

    name = fields.Char(string="Nombre", required=True)
    default = fields.Boolean(string="Usuario por defecto")
    user = fields.Char(string="Usuario", required=True)
    key = fields.Char(string="Key", required=True)
    pos_ids = fields.One2many("pos.config", "travel_user_id", string="Puntos de venta")

    @api.constrains('default')
    def _user_id_and_default(self):
        if len(self.search([('default', '=', True)])) > 1:
            raise exceptions.ValidationError("Ya existe un usuario por defecto")