from odoo import api, fields, models
import logging


_logger = logging.getLogger(__name__)

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    taxfree_url = fields.Selection([('demo', 'Demo'), ('produccion', 'Producción'), ], 'Entorno', default='demo', config_parameter='base.taxfree_url')
    #taxfree_user = fields.Char(string="Usuario", config_parameter='base.taxfree_user')
    #taxfree_password = fields.Char(string="Password", config_parameter='base.taxfree_password')
    taxfree_format = fields.Selection([('ticket', 'Ticket'), ('A4', 'A4'), ], 'Formato', default='ticket', config_parameter='base.taxfree_format')
    taxfree_attach = fields.Boolean(string='Adjuntar documento', config_parameter='base.taxfree_attach')
    taxfree_serial = fields.Boolean(string='Enviar número de serie', config_parameter='base.taxfree_serial')
    taxfree_category_id = fields.Many2one('res.partner.category', string='Categoria', config_parameter='base.taxfree_category_id')
    taxfree_email_required = fields.Boolean(string='Email requerido', config_parameter='base.taxfree_email_required')
    taxfree_selectize_country = fields.Boolean(string='Selector paises', config_parameter='base.taxfree_selectize_country')
    #taxfree_users = fields.Many2many('travel.users', string="Usuarios")

    def open_users(self):
        return {
            'name': 'Travel Users',
            'view_type': 'form',
            'view_mode': 'tree,form',
            'view_id': False,
            'res_model': 'travel.users',
            'type': 'ir.actions.act_window',
            'target': 'main',
        }
