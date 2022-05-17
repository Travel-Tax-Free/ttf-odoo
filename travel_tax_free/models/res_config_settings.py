from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    taxfree_url = fields.Selection([('demo', 'Demo'), ('produccion', 'Producción'), ], 'Entorno', default='demo', config_parameter='base.taxfree_url')
    taxfree_user = fields.Char(string="Usuario", config_parameter='base.taxfree_user')
    taxfree_password = fields.Char(string="Password", config_parameter='base.taxfree_password')
    taxfree_format = fields.Selection([('ticket', 'Ticket'), ('A4', 'A4'), ], 'Formato', default='ticket', config_parameter='base.taxfree_format')
    taxfree_attach = fields.Boolean(string='Adjuntar documento', config_parameter='base.taxfree_attach')
    taxfree_serial = fields.Boolean(string='Enviar número de serie', config_parameter='base.taxfree_serial')

