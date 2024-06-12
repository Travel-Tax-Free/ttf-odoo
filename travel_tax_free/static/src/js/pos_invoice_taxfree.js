odoo.define("pos_taxfree.PosInvoiceTaxfree", function(require){
    'use strict;'

    const Registries = require('point_of_sale.Registries');
    const PaymentScreen = require('point_of_sale.PaymentScreen');

    const PosInvoiceTaxfree = (PaymentScreen) =>
        class PosInvoiceTaxfree extends PaymentScreen {
            setup() {
                super.setup();
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
                // click_invoice
                super.toggleIsToInvoice();
                var order = this.env.pos.get_order();
                if (!order.is_to_invoice() && order.is_to_taxfree()) {
                    this.button_taxfree(false);
                }
            }

            async _postPushOrderResolve(order, server_ids){
                // post_push_order_resolve
                var self = this;

                return new Promise(function (resolve, reject) {
                    var promise = this.super(order, server_ids);

                    promise.then(function() {
                        if (!order.is_to_invoice()) {
                            resolve();
                        } else {
                            self.pos.get_invoice_number(order).then(function() {
                                resolve();
                            }).catch(function(error) {
                                reject(error)
                            });
                        }

                    }).catch(function(error) {
                        reject(error);
                    });
                })
            }
       };

    Registries.Component.extend(PaymentScreen, PosInvoiceTaxfree);
    return PosInvoiceTaxfree;

});
