from odoo import models, api, fields, exceptions, _

class ProductTemplate(models.Model):

    _name = "product.template"
    _inherit = ["product.template"]

    activity_id = fields.Many2one('product.activity', 'Actividad AEAT')