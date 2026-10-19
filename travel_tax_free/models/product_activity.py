# -*- coding: utf-8 -*-
# TraveltaxFree 2026
from odoo import models, fields, exceptions


class ProductActivity(models.Model):
    _name = 'product.activity'
    _description = 'Actividades permitidas por la AEAT'

    name = fields.Char(string="Nombre", required=True)
    alias = fields.Char(string="Alias", size=3, required=True)
    product_ids = fields.One2many(
        comodel_name="product.template",
        string="Productos",
        #tracking=True,
        inverse_name="activity_id",
    )

    #en odoo 19 ahora se declaran así
    _alias_unique = models.Constraint('unique(alias)', 'Alias ya existe en la base de datos!')