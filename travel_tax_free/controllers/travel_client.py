import logging

from odoo import exceptions
from .travel_request import TravelRequest
from .util import Utils

_logger = logging.getLogger(__name__)

class TravelClient:
    def __init__(self, env, format=None):
        self.env = env

        self.url = 'https://ws-es.traveltaxfree.com' if self.env['ir.config_parameter'].sudo().get_param('base.taxfree_url') == 'produccion' else 'https://demo-es.traveltaxfree.com'
        self.format = self.env['ir.config_parameter'].sudo().get_param('base.taxfree_format') if not format else format
        #self.attach = self.env['ir.config_parameter'].sudo().get_param('base.taxfree_attach')
        self.serial = self.env['ir.config_parameter'].sudo().get_param('base.taxfree_serial')

    def generate_taxfree(self, invoice):
        if not invoice:
            return Utils.generate_code(error='9986', msg='Factura {} no encontrada'.format(invoice.id))

        if not invoice.partner_id:
            return Utils.generate_code(error='9987', msg='Error verificando el turista. Turista inexistente')

        tourist_check = invoice.partner_id.test_tourist()

        if tourist_check['code'] != '0000':
            return tourist_check

        invoice_check =  invoice.test_taxfree_invoice()
        if invoice_check['code'] != '0000':
            return invoice_check

        check_lines = []

        for line in invoice.line_ids:
            if len(line.tax_ids) == 0:
                continue

            check_line = {
                "name": line.name,
                "quantity": int(line.quantity),
                "tax_percent": int(line.tax_ids[0].amount),
                "total": line.price_total
            }

            if self.serial and line.product_id.barcode:
                check_line['serial'] = line.product_id.barcode

            check_lines.append(check_line)

        data = {
            'tourist_name': invoice.partner_id.name,
            'tourist_passport': invoice.partner_id.passport,
            'tourist_country': invoice.partner_id.country_id.code,
            'tourist_birthdate': invoice.partner_id.date_birthdate.strftime('%Y%m%d'),
            'invoice_number': invoice.name,
            'print_size': self.format,
            'method': 'pdf_json',
            'check_lines': check_lines
        }

        if invoice.partner_id.zip:
            data['tourist_zip'] = invoice.partner_id.zip

        #_logger.info('CHECK {}'.format(data))

        response = {
            'number': '123456',
            'check': 'aG9sYSBtdW5kbw=='
        }

        # Busqueda del usuario
        if invoice.pos_order_ids and invoice.pos_order_ids[0].config_id.travel_user_id:
            user = invoice.pos_order_ids[0].config_id.travel_user_id.user
            password = invoice.pos_order_ids[0].config_id.travel_user_id.key
        else:
            default = self.env['travel.users'].search([('default','=',True)])
            if default:
                user = default[0].user
                password = default[0].key
            else:
                raise exceptions.Warning('No se ha encontrado usuario por defecto')

        response = TravelRequest(user=user, password=password, url=self.url).generate_taxfree(data)

        if 'number' in response:
            response['code'] = '0000'

            return response

        elif 'message' in response:
            return Utils.generate_code(error='9585', msg=response['message'])
        else:
            return response



