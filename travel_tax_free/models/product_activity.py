from odoo import models, api, fields, exceptions, http, _

class ProductActivity(models.Model):

    _name = 'product.activity'
    _description = 'Actividades permitidas por la AEAT'

    name = fields.Char(string="Nombre", required=True)
    alias = fields.Char(string="Alias", size=3, required=True)
    product_ids = fields.One2many(comodel_name="product.template", string="Productos", track_visibility='onchange', inverse_name="activity_id")


    _sql_constraints = [
        ('alias_unique', 'unique(alias)', 'Alias ya existe en la base de datos!'),
    ]
