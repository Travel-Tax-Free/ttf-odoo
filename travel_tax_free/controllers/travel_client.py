import logging

from .travel_request import TravelRequest
from .util import Utils

_logger = logging.getLogger(__name__)

class TravelClient:
    def __init__(self, env):
        self.env = env

        self.user = self.env['ir.config_parameter'].sudo().get_param('ttf_user')
        self.password = self.env['ir.config_parameter'].sudo().get_param('ttf_password')
        self.url = self.env['ir.config_parameter'].sudo().get_param('ttf_url')

    def generate_taxfree(self, invoice_id, format='ticket'):
        invoice = self.env['account.move'].browse(invoice_id)

        if not invoice:
            return Utils.generate_code(error='9986', msg='Factura {} no encontrada'.format(invoice_id))

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

            check_lines.append({
                "name": line.name,
                "quantity": int(line.quantity),
                "tax_percent": int(line.tax_ids[0].amount),
                "total": line.price_total},
            )

        data = {
            'tourist_name': invoice.partner_id.name,
            'tourist_passport': invoice.partner_id.passport,
            'tourist_country': invoice.partner_id.country_id.code,
            'tourist_birthdate': invoice.partner_id.date_birthdate.strftime('%Y%m%d'),
            'invoice_number': invoice.name,
            'print_size': format,
            'method': 'pdf_json',
            'check_lines': check_lines
        }

        _logger.info('CHECK {}'.format(data))



        response = {
            'number': '123456',
            'check': 'aG9sYSBtdW5kbw=='
        }

        response = TravelRequest(user=self.user, password=self.password, url=self.url).generate_taxfree(data)

        if 'number' in response:
            invoice.taxfree = response['number']


            attachment = {
                'name': response['number'] + ".pdf",
                'type': 'binary',
                'res_id': invoice_id,
                'res_model': 'account.move',
                'datas': response['check'],
                'mimetype': 'application/x-pdf',
            }

            self.env['ir.attachment'].create(attachment)

            return Utils.generate_code()
        elif 'message' in response:
            return Utils.generate_code(error='9585', msg=response['message'])
        else:
            return response



