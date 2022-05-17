import logging

from odoo import _, api, fields, models, exceptions
from odoo.addons.travel_tax_free.controllers.travel_client import TravelClient

_logger = logging.getLogger(__name__)

class sendTTFWizard(models.TransientModel):
    _name = 'taxfree.wizard.sendttf'
    _description = 'Send to Travel Tax Free'

    #pos_order_id = fields.Many2one(comodel_name='pos.order',string="Pedido")

    attach = fields.Binary(string="Fichero")


    def open_wizard(self, order_id=None):
        title_view = 'Enviar taxfree'
        data_obj = self.env['ir.model.data']
        result = data_obj._get_id('travel-tax-free', 'taxfree_send_form')
        view_id = data_obj.browse(result).res_id
        #res_id = self.env['taxfree.wizard.validate'].create(data)
        # title_view = 'Validate Standard process' if context.get('arh_type', False) else 'Validate Advance/City process'

        res = {
            'name': title_view,
            'view_type': 'form',
            'view_mode': 'form',
            'res_model': self._name,
            'view_id': [view_id],
            'domain': [],
            'type': 'ir.actions.act_window',
            'target': 'new',
        }

        _logger.info(order_id)

        if order_id:
            res['res_id'] = self.create({'pos_order_id': order_id}).id

            #self.pos_order_id = self.env['pos.order'].browse(order_id) # NO FUNCIONA

        return res

    def send_taxfree(self, invoice_id):
        response = TravelClient(self.env).generate_taxfree(invoice_id)

        #_logger.info('------- {}'.format(response))

        if not 'code' in response:
            raise exceptions.Warning('Error creando tax free. Detalles: {}'.format(response))
        elif response['code'] != '0000':
            if response['code'] == '9587':
                raise exceptions.Warning('El turista no pasa las verificaciones. Detalles: {}'.format(response['msg']))
            elif response['code'] == '9586':
                raise exceptions.Warning('La factura no pasa las verificaciones. Detalles: {}'.format(response['msg']))
            elif response['code'] == '9585':
                raise exceptions.Warning('Error creando tax free. Detalles: {}'.format(response['msg']))
            else:
                raise exceptions.Warning('Error {} no especifico. {}'.format(response['code'], response['msg'] if 'msg' in response else ''))
        else:

            new = self.create({'attach': response['check']})

            return {
                'name': 'Tax free',
                'res_model': 'ir.actions.act_url',
                'type': 'ir.actions.act_url',
                'target': 'new',
                'url': '/web/content/{}/{}/attach/{}'.format(self._name, new.id, response['number']+'.pdf')
            }





