odoo.define("pos_taxfree.PosInvoiceTaxfree", function(require){
    'use strict';

    const Registries = require('point_of_sale.Registries');
    const PaymentScreen = require('point_of_sale.PaymentScreen');
    const rpc = require('web.rpc');
    const { Gui } = require('point_of_sale.Gui');

    const PosInvoiceTaxfree = (PaymentScreen) =>
        class PosInvoiceTaxfree extends PaymentScreen {
            setup() {
                super.setup();
            }

            async validateOrder(isForceValidate) {
                const order = this.currentOrder;

                if (order.is_to_taxfree()) {
                    const partner = order.get_partner();
                    if (!partner) {
                        Gui.showPopup('ErrorPopup', { title: 'Error', body: 'Seleccione un cliente' });
                        return;
                    }

                    try {
                        const res = await rpc.query({
                            model: 'res.partner',
                            method: 'test_tourist_id',
                            args: [partner.id],
                        });

                        if (res && res.code !== '0000') {
                            Gui.showPopup('ErrorPopup', { title: 'Error Tax Free', body: res.msg });
                            return;
                        }
                    } catch (err) {
                        console.error("Error en validación RPC:", err);
                        Gui.showPopup('ErrorPopup', { title: 'Error de Conexión', body: 'No se pudo validar el turista.' });
                        return;
                    }
                }
                return super.validateOrder(isForceValidate);
            }

            click_taxfree() {
                var order = this.env.pos.get_order();
                this.button_taxfree(!order.is_to_taxfree());
                if (!order.is_to_invoice()) {
                    this.toggleIsToInvoice();
                }
            }

            button_taxfree(state) {
                var order = this.env.pos.get_order();
                order.set_to_taxfree(state);
                $('.js_taxfree').toggleClass('highlight', state);
            }

            toggleIsToInvoice() {
                super.toggleIsToInvoice();
                var order = this.env.pos.get_order();
                if (!order.is_to_invoice() && order.is_to_taxfree()) {
                    this.button_taxfree(false);
                }
            }

            get isTaxFreeActive() {
                return this.currentOrder ? this.currentOrder.is_to_taxfree() : false;
            }
        };

    Registries.Component.extend(PaymentScreen, PosInvoiceTaxfree);
});