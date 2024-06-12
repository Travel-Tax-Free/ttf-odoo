odoo.define("pos_taxfree.PosPrintTaxfree", function(require){
    'use strict;'

    const { _t } = require("web.core");
    const Registries = require('point_of_sale.Registries');
    const ReceiptScreen = require('point_of_sale.ReceiptScreen');

    const PosPrintTaxfree = (ReceiptScreen) =>
        class PosPrintTaxfree extends ReceiptScreen {
            setup() {
                super.setup();

                var order = this.currentOrder;
                var is_to_taxfree = order.is_to_taxfree();
                this.set_order_name(is_to_taxfree ? order.name : null);
            }

            get currentOrder() {
                return this.env.pos.get_order();
            }

            set_order_name(order_name) {
                this.order_name = order_name;
            }
            get_order_name(){
                return this.order_name;
            }

            click_print_taxfree() {
                var order = this.currentOrder;
                if (order.error_taxfree) {
                    this.showPopup('ErrorPopup',{
                        'title': _t('Error creating tax free'),
                        'body': order.error_taxfree,
                    });
                } else if (!order.get_taxfree_pdf()) {
                    this.showPopup('ErrorPopup',{
                        'title': _t('Error creating tax free'),
                        'body': _t('La factura se ha creado correctamente, pero ha habido un error inesperado creando tax free. Por favor, comuniquese con su central para la creación manual del tax free'),
                    });
                } else {
                    const byteCharacters = atob(order.get_taxfree_pdf());
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);

                    var blob = new Blob([byteArray], {type: 'application/pdf'});
                    var link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.target = "_blank"
                    link.download = order.get_taxfree_number()+".pdf";
                    link.click();
                }
            }
        }

    Registries.Component.extend(ReceiptScreen, PosPrintTaxfree);
    return PosPrintTaxfree;
});
